namespace TaskManagement.Api.Tasks;

public sealed record CreateTaskRequest(
    string? Title,
    string? Description,
    DateOnly? DueDate,
    string? Priority,
    IReadOnlyList<string>? Tags);

public sealed record UpdateTaskRequest(
    string? Title,
    string? Description,
    DateOnly? DueDate,
    string? Priority,
    IReadOnlyList<string>? Tags);

public sealed record SetCompletionRequest(bool IsCompleted);

public sealed record TaskResponse(
    Guid Id,
    string Title,
    string? Description,
    string Status,
    string Priority,
    DateOnly? DueDate,
    IReadOnlyList<string> Tags,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? CompletedAt);

public sealed record PagedTasksResponse(
    IReadOnlyList<TaskResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public sealed record TaskSummaryResponse(
    int Total,
    int Active,
    int Completed,
    int Overdue,
    int DueToday);
