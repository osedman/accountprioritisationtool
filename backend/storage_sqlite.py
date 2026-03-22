from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS account_notes (
                account_key TEXT PRIMARY KEY,
                note TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS priority_overrides (
                account_key TEXT PRIMARY KEY,
                priority INTEGER NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS saved_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_key TEXT NOT NULL,
                analysis_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


@contextmanager
def connect(db_path: Path) -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(db_path)
    try:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON;")
        yield conn
        conn.commit()
    finally:
        conn.close()


def upsert_note(db_path: Path, account_key: str, note: str) -> Dict[str, str]:
    updated_at = _utc_now_iso()
    with connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO account_notes (account_key, note, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(account_key) DO UPDATE SET
                note=excluded.note,
                updated_at=excluded.updated_at
            """,
            (account_key, note, updated_at),
        )
    return {"account_key": account_key, "note": note, "updated_at": updated_at}


def get_note(db_path: Path, account_key: str) -> Optional[Dict[str, str]]:
    with connect(db_path) as conn:
        row = conn.execute(
            "SELECT account_key, note, updated_at FROM account_notes WHERE account_key = ?",
            (account_key,),
        ).fetchone()
        if not row:
            return None
        return {"account_key": row["account_key"], "note": row["note"], "updated_at": row["updated_at"]}


def upsert_priority(db_path: Path, account_key: str, priority: int) -> Dict[str, object]:
    updated_at = _utc_now_iso()
    with connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO priority_overrides (account_key, priority, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(account_key) DO UPDATE SET
                priority=excluded.priority,
                updated_at=excluded.updated_at
            """,
            (account_key, int(priority), updated_at),
        )
    return {"account_key": account_key, "priority": int(priority), "updated_at": updated_at}


def get_priority(db_path: Path, account_key: str) -> Optional[Dict[str, object]]:
    with connect(db_path) as conn:
        row = conn.execute(
            "SELECT account_key, priority, updated_at FROM priority_overrides WHERE account_key = ?",
            (account_key,),
        ).fetchone()
        if not row:
            return None
        return {
            "account_key": row["account_key"],
            "priority": int(row["priority"]),
            "updated_at": row["updated_at"],
        }


def get_notes_for_keys(db_path: Path, account_keys: List[str]) -> Dict[str, Dict[str, str]]:
    if not account_keys:
        return {}
    placeholders = ",".join("?" for _ in account_keys)
    with connect(db_path) as conn:
        rows = conn.execute(
            f"SELECT account_key, note, updated_at FROM account_notes WHERE account_key IN ({placeholders})",
            tuple(account_keys),
        ).fetchall()
    return {r["account_key"]: {"note": r["note"], "updated_at": r["updated_at"]} for r in rows}


def get_priorities_for_keys(db_path: Path, account_keys: List[str]) -> Dict[str, Dict[str, object]]:
    if not account_keys:
        return {}
    placeholders = ",".join("?" for _ in account_keys)
    with connect(db_path) as conn:
        rows = conn.execute(
            f"SELECT account_key, priority, updated_at FROM priority_overrides WHERE account_key IN ({placeholders})",
            tuple(account_keys),
        ).fetchall()
    return {
        r["account_key"]: {"priority": int(r["priority"]), "updated_at": r["updated_at"]} for r in rows
    }


def create_saved_analysis(db_path: Path, account_key: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
    created_at = _utc_now_iso()
    analysis_json = json.dumps(analysis, ensure_ascii=False, separators=(",", ":"))
    with connect(db_path) as conn:
        cur = conn.execute(
            """
            INSERT INTO saved_analyses (account_key, analysis_json, created_at)
            VALUES (?, ?, ?)
            """,
            (account_key, analysis_json, created_at),
        )
        analysis_id = int(cur.lastrowid)
    return {"id": analysis_id, "account_key": account_key, "analysis": analysis, "created_at": created_at}


def get_saved_analysis(db_path: Path, analysis_id: int) -> Optional[Dict[str, Any]]:
    with connect(db_path) as conn:
        row = conn.execute(
            "SELECT id, account_key, analysis_json, created_at FROM saved_analyses WHERE id = ?",
            (int(analysis_id),),
        ).fetchone()
        if not row:
            return None
        try:
            analysis = json.loads(row["analysis_json"])
        except Exception:
            analysis = {"raw": row["analysis_json"]}
        return {
            "id": int(row["id"]),
            "account_key": row["account_key"],
            "analysis": analysis,
            "created_at": row["created_at"],
        }


def list_saved_analyses(
    db_path: Path, *, account_key: Optional[str] = None, limit: int = 50, offset: int = 0
) -> Dict[str, Any]:
    limit_i = max(1, min(int(limit), 500))
    offset_i = max(0, int(offset))

    where = ""
    params: List[Any] = []
    if account_key:
        where = "WHERE account_key = ?"
        params.append(account_key)

    with connect(db_path) as conn:
        total_row = conn.execute(
            f"SELECT COUNT(1) AS c FROM saved_analyses {where}",
            tuple(params),
        ).fetchone()
        total = int(total_row["c"]) if total_row else 0

        rows = conn.execute(
            f"""
            SELECT id, account_key, created_at
            FROM saved_analyses
            {where}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            tuple(params + [limit_i, offset_i]),
        ).fetchall()

    items = [{"id": int(r["id"]), "account_key": r["account_key"], "created_at": r["created_at"]} for r in rows]
    return {"items": items, "total": total, "limit": limit_i, "offset": offset_i}
