import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  alpha,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  CssBaseline,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import type { Theme } from '@mui/material/styles'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FlagRoundedIcon from '@mui/icons-material/FlagRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import SortRoundedIcon from '@mui/icons-material/SortRounded'
import { createTask, deleteTask, getSummary, listTasks, setTaskCompletion, updateTask } from './lib/api'
import type { TaskFormValues, TaskItem, TaskPriority, TaskStatusFilter, TaskSummary } from './types'

const emptyForm: TaskFormValues = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium',
  tags: '',
}

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const priorityColors: Record<TaskPriority, 'default' | 'primary' | 'secondary' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'primary',
  high: 'error',
}

function priorityChipSx(priority: TaskPriority) {
  return (theme: Theme) => ({
    height: 23,
    fontSize: '0.68rem',
    fontWeight: 700,
    ...(priority === 'high' && {
      color: theme.palette.error.dark,
      borderColor: alpha(theme.palette.error.main, 0.32),
      bgcolor: alpha(theme.palette.error.main, 0.07),
      '& .MuiChip-icon': {
        color: theme.palette.error.main,
      },
    }),
  })
}

const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      light: '#5a89aa',
      main: '#1e3a5f',
      dark: '#172d4a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#737373',
      dark: '#282e3b',
    },
    error: {
      light: '#ff7875',
      main: '#f5222d',
      dark: '#a8071a',
    },
    warning: {
      main: '#d97706',
    },
    background: {
      default: '#f9f6f4',
      paper: '#ffffff',
    },
    text: {
      primary: '#042238',
      secondary: '#282e3b',
    },
    divider: '#e5e5e5',
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 650,
      letterSpacing: '-0.045em',
    },
    h2: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 650,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 600,
    },
    h4: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 600,
    },
    h5: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 600,
    },
    h6: {
      fontFamily: "'Poppins', sans-serif",
      fontWeight: 500,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
    body2: {
      fontSize: '0.75rem',
      lineHeight: 1.66,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.66,
    },
    button: {
      fontFamily: "'Inter', sans-serif",
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 5,
          boxShadow: 'none',
          borderColor: '#e5e5e5',
          '&:hover': {
            boxShadow: 'none',
            borderColor: '#d9d9d9',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          fontFamily: "'Inter', sans-serif",
        },
        notchedOutline: {
          borderColor: '#E5E5E5',
        },
        root: {
          borderRadius: 8,
          backgroundColor: '#fff',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#5a89aa',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#1E3A8A',
            borderWidth: 2,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 5,
          fontWeight: 650,
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          borderRadius: 5,
        },
      },
    },
  },
})

function todayDateOnly() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <TaskManagementPage />
    </ThemeProvider>
  )
}

function TaskManagementPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [summary, setSummary] = useState<TaskSummary | null>(null)
  const [form, setForm] = useState<TaskFormValues>(emptyForm)
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const [status, setStatus] = useState<TaskStatusFilter>('active')
  const [priority, setPriority] = useState<'all' | TaskPriority>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'createdAt' | 'dueDate' | 'priority' | 'title'>('createdAt')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const today = useMemo(todayDateOnly, [])

  async function loadTasks() {
    setLoading(true)
    setError(null)
    try {
      const [taskPage, taskSummary] = await Promise.all([
        listTasks({ status, priority, search, sort, direction, page: 1, pageSize: 25, today }),
        getSummary(today),
      ])
      setTasks(taskPage.items)
      setSummary(taskSummary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority, search, sort, direction])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      if (editingTask) {
        await updateTask(editingTask.id, form)
        setNotice('Task updated.')
      } else {
        await createTask(form)
        setNotice('Task created.')
      }
      setForm(emptyForm)
      setEditingTask(null)
      setDrawerOpen(false)
      await loadTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save task.')
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(task: TaskItem) {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ?? '',
      priority: task.priority,
      tags: task.tags.join(', '),
    })
    setNotice(null)
    setError(null)
    setDrawerOpen(true)
  }

  function startCreate() {
    setEditingTask(null)
    setForm(emptyForm)
    setNotice(null)
    setError(null)
    setDrawerOpen(true)
  }

  function cancelEdit() {
    setEditingTask(null)
    setForm(emptyForm)
    setError(null)
    setDrawerOpen(false)
  }

  async function handleToggle(task: TaskItem) {
    const original = tasks
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: task.status === 'completed' ? 'active' : 'completed' } : item))
    try {
      await setTaskCompletion(task.id, task.status !== 'completed')
      await loadTasks()
    } catch (err) {
      setTasks(original)
      setError(err instanceof Error ? err.message : 'Unable to update completion status.')
    }
  }

  async function handleDelete(task: TaskItem) {
    const original = tasks
    setTasks((current) => current.filter((item) => item.id !== task.id))
    try {
      await deleteTask(task.id)
      setNotice('Task deleted.')
      await loadTasks()
    } catch (err) {
      setTasks(original)
      setError(err instanceof Error ? err.message : 'Unable to delete task.')
    }
  }

  const emptyState = !loading && !error && tasks.length === 0
  const nextDueTask = useMemo(
    () => tasks
      .filter((task) => task.status !== 'completed' && Boolean(task.dueDate) && task.dueDate! >= today)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))[0] ?? null,
    [tasks, today],
  )
  const taskTab = status === 'completed' ? 'completed' : 'active'

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        px: { xs: 2, md: 4, lg: 7 },
        py: { xs: 3, md: 4 },
        background: 'linear-gradient(180deg, #f9f6f4 0%, #fafafa 100%)',
      }}
    >
      <Stack spacing={2.5} sx={{ maxWidth: 1220, mx: 'auto' }}>
        <Box>
          <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.45rem' }, lineHeight: 1.1, color: 'text.primary', mb: 0.5 }}>
            Task Management
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.98rem' }}>
            Manage tasks, priorities, due dates, and workflow status.
          </Typography>
        </Box>

        <Box
          aria-label="Task summary"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
            gap: 1.5,
          }}
        >
          <SummaryCard label="Open tasks" value={summary?.active ?? 0} />
          <SummaryCard label="Completed tasks" value={summary?.completed ?? 0} />
          <SummaryCard label="Overdue" value={summary?.overdue ?? 0} tone="danger" />
          <SummaryCard label="Due today" value={summary?.dueToday ?? 0} />
        </Box>

        <Box
          sx={(theme) => ({
            borderBottom: `1px solid ${theme.palette.divider}`,
            minHeight: 42,
          })}
        >
          <Tabs
            value={taskTab}
            onChange={(_event, value: 'active' | 'completed') => setStatus(value)}
            aria-label="Task status tabs"
            sx={{
              minHeight: 42,
              '& .MuiTabs-indicator': {
                height: 2,
                bgcolor: '#1e3a5f',
              },
              '& .MuiTab-root': {
                minHeight: 42,
                px: 1.5,
                mr: 2.5,
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'text.primary',
                textTransform: 'none',
              },
            }}
          >
            <Tab
              value="active"
              label={<TabLabel label="Open tasks" count={summary?.active ?? 0} />}
            />
            <Tab
              value="completed"
              label={<TabLabel label="Completed" count={summary?.completed ?? 0} />}
            />
          </Tabs>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            width: '100%',
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <TextField
            aria-label="Search tasks"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks, notes, tags..."
            size="small"
            sx={{
              flex: 1,
              width: '100%',
              minWidth: 0,
              bgcolor: 'background.paper',
              '& .MuiOutlinedInput-root': {
                height: 34,
                fontSize: '0.8rem',
                fontFamily: "'Inter', sans-serif",
                bgcolor: 'background.paper',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#E5E5E5',
              },
            }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.5 }} /></InputAdornment> }, htmlInput: { 'aria-label': 'Search tasks' } }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<AddRoundedIcon sx={{ fontSize: '16px !important' }} />}
            onClick={startCreate}
            sx={{
              height: 34,
              minHeight: 34,
              px: 1.5,
              flexShrink: 0,
              width: { xs: '100%', sm: 'auto' },
              borderRadius: 1.5,
              bgcolor: '#1e3a5f',
              border: '1px solid transparent',
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.8125rem',
              fontWeight: 700,
              lineHeight: 1,
              textTransform: 'none',
              boxShadow: '0 2px 6px rgba(4, 34, 56, 0.18)',
              transition: 'border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
              '& .MuiButton-startIcon': {
                mr: 0.75,
                ml: 0,
              },
              '&:hover': {
                bgcolor: '#172d4a',
                borderColor: '#5a89aa',
                boxShadow: '0 4px 10px rgba(4, 34, 56, 0.24), 0 0 0 1px rgba(90, 137, 170, 0.28)',
              },
            }}
          >
            Create task
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 290px' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          <SectionCard contentSx={{ p: 0 }}>
            <Box sx={{ p: 2, pb: 1.5 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'flex-start' } }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Tasks</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? 'Loading tasks…' : 'Check the box beside a task to mark it complete.'}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }} aria-label="Task filters">
                <Chip
                  label="Overdue only"
                  component="button"
                  clickable
                  color={status === 'overdue' ? 'error' : 'default'}
                  variant={status === 'overdue' ? 'filled' : 'outlined'}
                  onClick={() => setStatus(status === 'overdue' ? 'active' : 'overdue')}
                  sx={{ fontWeight: 650, height: 32 }}
                />
                <FormControl size="small" sx={{ minWidth: 155 }}>
                  <InputLabel id="priority-filter-label">Priority</InputLabel>
                  <Select
                    labelId="priority-filter-label"
                    aria-label="Priority filter"
                    label="Priority"
                    value={priority}
                    onChange={(event: SelectChangeEvent) => setPriority(event.target.value as 'all' | TaskPriority)}
                    sx={{ height: 32 }}
                  >
                    <MenuItem value="all">All priorities</MenuItem>
                    {Object.entries(priorityLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="sort-label">Sort</InputLabel>
                  <Select
                    labelId="sort-label"
                    aria-label="Sort tasks"
                    label="Sort"
                    value={sort}
                    onChange={(event: SelectChangeEvent) => setSort(event.target.value as typeof sort)}
                    sx={{ height: 32 }}
                    startAdornment={<SortRoundedIcon sx={{ mr: 0.75, fontSize: 18, color: 'text.secondary' }} />}
                  >
                    <MenuItem value="createdAt">Created</MenuItem>
                    <MenuItem value="dueDate">Due date</MenuItem>
                    <MenuItem value="priority">Priority</MenuItem>
                    <MenuItem value="title">Title</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="outlined" color="inherit" onClick={() => setDirection(direction === 'asc' ? 'desc' : 'asc')} sx={{ height: 32 }}>
                  {direction === 'asc' ? 'Ascending' : 'Descending'}
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box sx={{ p: 2 }}>
              {error && <Alert severity="error" role="alert" sx={{ mb: 1.5 }}>{error}</Alert>}
              {notice && <Alert severity="success" role="status" sx={{ mb: 1.5 }}>{notice}</Alert>}
              {loading && <EmptyState icon={<CircularProgress size={22} />} title="Loading tasks…" />}
              {emptyState && <EmptyState title="No tasks match this view. Try clearing filters or creating a new task." />}

              {!loading && !emptyState && tasks.length > 0 && (
                <Box
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                  })}
                >
                  <Box
                    sx={(theme) => ({
                      display: { xs: 'none', md: 'grid' },
                      gridTemplateColumns: 'minmax(260px, 1fr) 118px 136px 84px',
                      alignItems: 'center',
                      px: 1.5,
                      py: 0.9,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      bgcolor: alpha(theme.palette.secondary.main, 0.035),
                    })}
                  >
                    {['Task', 'Priority', 'Due date', ''].map((heading) => (
                      <Typography key={heading || 'actions'} sx={{ fontSize: '0.68rem', fontWeight: 750, letterSpacing: 0.9, textTransform: 'uppercase', color: 'text.secondary', textAlign: heading ? 'left' : 'right' }}>
                        {heading}
                      </Typography>
                    ))}
                  </Box>

                  {tasks.map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isLast={index === tasks.length - 1}
                      onEdit={() => beginEdit(task)}
                      onDelete={() => void handleDelete(task)}
                      onToggle={() => void handleToggle(task)}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </SectionCard>

          <Stack spacing={2}>
            <NextUpCard nextTask={nextDueTask} today={today} />
          </Stack>
        </Box>
      </Stack>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={cancelEdit}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 430 }, p: 3, borderRadius: 0 } } }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{editingTask ? 'Edit task' : 'Create task'}</Typography>
            <Typography variant="body2" color="text.secondary">Capture the next action and context.</Typography>
          </Box>

          {error && <Alert severity="error" role="alert">{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <TextField
                label="Title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Write project README"
                required
                fullWidth
                size="small"
                slotProps={{ htmlInput: { 'aria-label': 'Title' } }}
              />
              <TextField
                label="Description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Add notes, acceptance criteria, or context"
                multiline
                minRows={4}
                fullWidth
                size="small"
                slotProps={{ htmlInput: { 'aria-label': 'Description' } }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label="Due date"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'aria-label': 'Due date' } }}
                />
                <FormControl fullWidth size="small">
                  <InputLabel id="priority-label">Priority</InputLabel>
                  <Select
                    labelId="priority-label"
                    label="Priority"
                    value={form.priority}
                    onChange={(event: SelectChangeEvent) => setForm({ ...form, priority: event.target.value as TaskPriority })}
                  >
                    {Object.entries(priorityLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                label="Tags"
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
                placeholder="docs, interview"
                fullWidth
                size="small"
                slotProps={{ htmlInput: { 'aria-label': 'Tags' } }}
              />
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Button type="submit" variant="contained" disabled={saving || !form.title.trim()} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddRoundedIcon />} sx={{ bgcolor: '#1e3a5f', '&:hover': { bgcolor: '#172d4a' } }}>
                  {saving ? 'Saving…' : editingTask ? 'Save changes' : 'Create task'}
                </Button>
                <Button type="button" variant="outlined" color="inherit" onClick={cancelEdit}>Cancel</Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Drawer>
    </Box>
  )
}
function SectionCard({ children, contentSx }: { children: ReactNode; contentSx?: object }) {
  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        borderRadius: 1.25,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.04)}`,
        overflow: 'hidden',
        ...(contentSx ?? { p: 2.5 }),
      })}
    >
      {children}
    </Paper>
  )
}


function parseDateOnly(dateOnly: string) {
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDateOnly(dateOnly: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parseDateOnly(dateOnly))
}

function formatDueDateLabel(dueDate: string) {
  const date = parseDateOnly(dueDate)
  return {
    month: date.toLocaleString(undefined, { month: 'short' }).toUpperCase(),
    day: date.getDate(),
  }
}

function getDueSoonSubtitle(task: TaskItem, today: string) {
  if (task.dueDate === today) return 'Due today'
  return `${priorityLabels[task.priority]} priority`
}

function NextUpCard({ nextTask, today }: { nextTask: TaskItem | null; today: string }) {
  return (
    <SectionCard>
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 750, letterSpacing: 1.6, textTransform: 'uppercase', color: 'text.secondary', mb: 1.5 }}>
        Next up
      </Typography>
      {!nextTask && (
        <Typography variant="body2" color="text.secondary">
          Nothing due soon.
        </Typography>
      )}
      {nextTask && (() => {
        const label = formatDueDateLabel(nextTask.dueDate ?? '')
        return (
          <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box
              sx={(theme) => ({
                width: 58,
                minWidth: 58,
                py: 0.55,
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: alpha(theme.palette.primary.main, 0.035),
                textAlign: 'center',
              })}
            >
              <Typography sx={{ fontSize: '0.68rem', lineHeight: 1, fontWeight: 800, color: 'primary.main' }}>{label.month}</Typography>
              <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.25, fontWeight: 800, color: 'text.primary' }}>{label.day}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 750, color: 'text.primary' }}>
                {nextTask.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {getDueSoonSubtitle(nextTask, today)}
              </Typography>
            </Box>
          </Stack>
        )
      })()}
    </SectionCard>
  )
}

function TabLabel({ label, count }: { label: string; count: number }) {
  return (
    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
      <span>{label}</span>
      <Box
        component="span"
        sx={(theme) => ({
          minWidth: 19,
          height: 18,
          px: 0.55,
          borderRadius: 9,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          color: 'text.secondary',
          fontSize: '0.68rem',
          fontWeight: 750,
          lineHeight: 1,
        })}
      >
        {count}
      </Box>
    </Stack>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: 'danger' }) {
  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        p: 2.1,
        minHeight: 96,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: `0 8px 22px ${alpha(theme.palette.common.black, 0.035)}`,
      })}
    >
      <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', mb: 1, fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.8rem', lineHeight: 1, fontWeight: 700, color: tone === 'danger' ? 'error.main' : 'text.primary' }}>{value}</Typography>
    </Paper>
  )
}

function TaskRow({ task, isLast, onToggle, onEdit, onDelete }: { task: TaskItem; isLast: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const isCompleted = task.status === 'completed'
  const isOverdue = task.status !== 'completed' && task.dueDate != null && task.dueDate < todayDateOnly()

  return (
    <Box
      component="article"
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1fr) 118px 136px 84px' },
        alignItems: { xs: 'stretch', md: 'center' },
        gap: { xs: 1.25, md: 0 },
        px: { xs: 1.4, md: 1.5 },
        py: { xs: 1.35, md: 1.25 },
        borderBottom: isLast ? 'none' : `1px solid ${theme.palette.divider}`,
        bgcolor: isCompleted ? alpha(theme.palette.success.main, 0.026) : 'background.paper',
        transition: 'background-color 140ms ease',
        '&:hover': {
          bgcolor: isCompleted ? alpha(theme.palette.success.main, 0.04) : alpha(theme.palette.primary.main, 0.018),
        },
      })}
    >
      <Stack direction="row" spacing={1.05} sx={{ alignItems: 'flex-start', minWidth: 0 }}>
        <Checkbox
          checked={isCompleted}
          onChange={onToggle}
          size="small"
          slotProps={{ input: { 'aria-label': `Mark ${task.title} complete` } }}
          sx={{ p: 0.35, mt: -0.15 }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 650, color: isCompleted ? 'text.secondary' : 'text.primary', textDecoration: isCompleted ? 'line-through' : 'none' }}>
              {task.title}
            </Typography>
            {isCompleted && <Chip icon={<CheckCircleRoundedIcon />} label="completed" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.66rem', fontWeight: 700 }} />}
          </Stack>
          {task.description && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.2 }}>{task.description}</Typography>}
          {task.tags.length > 0 && (
            <Stack direction="row" sx={{ mt: 0.65, flexWrap: 'wrap', gap: 0.5 }}>
              {task.tags.map((tag) => <Chip key={tag} label={tag} size="small" sx={(theme) => ({ height: 21, fontSize: '0.66rem', fontWeight: 650, color: 'secondary.dark', bgcolor: alpha(theme.palette.secondary.main, 0.08) })} />)}
            </Stack>
          )}
        </Box>
      </Stack>

      <Box sx={{ display: { xs: 'flex', md: 'block' }, alignItems: 'center', gap: 0.75, pl: { xs: 3.6, md: 0 } }}>
        <Typography sx={{ display: { xs: 'block', md: 'none' }, minWidth: 62, fontSize: '0.68rem', fontWeight: 750, letterSpacing: 0.6, textTransform: 'uppercase', color: 'text.secondary' }}>
          Priority
        </Typography>
        <Chip icon={<FlagRoundedIcon />} label={priorityLabels[task.priority]} color={priorityColors[task.priority]} variant="outlined" size="small" sx={priorityChipSx(task.priority)} />
      </Box>

      <Box sx={{ display: { xs: 'flex', md: 'block' }, alignItems: 'center', gap: 0.75, pl: { xs: 3.6, md: 0 } }}>
        <Typography sx={{ display: { xs: 'block', md: 'none' }, minWidth: 62, fontSize: '0.68rem', fontWeight: 750, letterSpacing: 0.6, textTransform: 'uppercase', color: 'text.secondary' }}>
          Due
        </Typography>
        {task.dueDate ? (
          <Stack spacing={0.15} sx={{ alignItems: { xs: 'flex-start', md: 'flex-start' } }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Due {formatDateOnly(task.dueDate)}
            </Typography>
            {isOverdue && (
              <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.66rem', fontWeight: 750, lineHeight: 1.15 }}>
                Overdue
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">No due date</Typography>
        )}
      </Box>

      <Stack direction="row" spacing={0.25} sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' }, pl: { xs: 3.6, md: 0 } }}>
        <IconButton aria-label={`Edit task: ${task.title}`} size="small" onClick={onEdit} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) } }}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label={`Delete task: ${task.title}`} size="small" onClick={onDelete} sx={{ color: 'error.main', '&:hover': { bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) } }}>
          <DeleteOutlineRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  )
}

function EmptyState({ title, icon }: { title: string; icon?: ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        p: 3,
        minHeight: 130,
        borderRadius: 2.5,
        border: `1px dashed ${alpha(theme.palette.text.primary, 0.14)}`,
        bgcolor: alpha(theme.palette.primary.main, 0.025),
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
      })}
    >
      <Stack spacing={1} sx={{ alignItems: 'center' }}>
        {icon}
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{title}</Typography>
      </Stack>
    </Paper>
  )
}

export default App

