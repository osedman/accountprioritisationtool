# Prioritisation Tool API

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Place `processed_account_data.csv` in the project root (same folder as this `README.md`).
Alternatively, place it at `frontend/processed_account_data.csv`.

## Run

```bash
uvicorn backend.main:app --reload
```

## Frontend (dev server)

The frontend lives in `frontend/`.

```bash
cd frontend
npm install
npm run dev
```

## Endpoint

- `GET /accounts/at-risk`
  - Query params:
    - `limit` (default `10`)
    - `sort_by` (optional): explicit column name to sort descending. If omitted, the API infers a risk-like column (e.g. `risk_score`, `churn_risk`, etc.).

Example:

```bash
curl "http://127.0.0.1:8000/accounts/at-risk?limit=10"
```

- `GET /api/overview`
  - Returns: `total_arr`, `high_risk_count`, `growth_count`, `upcoming_renewals`

- `GET /api/prioritised-accounts`
  - Returns: `top_risk` (10), `top_growth` (10), plus combined `accounts` list

