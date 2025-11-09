from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ApplicationBase(BaseModel):
    job_id: str = Field(..., description="Unique identifier from the job source")
    job_title: str
    company: str
    location: Optional[str] = None
    salary: Optional[str] = None
    description: Optional[str] = None
    apply_link: Optional[str] = None
    search_key: Optional[str] = None
    posted_time: datetime
    source: str


class ApplicationCreate(ApplicationBase):
    matching_score: Optional[float] = None


class Application(ApplicationBase):
    id: int
    matching_score: float
    status: str
    created_at: datetime

    class Config:
        orm_mode = True


class ApplicationList(BaseModel):
    items: list[Application]


class ResumeUploadResponse(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime


class ResumeInfo(ResumeUploadResponse):
    pass


class CompanyEntry(BaseModel):
    company: str
    career_site: Optional[str] = None
