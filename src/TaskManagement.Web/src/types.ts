export type TaskStatus = 'active' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatusFilter = 'all' | 'active' | 'completed' | 'overdue'

export interface TaskItem {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export interface PagedTasksResponse {
  items: TaskItem[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface TaskSummary {
  total: number
  active: number
  completed: number
  overdue: number
  dueToday: number
}

export interface TaskFormValues {
  title: string
  description: string
  dueDate: string
  priority: TaskPriority
  tags: string
}
