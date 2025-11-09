# Job Watcher Web

A lightweight web dashboard and REST API for aggregating job applications collected by the HiringCafe Job Watcher bot. The project exposes endpoints that the GitHub Action can call to persist new applications, calculates resume-to-job matching scores, and serves a simple front-end for reviewing and filtering records.

## Features

- **API ingestion** – `POST /api/applications` accepts the JSON payload produced by the HiringCafe job watcher and stores or updates records.
- **Resume matching** – Upload a resume once and reuse it to compute application tracking system (ATS)-style keyword overlap scores.
- **Filtering & sorting** – View applications in a table with filters for status, source, and posting date windows (24 hours, 3 days, 5 days) plus sort options.
- **Apply confirmation** – Opening the apply link prompts for confirmation and marks the application as "Applied" when confirmed.
- **Company directory** – Automatically aggregates a list of companies and their career site URLs from the stored applications.
- **SQL Server schema** – `sql/create_tables.sql` provides scripts to provision equivalent tables in Microsoft SQL Server.

## Project structure

```
backend/           FastAPI application and database models
frontend/          Static HTML dashboard that consumes the API
sql/               SQL Server schema scripts
```

## Running the API locally

1. **Create a virtual environment**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows use `.venv\\Scripts\\activate`
   ```
2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```
3. **(Optional) Configure a database URL**
   - By default the API uses SQLite (`sqlite:///./jobwatcher.db`).
   - To use SQL Server locally or in production, set the `DATABASE_URL` environment variable to a valid SQLAlchemy connection string, e.g. `mssql+pyodbc://user:password@server/database?driver=ODBC+Driver+18+for+SQL+Server`.
4. **Start the development server**
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`.

## Front-end usage

The static dashboard lives in `frontend/index.html`. Open the file in a browser (or serve it from any static host) and it will call the API endpoints described below. When running locally you can simply open the file directly while the API runs on `localhost:8000`.

## Key API endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/api/applications` | List applications with optional `status`, `source`, `timeframe`, and `sort` query parameters. |
| `POST` | `/api/applications` | Bulk create or update applications from the HiringCafe watcher payload. |
| `POST` | `/api/applications/{id}/apply` | Mark a single application as applied. |
| `GET`  | `/api/resume` | Retrieve metadata about the most recently uploaded resume. |
| `POST` | `/api/resume` | Upload a resume (UTF-8 text) and recompute matching scores. |
| `GET`  | `/api/companies` | List companies and their derived career site URLs. |
| `GET`  | `/health` | Basic health check endpoint. |

## SQL Server schema

Use `sql/create_tables.sql` to create the database, tables, and a convenience view in SQL Server. The FastAPI application uses SQLAlchemy models that map to the same structure and can connect to SQL Server by updating `DATABASE_URL`.

## Integrating with the HiringCafe job watcher

Configure the GitHub Actions workflow to send the fetched job JSON to the API:

```yaml
- name: Push applications to Job Watcher Web
  run: |
    curl -X POST "${{ secrets.JOB_WATCHER_API_URL }}/api/applications" \
      -H "Content-Type: application/json" \
      -d "${RESPONSE_JSON}"
```

Make sure the payload matches the `ApplicationCreate` schema defined in `backend/app/schemas.py`.

## Resume matching notes

- The demo implementation expects UTF-8 text resumes. In production you can extend `upload_resume` to process PDF or DOCX files into raw text before storing.
- Matching scores are computed by simple keyword overlap for clarity; you can replace `calculate_matching_score` in `backend/app/utils.py` with a more advanced algorithm as needed.

## Development tips

- For database inspection, open the generated `jobwatcher.db` (SQLite) using `sqlite3` or your preferred SQL client.
- When switching to SQL Server, install the appropriate driver (`pyodbc`) and update `backend/requirements.txt` accordingly.
