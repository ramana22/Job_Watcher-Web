using JobWatcher.Api.Data;
using JobWatcher.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Register DbContext
builder.Services.AddDbContext<JobWatcherContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register custom services
builder.Services.AddScoped<MatchingService>();

// Controllers + JSON naming
builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
    });

// Swagger + API explorer
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .AllowAnyOrigin();
    });
});

var app = builder.Build();

app.UseCors("frontend");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        // ✅ Load Swagger UI directly at root
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "JobWatcher API v1");
        c.RoutePrefix = string.Empty;
    });
}

app.UseHttpsRedirection();

app.MapControllers();

// Health Check Endpoint
app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck")
    .WithOpenApi();

app.Run();
