-- ========================================
-- JOBWATCHER DATABASE PATCH (Soft Delete & Dedup)
-- Applies schema updates to an existing JobWatcher database
-- without recreating or dropping existing data.
-- ========================================

IF DB_ID('JobWatcher') IS NULL
BEGIN
    RAISERROR('Database JobWatcher does not exist. Create it before running this script.', 16, 1);
    RETURN;
END
GO

USE JobWatcher;
GO

-- Add soft-delete columns when missing
IF COL_LENGTH('applications', 'is_deleted') IS NULL
BEGIN
    ALTER TABLE applications
    ADD is_deleted BIT NOT NULL CONSTRAINT DF_applications_is_deleted DEFAULT 0 WITH VALUES;
END
GO

IF COL_LENGTH('applications', 'deleted_at') IS NULL
BEGIN
    ALTER TABLE applications
    ADD deleted_at DATETIME2 NULL;
END
GO

-- Add computed hash for deduplication when missing
IF COL_LENGTH('applications', 'job_hash') IS NULL
BEGIN
    ALTER TABLE applications
    ADD job_hash AS CAST(HASHBYTES('SHA2_256', job_id + source) AS VARBINARY(32)) PERSISTED;
END
GO

-- Drop any existing unique index conflicting with the new filtered unique index
IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_applications_job_source_hash'
      AND object_id = OBJECT_ID('applications')
)
BEGIN
    DROP INDEX IX_applications_job_source_hash ON applications;
END
GO

-- Create filtered unique index to enforce uniqueness on active (non-deleted) rows
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_applications_job_source_hash'
      AND object_id = OBJECT_ID('applications')
)
BEGIN
    CREATE UNIQUE INDEX IX_applications_job_source_hash
        ON applications(job_hash)
        WHERE is_deleted = 0;
END
GO

-- Ensure supporting indexes exist
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_applications_source' AND object_id = OBJECT_ID('applications')
)
BEGIN
    CREATE INDEX IX_applications_source ON applications(source);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_applications_status' AND object_id = OBJECT_ID('applications')
)
BEGIN
    CREATE INDEX IX_applications_status ON applications(status);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_applications_posted_time' AND object_id = OBJECT_ID('applications')
)
BEGIN
    CREATE INDEX IX_applications_posted_time ON applications(posted_time);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_applications_is_deleted' AND object_id = OBJECT_ID('applications')
)
BEGIN
    CREATE INDEX IX_applications_is_deleted ON applications(is_deleted);
END
GO

-- Update CompanyDirectory view to ignore deleted applications
CREATE OR ALTER VIEW CompanyDirectory AS
SELECT
    company AS CompanyName,
    MIN(apply_link) AS CareerSite
FROM applications
WHERE is_deleted = 0
GROUP BY company;
GO

PRINT '✅ JobWatcher database updated for soft-delete support without data loss.';
GO
