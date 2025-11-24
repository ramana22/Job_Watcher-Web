-- ========================================
-- JOBWATCHER DATABASE PATCH (Bulk Actions)
-- Adds columns needed for soft delete and mark-as-applied flows
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

-- Add status column for tracking applied state when missing
IF COL_LENGTH('applications', 'status') IS NULL
BEGIN
    ALTER TABLE applications
    ADD status NVARCHAR(50) NOT NULL CONSTRAINT DF_applications_status DEFAULT 'not_applied' WITH VALUES;
END
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

-- Helpful indexes for bulk actions and filters
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_applications_status' AND object_id = OBJECT_ID('applications')
)
BEGIN
    CREATE INDEX IX_applications_status ON applications(status);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_applications_is_deleted' AND object_id = OBJECT_ID('applications')
)
BEGIN
    CREATE INDEX IX_applications_is_deleted ON applications(is_deleted);
END
GO

PRINT '✅ JobWatcher database updated for bulk delete and mark-as-applied support.';
GO
