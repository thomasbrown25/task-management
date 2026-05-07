namespace TaskManagement.Api.Tasks;

public static class TaskMapping
{
    public static TaskResponse ToResponse(this TaskItem task) => new(
        task.Id,
        task.Title,
        task.Description,
        task.Status.ToApiString(),
        task.Priority.ToApiString(),
        task.DueDate,
        SplitTags(task.Tags),
        AsUtc(task.CreatedAt),
        AsUtc(task.UpdatedAt),
        task.CompletedAt is null ? null : AsUtc(task.CompletedAt.Value));

    public static string ToApiString(this TaskItemStatus status) => status.ToString().ToLowerInvariant();

    public static string ToApiString(this TaskPriority priority) => priority.ToString().ToLowerInvariant();

    public static string NormalizeTags(IReadOnlyList<string>? tags)
    {
        if (tags is null || tags.Count == 0)
        {
            return string.Empty;
        }

        return string.Join(',', tags
            .Select(tag => tag.Trim().ToLowerInvariant())
            .Where(tag => tag.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(tag => tag));
    }

    private static DateTimeOffset AsUtc(DateTime value)
    {
        return new DateTimeOffset(DateTime.SpecifyKind(value, DateTimeKind.Utc));
    }

    private static IReadOnlyList<string> SplitTags(string tags)
    {
        if (string.IsNullOrWhiteSpace(tags))
        {
            return [];
        }

        return tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}
