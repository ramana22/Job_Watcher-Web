# Job Watcher Web

A lightweight web dashboard and ASP.NET Core REST API for aggregating job applications collected by the HiringCafe Job Watcher bot. The service exposes endpoints that the GitHub Action can call to persist new applications, calculates resume-to-job matching scores, and serves a simple front-end for reviewing and filtering records.

## Features

- **API ingestion** – `POST /api/applications` accepts the JSON payload produced by the HiringCafe job watcher and stores or updates records by `job_id`.
- **Resume matching** – Upload a resume once and reuse it to compute application tracking system (ATS)-style keyword overlap scores.
- **Filtering & sorting** – View applications in a table with filters for status, source, and posting date windows (24 hours, 3 days, 5 days) plus sort options.
- **Apply confirmation** – Opening the apply link prompts for confirmation and marks the application as "Applied" when confirmed.
- **Company directory** – Automatically aggregates a list of companies and their career site URLs from the stored applications.
- **SQL Server schema** – `sql/create_tables.sql` provides scripts to provision equivalent tables in Microsoft SQL Server.

## Project structure

```
backend/           ASP.NET Core Web API project
frontend/          React + Vite single-page application that consumes the API
sql/               SQL Server schema scripts
```

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- Node.js 18+ and npm for running the React dashboard locally
- SQL Server instance (LocalDB, container, or hosted) if you plan to persist data outside of development.

## Running the API locally

1. **Configure the connection string**
   - Update `backend/JobWatcher.Api/appsettings.json` with the correct SQL Server connection string. The default assumes a local SQL Server instance with the `sa` user.
   - For quick smoke tests you can replace the provider in `Program.cs` with `UseInMemoryDatabase`, but the project ships configured for SQL Server.

2. **Restore packages and build**
   ```bash
   cd backend
   dotnet restore
   dotnet build
   ```

3. **Apply the SQL schema**
   - Run the statements in `sql/create_tables.sql` against your SQL Server database to create the `applications` and `resumes` tables.

4. **Run the API**
   ```bash
   dotnet run --project JobWatcher.Api
   ```

The API listens on `https://localhost:5001` and `http://localhost:5000` by default. Update `frontend/src/services/api.js` if you expose the API on a different host or port.

## Front-end usage

1. Install dependencies once:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite dev server (defaults to http://localhost:5173):
   ```bash
   npm run dev
   ```
3. With the ASP.NET Core API running on http://localhost:5000, browse to the served dashboard.

To produce a production bundle, run `npm run build` and deploy the generated assets from `frontend/dist/` to your preferred static host.

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

## Integrating with the HiringCafe job watcher

Configure the GitHub Actions workflow to send the fetched job JSON to the API:

```yaml
- name: Push applications to Job Watcher Web
  run: |
    curl -X POST "${{ secrets.JOB_WATCHER_API_URL }}/api/applications" \
      -H "Content-Type: application/json" \
      -d "${RESPONSE_JSON}"
```

Ensure the payload matches the schema consumed by `ApplicationCreateRequest` in `backend/JobWatcher.Api/DTOs/ApplicationDtos.cs`.

## Resume matching notes

- The demo implementation expects UTF-8 text resumes. In production you can extend `ResumeController.UploadResume` to process PDF or DOCX files into raw text before storing.
- Matching scores are computed by simple keyword overlap for clarity; you can replace `MatchingService` with a more advanced algorithm as needed.

## Development tips

- Because this repository does not include compiled artifacts, run `dotnet clean` if you switch between environments to ensure a fresh build.
- If you need entity migrations, scaffold them with `dotnet ef migrations add <Name>` once you install the `dotnet-ef` tool and reference the SQL Server provider.
