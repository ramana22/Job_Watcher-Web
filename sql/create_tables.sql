CREATE DATABASE JobWatcher;
GO

USE JobWatcher;
GO

IF OBJECT_ID('applications', 'U') IS NOT NULL
BEGIN
    DROP TABLE applications;
END;

IF OBJECT_ID('resumes', 'U') IS NOT NULL
BEGIN
    DROP TABLE resumes;
END;

CREATE TABLE applications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    job_id NVARCHAR(100) NOT NULL UNIQUE,
    job_title NVARCHAR(255) NOT NULL,
    company NVARCHAR(255) NOT NULL,
    location NVARCHAR(255) NULL,
    salary NVARCHAR(255) NULL,
    description NVARCHAR(MAX) NULL,
    apply_link NVARCHAR(500) NULL,
    search_key NVARCHAR(255) NULL,
    posted_time DATETIME2 NOT NULL,
    source NVARCHAR(100) NOT NULL,
    matching_score FLOAT NOT NULL DEFAULT 0,
    status NVARCHAR(50) NOT NULL DEFAULT 'not_applied',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE INDEX IX_applications_job_id ON applications(job_id);
CREATE INDEX IX_applications_source ON applications(source);
CREATE INDEX IX_applications_status ON applications(status);
CREATE INDEX IX_applications_posted_time ON applications(posted_time);

CREATE TABLE resumes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    filename NVARCHAR(255) NOT NULL,
    content VARBINARY(MAX) NOT NULL,
    text_content NVARCHAR(MAX) NOT NULL,
    uploaded_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('CompanyDirectory', 'V') IS NOT NULL
BEGIN
    DROP VIEW CompanyDirectory;
END;

CREATE VIEW CompanyDirectory AS
SELECT
    company AS CompanyName,
    MIN(apply_link) AS CareerSite
FROM applications
GROUP BY company;
GO
