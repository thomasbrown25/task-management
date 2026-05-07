using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace TaskManagement.Api.Tests;

public class TaskEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public TaskEndpointsTests(WebApplicationFactory<Program> factory)
    {
        var databasePath = Path.Combine(Path.GetTempPath(), $"task-management-tests-{Guid.NewGuid():N}.db");
        _client = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:Tasks", $"Data Source={databasePath}");
        }).CreateClient();
    }

    [Fact]
    public async Task CreateTask_WithValidDateOnlyPayload_ReturnsCreatedTaskWithoutLeakingEntityShape()
    {
        var response = await _client.PostAsJsonAsync("/api/tasks", new
        {
            title = " Prepare interview walkthrough ",
            description = "Record the happy path and edge cases.",
            dueDate = "2026-05-15",
            priority = "high",
            tags = new[] { "interview", "mvp" }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();

        var task = await response.Content.ReadFromJsonAsync<TaskResponse>();
        task.Should().NotBeNull();
        task!.Title.Should().Be("Prepare interview walkthrough");
        task.DueDate.Should().Be("2026-05-15");
        task.Status.Should().Be("active");
        task.Priority.Should().Be("high");
        task.Tags.Should().BeEquivalentTo("interview", "mvp");
        task.CreatedAt.Should().NotBe(default);
        task.UpdatedAt.Should().NotBe(default);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateTask_WithMissingOrWhitespaceTitle_ReturnsValidationProblem(string? title)
    {
        var response = await _client.PostAsJsonAsync("/api/tasks", new { title, priority = "medium" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("title", because: "blank task titles are a core validation edge case");
    }

    [Fact]
    public async Task ListTasks_AppliesServerSideSearchStatusPriorityAndDateOnlyOverdueFilter()
    {
        await _client.PostAsJsonAsync("/api/tasks", new { title = "Buy coffee", dueDate = "2026-05-01", priority = "low", tags = new[] { "errand" } });
        await _client.PostAsJsonAsync("/api/tasks", new { title = "Write production README", dueDate = "2026-05-20", priority = "high", tags = new[] { "docs" } });
        var completed = await CreateTaskAsync("Ship demo polish", "2026-05-02", "high");
        await _client.PatchAsJsonAsync($"/api/tasks/{completed.Id}/completion", new { isCompleted = true });

        var searchResponse = await _client.GetFromJsonAsync<PagedTasksResponse>("/api/tasks?search=readme&status=active&priority=high&page=1&pageSize=10&sort=dueDate&direction=asc");
        searchResponse.Should().NotBeNull();
        searchResponse!.Items.Should().ContainSingle();
        searchResponse.Items[0].Title.Should().Be("Write production README");

        var overdueResponse = await _client.GetFromJsonAsync<PagedTasksResponse>("/api/tasks?status=overdue&today=2026-05-10&page=1&pageSize=10");
        overdueResponse.Should().NotBeNull();
        overdueResponse!.Items.Should().ContainSingle(task => task.Title == "Buy coffee");
        overdueResponse.Items.Should().NotContain(task => task.Title == "Ship demo polish", because: "completed tasks should not appear as overdue");
    }

    [Fact]
    public async Task UpdateFailure_PreservesExistingTaskAndReportsValidationError()
    {
        var created = await CreateTaskAsync("Keep original title", "2026-06-01", "medium");

        var invalidUpdate = await _client.PutAsJsonAsync($"/api/tasks/{created.Id}", new
        {
            title = "   ",
            description = "bad update",
            dueDate = "2026-06-02",
            priority = "high",
            tags = Array.Empty<string>()
        });

        invalidUpdate.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var stillExisting = await _client.GetFromJsonAsync<TaskResponse>($"/api/tasks/{created.Id}");
        stillExisting.Should().NotBeNull();
        stillExisting!.Title.Should().Be("Keep original title");
        stillExisting.DueDate.Should().Be("2026-06-01");
    }

    [Fact]
    public async Task Delete_RemovesTaskAndSubsequentLookupReturnsNotFound()
    {
        var created = await CreateTaskAsync("Delete me", null, "low");

        var delete = await _client.DeleteAsync($"/api/tasks/{created.Id}");
        delete.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var lookup = await _client.GetAsync($"/api/tasks/{created.Id}");
        lookup.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private async Task<TaskResponse> CreateTaskAsync(string title, string? dueDate, string priority)
    {
        var response = await _client.PostAsJsonAsync("/api/tasks", new { title, dueDate, priority, tags = Array.Empty<string>() });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TaskResponse>())!;
    }

    private sealed record PagedTasksResponse(IReadOnlyList<TaskResponse> Items, int Page, int PageSize, int TotalCount, int TotalPages);

    private sealed record TaskResponse(
        Guid Id,
        string Title,
        string? Description,
        string Status,
        string Priority,
        string? DueDate,
        IReadOnlyList<string> Tags,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt,
        DateTimeOffset? CompletedAt);
}
