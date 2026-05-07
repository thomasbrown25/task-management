import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { TaskItem } from './types'

const baseTask: TaskItem = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Write production README',
  description: 'Document setup and trade-offs.',
  status: 'active',
  priority: 'high',
  dueDate: '2026-05-20',
  tags: ['docs'],
  createdAt: '2026-05-06T12:00:00Z',
  updatedAt: '2026-05-06T12:00:00Z',
  completedAt: null,
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

describe('Task Management UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders tasks from the API with summary metrics and filters', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/summary')) return jsonResponse({ total: 1, active: 1, completed: 0, overdue: 0, dueToday: 0 })
      return jsonResponse({ items: [baseTask], page: 1, pageSize: 25, totalCount: 1, totalPages: 1 })
    })

    render(<App />)

    expect((await screen.findAllByText('Write production README')).length).toBeGreaterThan(0)
    expect(screen.getByText('Document setup and trade-offs.')).toBeInTheDocument()
    expect(screen.getAllByText('High').length).toBeGreaterThan(0)
    expect(screen.getByText('Due May 20, 2026')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Open tasks 1' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Completed 0' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overdue only' })).toBeInTheDocument()
  })

  it('keeps create form input in place when the API returns validation errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (init?.method === 'POST') return jsonResponse({ errors: { title: ['Title is required.'] } }, 400)
      if (url.includes('/summary')) return jsonResponse({ total: 0, active: 0, completed: 0, overdue: 0, dueToday: 0 })
      return jsonResponse({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 })
    })

    render(<App />)
    await screen.findByText('No tasks match this view. Try clearing filters or creating a new task.')

    await userEvent.click(screen.getByRole('button', { name: 'Create task' }))
    await userEvent.type(screen.getByLabelText('Title'), 'Draft that should stay')
    const createButtons = screen.getAllByRole('button', { name: 'Create task' })
    await userEvent.click(createButtons[createButtons.length - 1])

    expect(await screen.findByRole('alert')).toHaveTextContent('Title is required.')
    expect(screen.getByLabelText('Title')).toHaveValue('Draft that should stay')
  })

  it('rolls back an optimistic completion toggle when the API fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input)
      if (init?.method === 'PATCH') return jsonResponse({ errors: { task: ['Unable to complete task.'] } }, 500)
      if (url.includes('/summary')) return jsonResponse({ total: 1, active: 1, completed: 0, overdue: 0, dueToday: 0 })
      return jsonResponse({ items: [baseTask], page: 1, pageSize: 25, totalCount: 1, totalPages: 1 })
    })

    render(<App />)
    const checkbox = await screen.findByRole('checkbox', { name: 'Mark Write production README complete' })

    expect(checkbox).not.toBeChecked()
    await userEvent.click(checkbox)

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to complete task.')
    await waitFor(() => expect(checkbox).not.toBeChecked())
  })
})
