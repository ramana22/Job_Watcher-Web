from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, models, schemas
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Job Watcher Web API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


@app.get("/api/applications", response_model=list[schemas.Application])
def read_applications(
    db: DbSession,
    status: str | None = None,
    source: str | None = None,
    timeframe: str | None = None,
    sort: str | None = None,
):
    sort = sort or "recent"
    sort_direction = "desc" if sort in {"recent", "desc"} else "asc"
    applications = crud.list_applications(
        db,
        status=status or "not_applied",
        source=source,
        timeframe=timeframe,
        sort_direction=sort_direction,
    )
    return applications


@app.post("/api/applications", response_model=list[schemas.Application])
def create_applications(payload: list[schemas.ApplicationCreate], db: DbSession):
    resume = crud.get_resume(db)
    formatted = []
    for item in payload:
        formatted.append(
            {
                "job_id": item.job_id,
                "job_title": item.job_title,
                "company": item.company,
                "location": item.location,
                "salary": item.salary,
                "description": item.description,
                "apply_link": item.apply_link,
                "search_key": item.search_key,
                "posted_time": item.posted_time,
                "source": item.source,
                "matching_score": item.matching_score or 0.0,
                "status": "not_applied",
            }
        )
    applications = crud.upsert_applications(db, formatted, resume)
    return applications


@app.post("/api/applications/{application_id}/apply", response_model=schemas.Application)
def apply_for_job(application_id: int, db: DbSession):
    application = crud.mark_applied(db, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@app.post("/api/resume", response_model=schemas.ResumeUploadResponse)
def upload_resume(file: UploadFile, db: DbSession):
    content = file.file.read()
    try:
        text_content = content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="Resume must be a UTF-8 text file") from exc

    resume = crud.store_resume(db, file.filename, content, text_content)
    return schemas.ResumeUploadResponse(id=resume.id, filename=resume.filename, uploaded_at=resume.uploaded_at)


@app.get("/api/resume", response_model=schemas.ResumeInfo | None)
def get_resume(db: DbSession):
    resume = crud.get_resume(db)
    if not resume:
        return None
    return schemas.ResumeInfo(id=resume.id, filename=resume.filename, uploaded_at=resume.uploaded_at)


@app.get("/api/companies", response_model=list[schemas.CompanyEntry])
def get_companies(db: DbSession):
    companies = crud.list_companies(db)
    return [schemas.CompanyEntry(**company) for company in companies]


@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow()}
