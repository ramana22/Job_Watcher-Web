using JobWatcher.Api.Data;
using JobWatcher.Api.DTOs;
using JobWatcher.Api.Extensions;
using JobWatcher.Api.Models;
using JobWatcher.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobWatcher.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ApplicationsController : ControllerBase
{
    private readonly JobWatcherContext _context;
    private readonly MatchingService _matchingService;
    public ApplicationsController(JobWatcherContext context, MatchingService matchingService)
    {
        _context = context;
        _matchingService = matchingService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ApplicationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ApplicationResponse>>> GetApplications(
        [FromQuery(Name = "status")] string? status,
        [FromQuery(Name = "source")] string? source,
        [FromQuery(Name = "timeframe")] string? timeframe,
        [FromQuery(Name = "sort")] string? sort,
        [FromQuery(Name = "keyword")] string? keyword)
    {
        var query = _context.Applications.AsQueryable();

        var normalizedStatus = string.IsNullOrWhiteSpace(status) ? "not_applied" : status.Trim();
        if (!string.Equals(normalizedStatus, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(app => app.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(source) && !string.Equals(source, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(app => app.Source == source);
        }

        if (!string.IsNullOrWhiteSpace(keyword) && !string.Equals(keyword, "all", StringComparison.OrdinalIgnoreCase))
        {
            var trimmedKeyword = keyword.Trim();
            var loweredKeyword = trimmedKeyword.ToLowerInvariant();
            query = query.Where(app => app.SearchKey != null && app.SearchKey.ToLower().Contains(loweredKeyword));
        }

        query = ApplyTimeframeFilter(query, timeframe);

        var normalizedSort = string.IsNullOrWhiteSpace(sort) ? "recent" : sort.Trim().ToLowerInvariant();
        query = normalizedSort switch
        {
            "oldest" => query.OrderBy(app => app.PostedTime),
            "matching_low" or "matching_asc" or "score_low" or "matching_score_asc" => query
                .OrderBy(app => app.MatchingScore)
                .ThenByDescending(app => app.PostedTime),
            "matching_high" or "matching_desc" or "score_high" or "matching_score" or "matching_score_desc" => query
                .OrderByDescending(app => app.MatchingScore)
                .ThenByDescending(app => app.PostedTime),
            _ => query.OrderByDescending(app => app.PostedTime)
        };

        var results = await query.AsNoTracking().ToListAsync();
        return Ok(results.Select(app => app.ToResponse()));
    }

    [HttpGet("keywords")]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<string>>> GetKeywords()
    {
        var rawKeywords = await _context.Applications
            .AsNoTracking()
            .Where(app => !string.IsNullOrEmpty(app.SearchKey))
            .Select(app => app.SearchKey!)
            .ToListAsync();

        var keywords = rawKeywords
            .SelectMany(value => value.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
            .Select(keyword => keyword.Trim())
            .Where(keyword => !string.IsNullOrEmpty(keyword))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(keyword => keyword, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(keywords);
    }

    [HttpPost]
    [ProducesResponseType(typeof(IEnumerable<ApplicationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ApplicationResponse>>> UpsertApplications([FromBody] IEnumerable<ApplicationCreateRequest> payload)
    {
        try
        {
            if (payload is null)
            {
                return BadRequest("Request body is required");
            }
            var latestResume = await _context.Resumes.OrderByDescending(resume => resume.UploadedAt).FirstOrDefaultAsync();
            var resumeText = latestResume?.TextContent;

            var updated = new List<Application>();
            foreach (var item in payload)
            {
                var existing = await _context.Applications.FirstOrDefaultAsync(app => app.JobId == item.JobId);
                if (existing is null)
                {
                    existing = new Application
                    {
                        JobId = item.JobId,
                        Status = "not_applied",
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Applications.Add(existing);
                }

                existing.JobTitle = item.JobTitle;
                existing.Company = item.Company;
                existing.Location = item.Location;
                existing.Salary = item.Salary;
                existing.Description = item.Description;
                existing.ApplyLink = item.ApplyLink;
                existing.SearchKey = item.SearchKey;
                existing.PostedTime = NormalizeToUtc(item.PostedTime);
                existing.Source = item.Source;

                existing.MatchingScore = _matchingService.CalculateScore(resumeText, existing.JobTitle, existing.Description, existing.SearchKey);
                updated.Add(existing);
            }

            await _context.SaveChangesAsync();
            return Ok(updated.Select(app => app.ToResponse()));
        }
        catch (Exception e)
        {

            return BadRequest(e.Message);
        }
       

    }

    [HttpPost("{applicationId:int}/apply")]
    [ProducesResponseType(typeof(ApplicationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApplicationResponse>> MarkAsApplied(int applicationId)
    {
        var application = await _context.Applications.FindAsync(applicationId);
        if (application is null)
        {
            return NotFound();
        }

        application.Status = "applied";
        await _context.SaveChangesAsync();
        return Ok(application.ToResponse());
    }

    private static IQueryable<Application> ApplyTimeframeFilter(IQueryable<Application> query, string? timeframe)
    {
        if (string.IsNullOrWhiteSpace(timeframe) || string.Equals(timeframe, "all", StringComparison.OrdinalIgnoreCase))
        {
            return query;
        }

        var now = DateTime.UtcNow;
        var cutoff = timeframe switch
        {
            "24h" => now.AddHours(-24),
            "3d" => now.AddDays(-3),
            "5d" => now.AddDays(-5),
            _ => (DateTime?)null
        };

        return cutoff.HasValue ? query.Where(app => app.PostedTime >= cutoff.Value) : query;
    }

    private static DateTime NormalizeToUtc(DateTime dateTime)
    {
        return dateTime.Kind switch
        {
            DateTimeKind.Utc => dateTime,
            DateTimeKind.Local => dateTime.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dateTime, DateTimeKind.Utc)
        };
    }
}
