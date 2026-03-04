using JobWatcher.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace JobWatcher.Api.Services.AI_Service;

public class AgentTools
{
    private readonly JobWatcherContext _db;
    private readonly IHttpContextAccessor _httpContext;
    public AgentTools(JobWatcherContext db, IHttpContextAccessor httpContext)
    {
        _db = db;
        _httpContext = httpContext;
    }

    /// <summary>
    /// Returns the most recent applications with key fields for summarization.
    /// </summary>
    public async Task<IReadOnlyList<object>> GetRecentApplicationsAsync(int count = 5)
    {
        return await _db.Applications
            .OrderByDescending(a => a.PostedTime)
            .Take(count)
            .Select(a => new
            {
                a.Id,
                a.JobTitle,
                a.Company,
                a.Status,
                a.MatchingScore,
                a.PostedTime,
                a.Source,
                a.ApplyLink
            })
            .Cast<object>()
            .ToListAsync()
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Returns applications filtered by status for higher-level analysis.
    /// </summary>
    public async Task<IReadOnlyList<object>> GetApplicationsByStatusAsync(string status)
    {
        var normalized = string.IsNullOrWhiteSpace(status) ? "not_applied" : status.Trim();

        return await _db.Applications
            .Where(a => a.Status == normalized)
            .OrderByDescending(a => a.PostedTime)
            .Take(50)
            .Select(a => new
            {
                a.Id,
                a.JobTitle,
                a.Company,
                a.Status,
                a.MatchingScore,
                a.PostedTime,
                a.Source,
            })
            .Cast<object>()
            .ToListAsync()
            .ConfigureAwait(false);
    }

    public async Task<string> GetResumeInfo()
    {
        var user = _httpContext.HttpContext?.User;
        var name = user?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown User";

        var resume = await _db.Resumes.FirstOrDefaultAsync().ConfigureAwait(false);
        if (resume == null)
            return "No resume information available.";
        return $"Resume for the user {name} fetched with content {resume.Content}";
    }

    public async Task<object> GetCurrentUserInfo()
    {
        var user = _httpContext.HttpContext?.User;

        return new
        {
            Id = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            Email = user?.FindFirst(ClaimTypes.Email)?.Value,
            Name = user?.FindFirst(ClaimTypes.Name)?.Value
        };
    }
}

