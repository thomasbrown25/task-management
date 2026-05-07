namespace TaskManagement.Api.Tasks;

public static class TaskValidation
{
    public const int TitleMaxLength = 120;
    public const int DescriptionMaxLength = 1_000;
    public const int TagMaxLength = 32;
    public const int MaxTags = 8;

    public static Dictionary<string, string[]> Validate(string? title, string? description, string? priority, IReadOnlyList<string>? tags)
    {
        var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(title))
        {
            errors["title"] = ["Title is required."];
        }
        else if (title.Trim().Length > TitleMaxLength)
        {
            errors["title"] = [$"Title must be {TitleMaxLength} characters or fewer."];
        }

        if (!string.IsNullOrEmpty(description) && description.Length > DescriptionMaxLength)
        {
            errors["description"] = [$"Description must be {DescriptionMaxLength} characters or fewer."];
        }

        if (!string.IsNullOrWhiteSpace(priority) && !Enum.TryParse<TaskPriority>(priority, ignoreCase: true, out _))
        {
            errors["priority"] = ["Priority must be low, medium, or high."];
        }

        if (tags is { Count: > MaxTags })
        {
            errors["tags"] = [$"A task can have at most {MaxTags} tags."];
        }
        else if (tags is not null)
        {
            var invalidTags = tags.Where(tag => string.IsNullOrWhiteSpace(tag) || tag.Trim().Length > TagMaxLength).ToArray();
            if (invalidTags.Length > 0)
            {
                errors["tags"] = [$"Tags must be non-empty and {TagMaxLength} characters or fewer."];
            }
        }

        return errors;
    }

    public static TaskPriority ParsePriorityOrDefault(string? priority)
    {
        return Enum.TryParse<TaskPriority>(priority, ignoreCase: true, out var parsed) ? parsed : TaskPriority.Medium;
    }
}
