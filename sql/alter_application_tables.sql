Alter table [dbo].[applications]
Add summary nvarchar(max) null,
applicationObject nvarchar(max) null

GO


UPDATE dbo.applications
SET summary = description,
    description = NULL
WHERE description IS NOT NULL;