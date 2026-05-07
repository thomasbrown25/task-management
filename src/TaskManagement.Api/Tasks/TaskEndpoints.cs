using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using TaskManagement.Api.Data;

namespace TaskManagement.Api.Tasks;

public static class TaskEndpoints
{
    private static readonly HashSet<string> AllowedStatuses = ["all", "active", "completed", "overdue"];
    private static readonly HashSet<string> AllowedSorts = ["createdAt", "updatedAt", "dueDate", "priority", "title"];
    private static readonly HashSet<string> AllowedDirections = ["asc", "desc"];

    public static RouteGroupBuilder MapTaskEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/", ListTasks);
        group.MapGet("/summary", GetSummary);
        group.MapGet("/{id:guid}", GetTaskById).WithName("GetTaskById");
        group.MapPost("/", CreateTask);
        group.MapPut("/{id:guid}", UpdateTask);
        group.MapPatch("/{id:guid}/completion", SetCompletion);
        group.MapDelete("/{id:guid}", DeleteTask);
        return group;
    }

    private static async Task<Results<Ok<PagedTasksResponse>, BadRequest<ValidationProblem>>> ListTasks(
        TaskManagementDbContext db,
        string? status,
        string? search,
        string? priority,
        string? sort,
        string? direction,
        string? today,
        int? page,
        int? pageSize,
        CancellationToken cancellationToken)
    {
        var errors = ValidateQuery(status, priority, sort, direction, today, page, pageSize);
        if (errors.Count > 0)
        {
            return TypedResults.BadRequest(new ValidationProblem(errors));
        }

        var normalizedStatus = string.IsNullOrWhiteSpace(status) ? "all" : status.Trim().ToLowerInvariant();
        var normalizedSort = string.IsNullOrWhiteSpace(sort) ? "createdAt" : sort.Trim();
        var normalizedDirection = string.IsNullOrWhiteSpace(direction) ? "desc" : direction.Trim().ToLowerInvariant();
        var currentPage = page.GetValueOrDefault(1);
        var currentPageSize = Math.Min(pageSize.GetValueOrDefault(20), 100);
        var effectiveToday = ParseTodayOrDefault(today);

        IQueryable<TaskItem> query = db.Tasks.AsNoTracking();

        query = normalizedStatus switch
        {
            "active" => query.Where(task => task.Status == TaskItemStatus.Active),
            "completed" => query.Where(task => task.Status == TaskItemStatus.Completed),
            "overdue" => query.Where(task => task.Status == TaskItemStatus.Active && task.DueDate != null && task.DueDate < effectiveToday),
            _ => query
        };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(task => EF.Functions.Like(task.Title, $"%{term}%") ||
                                        (task.Description != null && EF.Functions.Like(task.Description, $"%{term}%")) ||
                                        EF.Functions.Like(task.Tags, $"%{term.ToLowerInvariant()}%"));
        }

        if (!string.IsNullOrWhiteSpace(priority))
        {
            var parsedPriority = TaskValidation.ParsePriorityOrDefault(priority);
            query = query.Where(task => task.Priority == parsedPriority);
        }

        query = ApplySort(query, normalizedSort, normalizedDirection);

        var totalCount = await query.CountAsync(cancellationToken);
        var taskItems = await query
            .Skip((currentPage - 1) * currentPageSize)
            .Take(currentPageSize)
            .ToListAsync(cancellationToken);
        var items = taskItems.Select(task => task.ToResponse()).ToList();

        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)currentPageSize);
        return TypedResults.Ok(new PagedTasksResponse(items, currentPage, currentPageSize, totalCount, totalPages));
    }

    private static async Task<Results<Ok<TaskSummaryResponse>, BadRequest<ValidationProblem>>> GetSummary(
        TaskManagementDbContext db,
        string? today,
        CancellationToken cancellationToken)
    {
        var errors = ValidateQuery(null, null, null, null, today, null, null);
        if (errors.Count > 0)
        {
            return TypedResults.BadRequest(new ValidationProblem(errors));
        }

        var effectiveToday = ParseTodayOrDefault(today);
        var total = await db.Tasks.CountAsync(cancellationToken);
        var active = await db.Tasks.CountAsync(task => task.Status == TaskItemStatus.Active, cancellationToken);
        var completed = await db.Tasks.CountAsync(task => task.Status == TaskItemStatus.Completed, cancellationToken);
        var overdue = await db.Tasks.CountAsync(task => task.Status == TaskItemStatus.Active && task.DueDate != null && task.DueDate < effectiveToday, cancellationToken);
        var dueToday = await db.Tasks.CountAsync(task => task.Status == TaskItemStatus.Active && task.DueDate == effectiveToday, cancellationToken);
        return TypedResults.Ok(new TaskSummaryResponse(total, active, completed, overdue, dueToday));
    }

    private static async Task<Results<Ok<TaskResponse>, NotFound>> GetTaskById(Guid id, TaskManagementDbContext db, CancellationToken cancellationToken)
    {
        var task = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        return task is null ? TypedResults.NotFound() : TypedResults.Ok(task.ToResponse());
    }

    private static async Task<Results<CreatedAtRoute<TaskResponse>, BadRequest<ValidationProblem>>> CreateTask(
        CreateTaskRequest request,
        TaskManagementDbContext db,
        CancellationToken cancellationToken)
    {
        var errors = TaskValidation.Validate(request.Title, request.Description, request.Priority, request.Tags);
        if (errors.Count > 0)
        {
            return TypedResults.BadRequest(new ValidationProblem(errors));
        }

        var now = DateTime.UtcNow;
        var task = new TaskItem
        {
            Title = request.Title!.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            DueDate = request.DueDate,
            Priority = TaskValidation.ParsePriorityOrDefault(request.Priority),
            Tags = TaskMapping.NormalizeTags(request.Tags),
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Tasks.Add(task);
        await db.SaveChangesAsync(cancellationToken);

        return TypedResults.CreatedAtRoute(task.ToResponse(), "GetTaskById", new { task.Id });
    }

    private static async Task<Results<Ok<TaskResponse>, BadRequest<ValidationProblem>, NotFound>> UpdateTask(
        Guid id,
        UpdateTaskRequest request,
        TaskManagementDbContext db,
        CancellationToken cancellationToken)
    {
        var errors = TaskValidation.Validate(request.Title, request.Description, request.Priority, request.Tags);
        if (errors.Count > 0)
        {
            return TypedResults.BadRequest(new ValidationProblem(errors));
        }

        var task = await db.Tasks.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (task is null)
        {
            return TypedResults.NotFound();
        }

        task.Title = request.Title!.Trim();
        task.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        task.DueDate = request.DueDate;
        task.Priority = TaskValidation.ParsePriorityOrDefault(request.Priority);
        task.Tags = TaskMapping.NormalizeTags(request.Tags);
        task.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(task.ToResponse());
    }

    private static async Task<Results<Ok<TaskResponse>, NotFound>> SetCompletion(
        Guid id,
        SetCompletionRequest request,
        TaskManagementDbContext db,
        CancellationToken cancellationToken)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (task is null)
        {
            return TypedResults.NotFound();
        }

        task.Status = request.IsCompleted ? TaskItemStatus.Completed : TaskItemStatus.Active;
        task.CompletedAt = request.IsCompleted ? DateTime.UtcNow : null;
        task.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(task.ToResponse());
    }

    private static async Task<Results<NoContent, NotFound>> DeleteTask(Guid id, TaskManagementDbContext db, CancellationToken cancellationToken)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (task is null)
        {
            return TypedResults.NotFound();
        }

        db.Tasks.Remove(task);
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.NoContent();
    }

    private static Dictionary<string, string[]> ValidateQuery(string? status, string? priority, string? sort, string? direction, string? today, int? page, int? pageSize)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

        if (!string.IsNullOrWhiteSpace(status) && !AllowedStatuses.Contains(status.Trim().ToLowerInvariant()))
        {
            errors["status"] = ["Status must be all, active, completed, or overdue."];
        }

        if (!string.IsNullOrWhiteSpace(priority) && !Enum.TryParse<TaskPriority>(priority, ignoreCase: true, out _))
        {
            errors["priority"] = ["Priority must be low, medium, or high."];
        }

        if (!string.IsNullOrWhiteSpace(sort) && !AllowedSorts.Contains(sort.Trim()))
        {
            errors["sort"] = ["Sort must be createdAt, updatedAt, dueDate, priority, or title."];
        }

        if (!string.IsNullOrWhiteSpace(direction) && !AllowedDirections.Contains(direction.Trim().ToLowerInvariant()))
        {
            errors["direction"] = ["Direction must be asc or desc."];
        }

        if (!string.IsNullOrWhiteSpace(today) && !DateOnly.TryParse(today, out _))
        {
            errors["today"] = ["Today must use YYYY-MM-DD date-only format."];
        }

        if (page is < 1)
        {
            errors["page"] = ["Page must be 1 or greater."];
        }

        if (pageSize is < 1 or > 100)
        {
            errors["pageSize"] = ["Page size must be between 1 and 100."];
        }

        return errors;
    }

    private static DateOnly ParseTodayOrDefault(string? today)
    {
        return DateOnly.TryParse(today, out var parsed) ? parsed : DateOnly.FromDateTime(DateTime.UtcNow);
    }

    private static IQueryable<TaskItem> ApplySort(IQueryable<TaskItem> query, string sort, string direction)
    {
        var ascending = direction == "asc";
        return sort switch
        {
            "title" => ascending ? query.OrderBy(task => task.Title) : query.OrderByDescending(task => task.Title),
            "dueDate" => ascending ? query.OrderBy(task => task.DueDate == null).ThenBy(task => task.DueDate) : query.OrderByDescending(task => task.DueDate),
            "priority" => ascending ? query.OrderBy(task => task.Priority) : query.OrderByDescending(task => task.Priority),
            "updatedAt" => ascending ? query.OrderBy(task => task.UpdatedAt) : query.OrderByDescending(task => task.UpdatedAt),
            _ => ascending ? query.OrderBy(task => task.CreatedAt) : query.OrderByDescending(task => task.CreatedAt)
        };
    }

    private sealed record ValidationProblem(Dictionary<string, string[]> Errors);
}
