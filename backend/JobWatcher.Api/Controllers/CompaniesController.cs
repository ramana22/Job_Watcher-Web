using JobWatcher.Api.Data;
using JobWatcher.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JobWatcher.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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
        try
        {

            // 1️⃣ Load relevant records from DB (simple SQL query)
            var allApps = await _context.Applications
                .AsNoTracking()
                .Where(a => !string.IsNullOrEmpty(a.Company))
                .Select(a => new { a.Company, a.ApplyLink }) // only select what you need
                .ToListAsync();

            // 2️⃣ Do grouping and picking first ApplyLink in memory
            var companies = allApps
                .GroupBy(a => a.Company)
                .Select(g => new CompanyResponse(
                    g.Key,
                    g.FirstOrDefault(a => !string.IsNullOrWhiteSpace(a.ApplyLink))?.ApplyLink ?? string.Empty
                ))
                .OrderBy(c => c.Company)
                .ToList();

            return Ok(companies);


        }
        catch (Exception e)
        {

            return BadRequest(e);
        }

    }

}
