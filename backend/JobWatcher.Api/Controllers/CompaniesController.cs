using JobWatcher.Api.Data;
using JobWatcher.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobWatcher.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CompaniesController : ControllerBase
{
    private readonly JobWatcherContext _context;

    public CompaniesController(JobWatcherContext context)
    {
        _context = context;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<CompanyResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<CompanyResponse>>> GetCompanies()
    {
        var companies = await _context.Applications
            .AsNoTracking()
            .Where(app => !string.IsNullOrEmpty(app.Company))
            .GroupBy(app => app.Company)
            .Select(group => new CompanyResponse(
                group.Key,
                group.Select(app => app.ApplyLink).FirstOrDefault(link => !string.IsNullOrWhiteSpace(link))
            ))
            .OrderBy(entry => entry.Company)
            .ToListAsync();

        return Ok(companies);
    }
}
