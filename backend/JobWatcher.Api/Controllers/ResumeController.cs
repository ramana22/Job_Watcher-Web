using JobWatcher.Api.Data;
using JobWatcher.Api.DTOs;
using JobWatcher.Api.Models;
using JobWatcher.Api.Services;
using JobWatcher.Api.Utility;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace JobWatcher.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ResumeController : ControllerBase
{
    private readonly JobWatcherContext _context;
    private readonly MatchingService _matchingService;

    public ResumeController(JobWatcherContext context, MatchingService matchingService)
    {
        _context = context;
        _matchingService = matchingService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ResumeInfoResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ResumeInfoResponse?>> GetResume()
    {
        var resume = await _context.Resumes
            .AsNoTracking()
            .OrderByDescending(resume => resume.UploadedAt)
            .FirstOrDefaultAsync();

        if (resume is null)
        {
            return Ok(null);
        }

        return Ok(new ResumeInfoResponse(resume.Id, resume.Filename, resume.UploadedAt));
    }

    [HttpPost]
    [ProducesResponseType(typeof(ResumeInfoResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ResumeInfoResponse>> UploadResume(IFormFile file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest("A non-empty resume file is required");
        }

        await using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);

        var bytes = memoryStream.ToArray();

        // Extract text from PDF
        var textContent = PdfUtility.ExtractPdfText(bytes);

        if (string.IsNullOrWhiteSpace(textContent))
        {
            return BadRequest("Unable to extract text from the uploaded resume.");
        }

        var resume = new Resume
        {
            Filename = file.FileName,
            Content = bytes,
            TextContent = textContent,
            UploadedAt = DateTime.UtcNow
        };

        _context.Resumes.Add(resume);

        var applications = await _context.Applications.ToListAsync();

        foreach (var application in applications)
        {
            application.MatchingScore = _matchingService.CalculateScore(
                textContent,
                application.JobTitle,
                application.Description,
                application.SearchKey
            );
        }

        await _context.SaveChangesAsync();

        return Ok(new ResumeInfoResponse(resume.Id, resume.Filename, resume.UploadedAt));
    }
}
