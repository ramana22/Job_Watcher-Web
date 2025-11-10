using System.Text.Json.Serialization;

namespace JobWatcher.Api.DTOs;

public record ApplicationCreateRequest(
    [property: JsonPropertyName("job_id")] string JobId,
    [property: JsonPropertyName("job_title")] string JobTitle,
    [property: JsonPropertyName("company")] string Company,
    [property: JsonPropertyName("location")] string? Location,
    [property: JsonPropertyName("salary")] string? Salary,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("apply_link")] string? ApplyLink,
    [property: JsonPropertyName("search_key")] string? SearchKey,
    [property: JsonPropertyName("posted_time")] DateTime PostedTime,
    [property: JsonPropertyName("source")] string Source,
    [property: JsonPropertyName("matching_score")] double? MatchingScore
);

public record ApplicationResponse(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("job_id")] string JobId,
    [property: JsonPropertyName("job_title")] string JobTitle,
    [property: JsonPropertyName("company")] string Company,
    [property: JsonPropertyName("location")] string? Location,
    [property: JsonPropertyName("salary")] string? Salary,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("apply_link")] string? ApplyLink,
    [property: JsonPropertyName("search_key")] string? SearchKey,
    [property: JsonPropertyName("posted_time")] DateTime PostedTime,
    [property: JsonPropertyName("source")] string Source,
    [property: JsonPropertyName("matching_score")] double MatchingScore,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("created_at")] DateTime CreatedAt
);

public record CompanyResponse(
    [property: JsonPropertyName("company")] string Company,
    [property: JsonPropertyName("career_site")] string? CareerSite
);

public record ResumeInfoResponse(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("filename")] string Filename,
    [property: JsonPropertyName("uploaded_at")] DateTime UploadedAt
);
