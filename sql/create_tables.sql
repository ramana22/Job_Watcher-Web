-- ========================================
-- JOBWATCHER DATABASE SCHEMA (v2 - Optimized)
-- ========================================

-- Create database
IF DB_ID('JobWatcher') IS NULL
    CREATE DATABASE JobWatcher;
GO

USE JobWatcher;
GO

-- Drop existing objects safely
IF OBJECT_ID('CompanyDirectory', 'V') IS NOT NULL
    DROP VIEW CompanyDirectory;
GO

IF OBJECT_ID('applications', 'U') IS NOT NULL
    DROP TABLE applications;
GO

IF OBJECT_ID('resumes', 'U') IS NOT NULL
    DROP TABLE resumes;
GO

-- ========================================
-- APPLICATIONS TABLE
-- ========================================
CREATE TABLE applications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    job_id NVARCHAR(1024) NOT NULL,
    job_title NVARCHAR(1024) NOT NULL,
    company NVARCHAR(255) NOT NULL,
    location NVARCHAR(255) NULL,
    salary NVARCHAR(255) NULL,
    description NVARCHAR(MAX) NULL,
    apply_link NVARCHAR(1000) NULL,
    search_key NVARCHAR(255) NULL,
    posted_time DATETIME2 NOT NULL,
    source NVARCHAR(100) NOT NULL,
    matching_score FLOAT NOT NULL DEFAULT 0,
    status NVARCHAR(50) NOT NULL DEFAULT 'not_applied',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

    -- ✅ Safe computed column for unique job+source hash
    job_hash AS CAST(HASHBYTES('SHA2_256', job_id + source) AS VARBINARY(32)) PERSISTED
);
GO

-- ========================================
-- INDEXES
-- ========================================
-- Unique constraint on job_id + source using hash (safe for long IDs)
CREATE UNIQUE INDEX IX_applications_job_source_hash
    ON applications(job_hash);
GO

-- Supporting indexes for query filters
CREATE INDEX IX_applications_source ON applications(source);
CREATE INDEX IX_applications_status ON applications(status);
CREATE INDEX IX_applications_posted_time ON applications(posted_time);
GO

-- ========================================
-- RESUMES TABLE
-- ========================================
CREATE TABLE resumes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    filename NVARCHAR(255) NOT NULL,
    content VARBINARY(MAX) NOT NULL,
    text_content NVARCHAR(MAX) NOT NULL,
    uploaded_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL,
    normalized_username NVARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(512) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE UNIQUE INDEX IX_users_normalized_username ON users(normalized_username);

-- ========================================
-- COMPANY DIRECTORY VIEW
-- ========================================
CREATE VIEW CompanyDirectory AS
SELECT
    company AS CompanyName,
    MIN(apply_link) AS CareerSite
FROM applications
GROUP BY company;
GO

-- ========================================
-- DONE
-- ========================================
PRINT '✅ JobWatcher database created successfully with optimized schema.';
GO



CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(100) NOT NULL,
    normalized_username NVARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(512) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE UNIQUE INDEX IX_users_normalized_username ON users(normalized_username);