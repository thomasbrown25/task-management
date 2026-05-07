using Microsoft.EntityFrameworkCore;
using TaskManagement.Api.Tasks;

namespace TaskManagement.Api.Data;

public class TaskManagementDbContext(DbContextOptions<TaskManagementDbContext> options) : DbContext(options)
{
    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var task = modelBuilder.Entity<TaskItem>();
        task.HasKey(item => item.Id);
        task.Property(item => item.Title).HasMaxLength(TaskValidation.TitleMaxLength).IsRequired();
        task.Property(item => item.Description).HasMaxLength(TaskValidation.DescriptionMaxLength);
        task.Property(item => item.Status).HasConversion<string>().HasMaxLength(24);
        task.Property(item => item.Priority).HasConversion<string>().HasMaxLength(24);
        task.Property(item => item.Tags).HasMaxLength(500);
        task.HasIndex(item => item.Status);
        task.HasIndex(item => item.Priority);
        task.HasIndex(item => item.DueDate);
        task.HasIndex(item => item.CreatedAt);
    }
}
