from __future__ import annotations

from collections import defaultdict
from typing import Sequence

from sqlalchemy import asc, desc, select
from sqlalchemy.orm import Session

from .models import Application, Resume
from .utils import calculate_matching_score, filter_by_timeframe


def upsert_applications(session: Session, applications: Sequence[dict], resume: Resume | None) -> list[Application]:
    stored: list[Application] = []
    resume_text = resume.text_content if resume else None
    for payload in applications:
        job_id = payload["job_id"]
        stmt = select(Application).where(Application.job_id == job_id)
        instance = session.scalar(stmt)
        if instance:
            for field, value in payload.items():
                if field in {"status", "matching_score"}:
                    continue
                setattr(instance, field, value)
        else:
            instance = Application(**payload)
            session.add(instance)
        instance.matching_score = calculate_matching_score(
            resume_text,
            instance.job_title,
            instance.description,
            instance.search_key,
        )
        stored.append(instance)
    session.commit()
    return stored


def list_applications(
    session: Session,
    *,
    status: str | None,
    source: str | None,
    timeframe: str | None,
    sort_direction: str | None,
) -> list[Application]:
    stmt = select(Application)
    if status and status != "all":
        stmt = stmt.where(Application.status == status)
    if source and source != "all":
        stmt = stmt.where(Application.source == source)
    stmt = filter_by_timeframe(stmt, timeframe, Application.posted_time)

    direction = desc if sort_direction == "desc" else asc
    stmt = stmt.order_by(direction(Application.posted_time))

    return list(session.scalars(stmt))


def mark_applied(session: Session, application_id: int) -> Application | None:
    instance = session.get(Application, application_id)
    if not instance:
        return None
    instance.status = "applied"
    session.commit()
    session.refresh(instance)
    return instance


def get_resume(session: Session) -> Resume | None:
    stmt = select(Resume).order_by(desc(Resume.uploaded_at)).limit(1)
    return session.scalar(stmt)


def store_resume(session: Session, filename: str, content: bytes, text_content: str) -> Resume:
    resume = Resume(filename=filename, content=content, text_content=text_content)
    session.add(resume)
    session.flush()

    applications = session.scalars(select(Application)).all()
    for application in applications:
        application.matching_score = calculate_matching_score(
            text_content,
            application.job_title,
            application.description,
            application.search_key,
        )
    session.commit()
    session.refresh(resume)
    return resume


def list_companies(session: Session) -> list[dict[str, str | None]]:
    stmt = select(Application.company, Application.apply_link)
    companies = defaultdict(str)
    for company, link in session.execute(stmt):
        if company not in companies:
            companies[company] = link
    return [{"company": name, "career_site": link} for name, link in sorted(companies.items())]
