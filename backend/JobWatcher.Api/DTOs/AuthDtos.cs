using System.Text.Json.Serialization;

namespace JobWatcher.Api.DTOs;

public record AuthRequest(
    [property: JsonPropertyName("username")] string Username,
    [property: JsonPropertyName("password")] string Password
);

public record AuthResponse(
    [property: JsonPropertyName("username")] string Username,
    [property: JsonPropertyName("token")] string Token,
    [property: JsonPropertyName("expires_at")] DateTime ExpiresAt
);
