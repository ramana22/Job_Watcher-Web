using JobWatcher.Api.Data;
using JobWatcher.Api.Services.Email;
using JobWatcher.Api.Utility;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace JobWatcher.Api.Services.AI_Service;

public class AgentTools
{
    private readonly JobWatcherContext _db;
    private readonly IHttpContextAccessor _httpContext;
    private readonly IEmailService _emailService;
    public AgentTools(JobWatcherContext db, IHttpContextAccessor httpContext, IEmailService emailService)
    {
        _db = db;
        _httpContext = httpContext;
        _emailService = emailService;
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
                a.ApplyLink
            })
            .Cast<object>()
            .ToListAsync()
            .ConfigureAwait(false);
    }

    public async Task<string> GetResumeInfo()
    {
        var user = _httpContext.HttpContext?.User;
        var name = user?.FindFirst(ClaimTypes.Name)?.Value ?? "Unknown User";

        var resume = await _db.Resumes
            .FirstOrDefaultAsync()
            .ConfigureAwait(false);

        if (resume == null || resume.Content == null)
            return "No resume information available.";

        // Extract text from stored PDF
        var resumeText = PdfUtility.ExtractPdfText(resume.Content);

        // Optional: limit length for AI
        if (resumeText.Length > 4000)
            resumeText = resumeText.Substring(0, 4000);

        return $"Resume information for {name}:\n\n{resumeText}";
    }

    public Task<object> GetCurrentUserInfo()
    {
        var user = _httpContext.HttpContext?.User;

        var fullName = user?.FindFirst(ClaimTypes.Name)?.Value
            ?? user?.FindFirst("name")?.Value
            ?? "User";

        var email = user?.FindFirst(ClaimTypes.Email)?.Value
            ?? user?.FindFirst("email")?.Value
            ?? "";

        return Task.FromResult<object>(new
        {
            FullName = fullName,
            Email = email
        });
    }

    /// <summary>
    /// Sends an email to a recruiter
    /// </summary>
    public async Task<string> SendEmailAsync(string to, string subject, string body)
    {
        // Convert plain text line breaks to HTML
        var htmlBody = "<p>" + body
         .Replace("\r\n\r\n", "</p><p>")
         .Replace("\n\n", "</p><p>")
         .Replace("\n", "<br/>")
         + "</p>";

        await _emailService.SendToAsync(to, subject, htmlBody, false);

        return $"Email successfully sent to {to}";
    }
}

