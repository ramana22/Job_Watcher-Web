using JobWatcher.Api.DTOs;
using JobWatcher.Api.Models;

namespace JobWatcher.Api.Extensions;

public static class ApplicationMappingExtensions
{
    public static ApplicationResponse ToResponse(this Application application) =>
        new(
            application.Id,
            application.JobId,
            application.JobTitle,
            application.Company,
            application.Location,
            application.Salary,
            application.Description,
            application.ApplyLink,
            application.SearchKey,
            application.PostedTime,
            application.Source,
            Math.Round(application.MatchingScore, 2),
            application.Status,
            application.CreatedAt,
            application.IsDeleted,
            application.DeletedAt
        );
}
