import type { PagedTasksResponse, TaskFormValues, TaskItem, TaskPriority, TaskStatusFilter, TaskSummary } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

interface ListTasksParams {
  status: TaskStatusFilter
  search: string
  priority: 'all' | TaskPriority
  sort: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title'
  direction: 'asc' | 'desc'
  page: number
  pageSize: number
  today: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.'
    try {
      const data = await response.json()
      if (data.errors) {
        message = Object.values(data.errors).flat().join(' ')
      }
    } catch {
      // Keep generic message for non-JSON failures.
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function listTasks(params: ListTasksParams): Promise<PagedTasksResponse> {
  const query = new URLSearchParams({
    status: params.status,
    sort: params.sort,
    direction: params.direction,
    page: String(params.page),
    pageSize: String(params.pageSize),
    today: params.today,
  })

  if (params.search.trim()) query.set('search', params.search.trim())
  if (params.priority !== 'all') query.set('priority', params.priority)

  return request<PagedTasksResponse>(`/api/tasks?${query.toString()}`)
}

export async function getSummary(today: string): Promise<TaskSummary> {
  return request<TaskSummary>(`/api/tasks/summary?today=${today}`)
}

export async function createTask(values: TaskFormValues): Promise<TaskItem> {
  return request<TaskItem>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(toPayload(values)),
  })
}

export async function updateTask(id: string, values: TaskFormValues): Promise<TaskItem> {
  return request<TaskItem>(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(toPayload(values)),
  })
}

export async function setTaskCompletion(id: string, isCompleted: boolean): Promise<TaskItem> {
  return request<TaskItem>(`/api/tasks/${id}/completion`, {
    method: 'PATCH',
    body: JSON.stringify({ isCompleted }),
  })
}

export async function deleteTask(id: string): Promise<void> {
  return request<void>(`/api/tasks/${id}`, { method: 'DELETE' })
}

function toPayload(values: TaskFormValues) {
  return {
    title: values.title,
    description: values.description.trim() || null,
    dueDate: values.dueDate || null,
    priority: values.priority,
    tags: values.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
  }
}
