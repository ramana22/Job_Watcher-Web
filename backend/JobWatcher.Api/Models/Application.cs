using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace JobWatcher.Api.Models;

public class Application
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("job_id")]
    public string JobId { get; set; } = string.Empty;

    [Column("job_title")]
    public string JobTitle { get; set; } = string.Empty;

    [Column("company")]
    public string Company { get; set; } = string.Empty;

    [Column("location")]
    public string? Location { get; set; }

    [Column("salary")]
    public string? Salary { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("apply_link")]
    public string? ApplyLink { get; set; }

    [Column("search_key")]
    public string? SearchKey { get; set; }

    [Column("posted_time")]
    public DateTime PostedTime { get; set; }

    [Column("source")]
    public string Source { get; set; } = string.Empty;

    [Column("matching_score")]
    public double MatchingScore { get; set; }

    [Column("status")]
    public string Status { get; set; } = "not_applied";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
