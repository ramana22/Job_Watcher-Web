using JobWatcher.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace JobWatcher.Api.Data;

public class JobWatcherContext : DbContext
{
    public JobWatcherContext(DbContextOptions<JobWatcherContext> options) : base(options)
    {
    }

    public DbSet<Application> Applications => Set<Application>();
    public DbSet<Resume> Resumes => Set<Resume>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Application>(entity =>
        {
            entity.ToTable("applications");
            entity.HasIndex(e => new { e.JobId, e.Source, e.IsDeleted }).IsUnique();
            entity.Property(e => e.JobId).HasMaxLength(100);
            entity.Property(e => e.JobTitle).HasMaxLength(255);
            entity.Property(e => e.Company).HasMaxLength(255);
            entity.Property(e => e.Location).HasMaxLength(255);
            entity.Property(e => e.Salary).HasMaxLength(255);
            entity.Property(e => e.ApplyLink).HasMaxLength(500);
            entity.Property(e => e.SearchKey).HasMaxLength(255);
            entity.Property(e => e.Source).HasMaxLength(100);
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("not_applied");
            entity.Property(e => e.MatchingScore).HasDefaultValue(0.0);
            entity.Property(e => e.PostedTime).HasColumnType("datetime2");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.DeletedAt).HasColumnType("datetime2");
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<Resume>(entity =>
        {
            entity.ToTable("resumes");
            entity.Property(e => e.Filename).HasMaxLength(255);
            entity.Property(e => e.UploadedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasIndex(e => e.NormalizedUsername).IsUnique();
            entity.Property(e => e.Username).HasMaxLength(100);
            entity.Property(e => e.NormalizedUsername).HasMaxLength(100);
            entity.Property(e => e.PasswordHash).HasMaxLength(512);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });
    }
}
