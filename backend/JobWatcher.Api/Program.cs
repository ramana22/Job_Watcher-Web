using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.Json;
using JobWatcher.Api.Data;
using JobWatcher.Api.Models;
using JobWatcher.Api.Models.Email;
using JobWatcher.Api.Services;
using JobWatcher.Api.Services.Email;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ✅ Database
builder.Services.AddDbContext<JobWatcherContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorNumbersToAdd: null);
        }));


builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();


// ✅ Custom services
builder.Services.AddScoped<MatchingService>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

// ✅ JWT configuration
var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services.Configure<JwtOptions>(jwtSection);
var jwtOptions = jwtSection.Get<JwtOptions>() ?? new JwtOptions();

if (string.IsNullOrWhiteSpace(jwtOptions.Key))
    throw new InvalidOperationException("JWT signing key must be configured.");

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key));
var validateIssuer = !string.IsNullOrWhiteSpace(jwtOptions.Issuer);
var validateAudience = !string.IsNullOrWhiteSpace(jwtOptions.Audience);

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateIssuer = validateIssuer,
            ValidateAudience = validateAudience,
            ValidIssuer = validateIssuer ? jwtOptions.Issuer : null,
            ValidAudience = validateAudience ? jwtOptions.Audience : null,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    });

// ✅ Add HttpClient for proxy
builder.Services.AddHttpClient();

// ✅ Authorization
builder.Services.AddAuthorization();

// ✅ Controllers + JSON naming policy
builder.Services
    .AddControllers() // 🔧 removed the stray "A"
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ✅ CORS policy for frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173", // ← FIXED
                "https://jobwatch-web1-bedyfgejcqebbqbg.canadacentral-01.azurewebsites.net",
                "chrome-extension://ifinjnneepdjnjopaccadcbejbelfcbk")
            .AllowAnyHeader()
            .AllowAnyMethod();
            //.AllowCredentials(); // ← IMPORTANT for JWT
    });
});

var app = builder.Build();

app.UseCors("frontend");

if (app.Environment.IsDevelopment() || app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "JobWatcher API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ✅ Simple health check
app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck")
    .WithOpenApi();

app.Run();

// ✅ Needed for Swashbuckle CLI (swagger tofile)
public partial class Program
{
    public static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .ConfigureWebHostDefaults(webBuilder =>
            {
                webBuilder.UseStartup<StartupPlaceholder>();
            });
}

public class StartupPlaceholder
{
    public void ConfigureServices(IServiceCollection services) { }
    public void Configure(IApplicationBuilder app, IWebHostEnvironment env) { }
}
