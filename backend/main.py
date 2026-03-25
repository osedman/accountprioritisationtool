from __future__ import annotations

import csv
import re
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import pandas as pd

from .storage_sqlite import (
    create_saved_analysis,
    get_notes_for_keys,
    get_priorities_for_keys,
    get_note,
    get_priority,
    get_saved_analysis,
    init_db,
    list_saved_analyses,
    upsert_note,
    upsert_priority,
)

app = FastAPI(title="Prioritisation Tool API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CSV_PATH_CANDIDATES = (
    PROJECT_ROOT / "processed_account_data.csv",
    PROJECT_ROOT / "frontend" / "processed_account_data.csv",
    PROJECT_ROOT / "Frontend" / "processed_account_data.csv",
)

DB_PATH = PROJECT_ROOT / "backend" / "data" / "prioritisation.sqlite3"

RISK_COLUMN_CANDIDATES = (
    "risk_score",
    "at_risk_score",
    "churn_risk",
    "churn_risk_score",
    "risk_probability",
    "churn_probability",
)


def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _infer_risk_column(fieldnames: List[str]) -> str:
    lowered = {c.lower(): c for c in fieldnames}
    for candidate in RISK_COLUMN_CANDIDATES:
        if candidate.lower() in lowered:
            return lowered[candidate.lower()]
    raise HTTPException(
        status_code=422,
        detail={
            "error": "No risk column found in CSV header.",
            "expected_one_of": list(RISK_COLUMN_CANDIDATES),
            "found_columns": fieldnames,
        },
    )


_DF_CACHE: Optional[pd.DataFrame] = None
_DF_CACHE_MTIME_NS: Optional[int] = None
_DF_CACHE_PATH: Optional[Path] = None


@app.on_event("startup")
def _startup() -> None:
    init_db(DB_PATH)


def _resolve_csv_path() -> Path:
    for p in CSV_PATH_CANDIDATES:
        if p.exists():
            return p
    raise HTTPException(
        status_code=404,
        detail={
            "error": "CSV not found.",
            "expected_paths": [str(p) for p in CSV_PATH_CANDIDATES],
            "hint": "Place processed_account_data.csv in the project root or Frontend/.",
        },
    )


def _load_accounts_df() -> Tuple[pd.DataFrame, str]:
    """
    Loads the accounts CSV into a DataFrame and coerces key numeric columns.
    Cached by file mtime for performance during dev reloads.
    """
    global _DF_CACHE, _DF_CACHE_MTIME_NS, _DF_CACHE_PATH

    csv_path = _resolve_csv_path()
    mtime_ns = csv_path.stat().st_mtime_ns

    if _DF_CACHE is not None and _DF_CACHE_MTIME_NS == mtime_ns and _DF_CACHE_PATH == csv_path:
        return _DF_CACHE, str(csv_path)

    df = pd.read_csv(csv_path)
    for col in ("arr_gbp", "risk_score", "growth_score", "days_to_renewal"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    _DF_CACHE = df
    _DF_CACHE_MTIME_NS = mtime_ns
    _DF_CACHE_PATH = csv_path
    return df, str(csv_path)


def _require_columns(df: pd.DataFrame, cols: List[str]) -> None:
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=422,
            detail={"error": "Missing required columns in CSV.", "missing": missing, "found": list(df.columns)},
        )


@app.get("/api/overview")
def api_overview() -> Dict[str, Any]:
    df, csv_path = _load_accounts_df()
    _require_columns(df, ["arr_gbp", "risk_score", "growth_score", "days_to_renewal"])

    return {
        "csv_path": csv_path,
        "total_arr": float(df["arr_gbp"].sum(skipna=True)),
        "high_risk_count": int((df["risk_score"] > 70).sum(skipna=True)),
        "growth_count": int((df["growth_score"] > 70).sum(skipna=True)),
        "upcoming_renewals": int((df["days_to_renewal"] < 90).sum(skipna=True)),
    }


def _top_n_unique_accounts(
    df: pd.DataFrame,
    sort_col: str,
    n: int,
    seen_ids: set,
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    sorted_df = df.sort_values(by=sort_col, ascending=False, kind="mergesort")

    for _, row in sorted_df.iterrows():
        account_id = row.get("account_id")
        dedupe_key = account_id if pd.notna(account_id) else row.get("account_name")
        if dedupe_key in seen_ids:
            continue
        seen_ids.add(dedupe_key)
        out.append(
            {
                "account_name": row.get("account_name"),
                "arr_gbp": None if pd.isna(row.get("arr_gbp")) else float(row.get("arr_gbp")),
                "risk_score": None if pd.isna(row.get("risk_score")) else float(row.get("risk_score")),
                "growth_score": None if pd.isna(row.get("growth_score")) else float(row.get("growth_score")),
                "recent_support_summary": row.get("recent_support_summary"),
                "days_to_renewal": None
                if pd.isna(row.get("days_to_renewal"))
                else int(row.get("days_to_renewal")),
            }
        )
        if len(out) >= n:
            break
    return out


@app.get("/api/prioritised-accounts")
def api_prioritised_accounts() -> Dict[str, Any]:
    df, csv_path = _load_accounts_df()
    _require_columns(
        df,
        [
            "account_name",
            "arr_gbp",
            "risk_score",
            "growth_score",
            "recent_support_summary",
            "days_to_renewal",
        ],
    )

    # Prefer returning 20 unique accounts total (avoid duplicates across risk & growth).
    seen: set = set()
    top_risk = _top_n_unique_accounts(df, "risk_score", 10, seen)
    top_growth = _top_n_unique_accounts(df, "growth_score", 10, seen)

    # Enrich response with persisted notes/priority overrides (keyed by account_name).
    account_keys: List[str] = []
    for a in top_risk + top_growth:
        k = a.get("account_name")
        if isinstance(k, str) and k:
            account_keys.append(k)
    notes = get_notes_for_keys(DB_PATH, account_keys)
    priorities = get_priorities_for_keys(DB_PATH, account_keys)
    for a in top_risk + top_growth:
        k = a.get("account_name")
        if isinstance(k, str) and k:
            a["note"] = notes.get(k, {}).get("note")
            a["priority_override"] = priorities.get(k, {}).get("priority")

    return {
        "csv_path": csv_path,
        "top_risk": top_risk,
        "top_growth": top_growth,
        "accounts": top_risk + top_growth,
        "count": len(top_risk) + len(top_growth),
    }


@app.get("/accounts/at-risk")
def top_at_risk_accounts(
    limit: int = Query(10, ge=1, le=1000),
    sort_by: Optional[str] = Query(
        None,
        description="Optional explicit column name to sort by (descending). If omitted, a risk-like column is inferred.",
    ),
) -> Dict[str, Any]:
    """
    Reads `processed_account_data.csv` and returns the top `limit` at-risk accounts as JSON.

    Sorting is descending (highest risk first).
    """
    csv_path = _resolve_csv_path()

    with csv_path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise HTTPException(status_code=422, detail="CSV header is missing.")

        fieldnames = list(reader.fieldnames)
        if sort_by:
            if sort_by not in fieldnames:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "error": "sort_by column not found in CSV header.",
                        "sort_by": sort_by,
                        "found_columns": fieldnames,
                    },
                )
            risk_col = sort_by
        else:
            risk_col = _infer_risk_column(fieldnames)

        rows: List[Dict[str, Any]] = []
        for row in reader:
            risk_value = _to_float(row.get(risk_col))
            if risk_value is None:
                continue
            row["_risk"] = risk_value
            rows.append(row)

    rows.sort(key=lambda r: r["_risk"], reverse=True)
    top = rows[:limit]

    for r in top:
        r.pop("_risk", None)

    return {
        "count": len(top),
        "csv_path": str(csv_path),
        "risk_column": risk_col,
        "accounts": top,
    }


class AccountNoteIn(BaseModel):
    account_key: str = Field(..., min_length=1, description="Stable key, e.g. account_name or account_id.")
    note: str = Field(..., min_length=1)


class PriorityOverrideIn(BaseModel):
    account_key: str = Field(..., min_length=1, description="Stable key, e.g. account_name or account_id.")
    priority: int = Field(..., ge=0, le=1000)


@app.post("/api/account-notes")
def write_account_note(payload: AccountNoteIn) -> Dict[str, Any]:
    return upsert_note(DB_PATH, payload.account_key, payload.note)


@app.get("/api/account-notes")
def read_account_note(account_key: str = Query(..., min_length=1)) -> Dict[str, Any]:
    row = get_note(DB_PATH, account_key)
    if not row:
        raise HTTPException(status_code=404, detail={"error": "Note not found", "account_key": account_key})
    return row


@app.post("/api/priority-overrides")
def write_priority_override(payload: PriorityOverrideIn) -> Dict[str, Any]:
    return upsert_priority(DB_PATH, payload.account_key, payload.priority)


@app.get("/api/priority-overrides")
def read_priority_override(account_key: str = Query(..., min_length=1)) -> Dict[str, Any]:
    row = get_priority(DB_PATH, account_key)
    if not row:
        raise HTTPException(
            status_code=404, detail={"error": "Priority override not found", "account_key": account_key}
        )
    return row


class SavedAnalysisIn(BaseModel):
    account_key: str = Field(..., min_length=1, description="Stable key, e.g. account_name or account_id.")
    analysis: Dict[str, Any] = Field(..., description="AI analysis payload (JSON object).")


@app.post("/api/analyses")
def save_analysis(payload: SavedAnalysisIn) -> Dict[str, Any]:
    return create_saved_analysis(DB_PATH, payload.account_key, payload.analysis)


@app.get("/api/analyses")
def list_analyses(
    account_key: Optional[str] = Query(None, min_length=1),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> Dict[str, Any]:
    return list_saved_analyses(DB_PATH, account_key=account_key, limit=limit, offset=offset)


@app.get("/api/analyses/{analysis_id}")
def read_analysis(analysis_id: int) -> Dict[str, Any]:
    row = get_saved_analysis(DB_PATH, analysis_id)
    if not row:
        raise HTTPException(status_code=404, detail={"error": "Analysis not found", "analysis_id": analysis_id})
    return row


def _safe_filename(s: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", s).strip("-")
    return cleaned or "analysis"


def _analysis_pdf_bytes(*, title: str, account_key: str, analysis: Dict[str, Any]) -> bytes:
    try:
        from fpdf import FPDF  # type: ignore
    except Exception as e:  # pragma: no cover
        raise HTTPException(
            status_code=500,
            detail={
                "error": "PDF dependency missing. Install backend requirements.",
                "hint": "pip install fpdf2",
                "details": str(e),
            },
        )

    def add_section(pdf: Any, heading: str, lines: List[str]) -> None:
        pdf.set_font("Helvetica", "B", 12)
        pdf.multi_cell(0, 6, heading)
        pdf.ln(1)
        pdf.set_font("Helvetica", "", 11)
        for line in lines:
            pdf.multi_cell(0, 6, line)
        pdf.ln(2)

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.multi_cell(0, 8, title)
    pdf.ln(1)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(0, 6, f"Account key: {account_key}")
    pdf.ln(3)

    summary = analysis.get("summary")
    if isinstance(summary, str) and summary.strip():
        add_section(pdf, "Summary", [summary.strip()])

    key_factors = analysis.get("keyFactors")
    if isinstance(key_factors, list):
        lines = [f"- {str(x)}" for x in key_factors if str(x).strip()]
        if lines:
            add_section(pdf, "Key factors", lines)

    risks = analysis.get("risks")
    if isinstance(risks, list):
        lines = [f"- {str(x)}" for x in risks if str(x).strip()]
        if lines:
            add_section(pdf, "Risks", lines)

    opportunities = analysis.get("opportunities")
    if isinstance(opportunities, list):
        lines = [f"- {str(x)}" for x in opportunities if str(x).strip()]
        if lines:
            add_section(pdf, "Opportunities", lines)

    actions = analysis.get("recommendedActions")
    if isinstance(actions, list):
        lines = [f"{i+1}. {str(x)}" for i, x in enumerate(actions) if str(x).strip()]
        if lines:
            add_section(pdf, "Recommended actions", lines)

    # If the expected shape isn't present, still include raw JSON.
    if pdf.page_no() == 1 and (summary is None and key_factors is None and risks is None and opportunities is None and actions is None):
        add_section(pdf, "Analysis (raw)", [str(analysis)])

    out = pdf.output(dest="S")
    return out if isinstance(out, (bytes, bytearray)) else out.encode("latin-1", errors="ignore")


@app.get("/api/analyses/{analysis_id}/pdf")
def download_analysis_pdf(analysis_id: int) -> StreamingResponse:
    row = get_saved_analysis(DB_PATH, analysis_id)
    if not row:
        raise HTTPException(status_code=404, detail={"error": "Analysis not found", "analysis_id": analysis_id})

    account_key = str(row.get("account_key") or "account")
    analysis = row.get("analysis") if isinstance(row.get("analysis"), dict) else {"raw": row.get("analysis")}
    title = "AI Analysis"

    pdf_bytes = _analysis_pdf_bytes(title=title, account_key=account_key, analysis=analysis)  # type: ignore[arg-type]
    filename = f"{_safe_filename(account_key)}-analysis-{analysis_id}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

