
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  Check,
  Circle,
  Clock3,
  FolderKanban,
  GripVertical,
  LoaderCircle,
  Plus,
  RefreshCw,
} from 'lucide-react'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import DashboardLayout from '../layouts/DashboardLayout'
import { useWorkspace } from '../context/useWorkspace'
import { getWorkspaceMembers } from '../api/workspaces'
import { getTasks, updateTask } from '../api/tasks'

import './KanbanBoard.css'

const PAGE_SIZE = 10

const COLUMNS = [
  {
    id: 'todo',
    title: 'To Do',
    description: 'Ready to be started',
    icon: Circle,
    className: 'todo',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    description: 'Currently being worked on',
    icon: Clock3,
    className: 'progress',
  },
  {
    id: 'done',
    title: 'Done',
    description: 'Completed work',
    icon: Check,
    className: 'done',
  },
]

function getRequestError(error, fallback) {
  const detail = error.response?.data?.detail

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(' ')
  }

  if (typeof detail === 'string') {
    return detail
  }

  if (error.response?.status === 403) {
    return 'You do not have permission to perform this action.'
  }

  if (error.response?.status === 404) {
    return 'The requested workspace or task could not be found.'
  }

  if (error.response?.status === 429) {
    return 'Too many requests. Please try again later.'
  }

  return fallback
}

function formatDueDate(value) {
  if (!value) return null

  const datePart = String(value).split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)

  if (!year || !month || !day) return null

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function getMemberName(task, members) {
  if (!task.assigned_to_id) return 'Unassigned'

  const member = members.find((item) => {
    const memberId =
      item.user_id ??
      item.user?.id ??
      item.id

    return String(memberId) === String(task.assigned_to_id)
  })

  return (
    member?.user?.full_name ||
    member?.full_name ||
    member?.name ||
    member?.email ||
    `Member #${task.assigned_to_id}`
  )
}

function SortableTaskCard({ task, members, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled,
  })

  const dueDate = formatDueDate(task.due_date)
  const assigneeName = getMemberName(task, members)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`kanban-card ${
        isDragging ? 'kanban-card--dragging' : ''
      }`}
    >
      <div className="kanban-card__top">
        <span
          className={`kanban-card__priority kanban-card__priority--${
            task.priority || 'medium'
          }`}
        >
          {task.priority || 'medium'}
        </span>

        <button
          type="button"
          className="kanban-card__drag"
          aria-label={`Drag ${task.title}`}
          title="Drag to change task status"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={17} />
        </button>
      </div>

      <Link
        to={`/tasks/${task.id}`}
        className="kanban-card__title"
      >
        {task.title}
      </Link>

      {task.description && (
        <p className="kanban-card__description">
          {task.description}
        </p>
      )}

      <div className="kanban-card__footer">
        <span
          className="kanban-card__assignee"
          title={assigneeName}
        >
          <span className="kanban-card__avatar">
            {assigneeName.charAt(0).toUpperCase()}
          </span>
          <span className="kanban-card__assignee-name">
            {assigneeName}
          </span>
        </span>

        {dueDate && (
          <span className="kanban-card__due-date">
            <CalendarDays size={13} />
            {dueDate}
          </span>
        )}
      </div>
    </article>
  )
}

function BoardColumn({
  column,
  tasks,
  members,
  isUpdating,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const ColumnIcon = column.icon

  return (
    <section className={`kanban-column kanban-column--${column.className}`}>
      <div className="kanban-column__heading">
        <div className="kanban-column__title-group">
          <span className="kanban-column__icon">
            <ColumnIcon size={17} />
          </span>

          <div>
            <h2>{column.title}</h2>
            <p>{column.description}</p>
          </div>
        </div>

        <span className="kanban-column__count">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`kanban-column__dropzone ${
          isOver ? 'kanban-column__dropzone--over' : ''
        }`}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                members={members}
                disabled={isUpdating}
              />
            ))
          ) : (
            <div className="kanban-column__empty">
              <FolderKanban size={20} />
              <span>Drop tasks here</span>
            </div>
          )}
        </SortableContext>
      </div>
    </section>
  )
}

export default function KanbanBoard() {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])

  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [memberError, setMemberError] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [isUpdatingTaskId, setIsUpdatingTaskId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const loadTasks = useCallback(async () => {
    if (!workspaceId) return

    setIsLoading(true)
    setLoadError('')
    setUpdateError('')

    try {
      let allTasks = []
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const response = await getTasks(workspaceId, {
          limit: PAGE_SIZE,
          offset,
          sort_by: 'created_at',
          sort_order: 'desc',
        })

        const pageItems = response.items || []

        allTasks = [...allTasks, ...pageItems]

        if (pageItems.length === 0) {
          break
        }

        offset += pageItems.length
        hasMore = Boolean(response.has_more)
      }

      setTasks(allTasks)
    } catch (error) {
      setTasks([])
      setLoadError(
        getRequestError(
          error,
          'Unable to load workspace tasks. Please try again.',
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  const loadMembers = useCallback(async () => {
    if (!workspaceId) return

    setMemberError('')

    try {
      const response = await getWorkspaceMembers(workspaceId)
      setMembers(Array.isArray(response) ? response : [])
    } catch (error) {
      setMembers([])
      setMemberError(
        getRequestError(error, 'Unable to load workspace members.'),
      )
    }
  }, [workspaceId])

  useEffect(() => {
    let cancelled = false

    async function fetchTasks() {
      if (!workspaceId) {
        setTasks([])
        setLoadError('')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadError('')
      setUpdateError('')

      try {
        let allTasks = []
        let offset = 0
        let hasMore = true

        while (hasMore) {
          const response = await getTasks(workspaceId, {
            limit: PAGE_SIZE,
            offset,
            sort_by: 'created_at',
            sort_order: 'desc',
          })

          if (cancelled) return

          const pageItems = response.items || []
          allTasks = [...allTasks, ...pageItems]

          if (pageItems.length === 0) break

          offset += pageItems.length
          hasMore = Boolean(response.has_more)
        }

        if (!cancelled) {
          setTasks(allTasks)
        }
      } catch (error) {
        if (!cancelled) {
          setTasks([])
          setLoadError(
            getRequestError(
              error,
              'Unable to load workspace tasks. Please try again.',
            ),
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchTasks()

    return () => {
      cancelled = true
    }
  }, [workspaceId, refreshKey])

  useEffect(() => {
    let cancelled = false

    async function fetchMembers() {
      if (!workspaceId) {
        setMembers([])
        setMemberError('')
        return
      }

      setMemberError('')

      try {
        const response = await getWorkspaceMembers(workspaceId)

        if (!cancelled) {
          setMembers(Array.isArray(response) ? response : [])
        }
      } catch (error) {
        if (!cancelled) {
          setMembers([])
          setMemberError(
            getRequestError(error, 'Unable to load workspace members.'),
          )
        }
      }
    }

    void fetchMembers()

    return () => {
      cancelled = true
    }
  }, [workspaceId])

  const tasksByStatus = useMemo(() => {
    return COLUMNS.reduce((result, column) => {
      result[column.id] = tasks.filter(
        (task) => task.status === column.id,
      )

      return result
    }, {})
  }, [tasks])

  const completedCount = tasksByStatus.done?.length || 0
  const inProgressCount = tasksByStatus.in_progress?.length || 0

  async function handleDragEnd(event) {
    const { active, over } = event

    if (!over || !workspaceId || isUpdatingTaskId !== null) {
      return
    }

    const task = tasks.find(
      (item) => String(item.id) === String(active.id),
    )

    if (!task) return

    const destinationStatus = COLUMNS.some(
      (column) => column.id === String(over.id),
    )
      ? String(over.id)
      : tasks.find(
          (item) => String(item.id) === String(over.id),
        )?.status

    if (!destinationStatus || destinationStatus === task.status) {
      return
    }

    const previousStatus = task.status

    setUpdateError('')
    setIsUpdatingTaskId(task.id)

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id
          ? { ...item, status: destinationStatus }
          : item,
      ),
    )

    try {
      const updatedTask = await updateTask(
        workspaceId,
        task.id,
        { status: destinationStatus },
      )

      if (updatedTask && typeof updatedTask === 'object') {
        setTasks((current) =>
          current.map((item) =>
            item.id === task.id
              ? { ...item, ...updatedTask }
              : item,
          ),
        )
      }
    } catch (error) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? { ...item, status: previousStatus }
            : item,
        ),
      )

      setUpdateError(
        getRequestError(
          error,
          'Unable to update the task status. Please try again.',
        ),
      )
    } finally {
      setIsUpdatingTaskId(null)
    }
  }

  const handleRefresh = useCallback(() => {
    setRefreshKey((current) => current + 1)
  }, [])

  return (
    <DashboardLayout>
      <div className="kanban-page">
        <section className="kanban-page__heading">
          <div>
            <p className="kanban-page__eyebrow">
              WORKSPACE MANAGEMENT
            </p>

            <h1 className="kanban-page__title">
              Kanban Board
            </h1>

            <p className="kanban-page__subtitle">
              Visualize task progress and keep your workspace organized.
            </p>

            {selectedWorkspace && (
              <p className="kanban-page__workspace">
                <FolderKanban size={14} />
                {selectedWorkspace.name}
              </p>
            )}
          </div>

          <div className="kanban-page__actions">
            <button
              type="button"
              className="kanban-page__refresh"
              onClick={handleRefresh}
              disabled={isLoading || !workspaceId}
            >
              <RefreshCw
                size={16}
                className={isLoading ? 'kanban-spin' : ''}
              />
              Refresh
            </button>

            <Link
              to="/tasks"
              className="kanban-page__create"
            >
              <Plus size={17} />
              Manage tasks
            </Link>
          </div>
        </section>

        {!selectedWorkspace ? (
          <section className="kanban-page__empty-state">
            <div className="kanban-page__empty-icon">
              <FolderKanban size={28} />
            </div>

            <h2>No workspace selected</h2>

            <p>
              Create or join a workspace to view its Kanban Board.
            </p>

            <Link to="/workspaces">
              Manage workspaces
            </Link>
          </section>
        ) : (
          <>
            <section className="kanban-summary">
              <div className="kanban-summary__item">
                <span>Total tasks</span>
                <strong>{tasks.length}</strong>
              </div>

              <div className="kanban-summary__item">
                <span>In progress</span>
                <strong>{inProgressCount}</strong>
              </div>

              <div className="kanban-summary__item">
                <span>Completed</span>
                <strong>{completedCount}</strong>
              </div>
            </section>

            {memberError && (
              <div className="kanban-message kanban-message--warning">
                <AlertCircle size={16} />
                <span>
                  {memberError} Assignee names may be unavailable.
                </span>
                <button type="button" onClick={loadMembers}>
                  Retry
                </button>
              </div>
            )}

            {loadError && (
              <div className="kanban-message kanban-message--error">
                <AlertCircle size={17} />
                <span>{loadError}</span>
                <button type="button" onClick={handleRefresh}>
                  Retry
                </button>
              </div>
            )}

            {updateError && (
              <div className="kanban-message kanban-message--error">
                <AlertCircle size={17} />
                <span>{updateError}</span>
              </div>
            )}

            {isLoading ? (
              <div className="kanban-loading">
                <LoaderCircle size={27} className="kanban-spin" />
                <p>Loading workspace tasks...</p>
              </div>
            ) : !loadError ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragEnd={handleDragEnd}
              >
                <div className="kanban-board">
                  {COLUMNS.map((column) => (
                    <BoardColumn
                      key={column.id}
                      column={column}
                      tasks={tasksByStatus[column.id] || []}
                      members={members}
                      isUpdating={isUpdatingTaskId !== null}
                    />
                  ))}
                </div>
              </DndContext>
            ) : null}

            {!isLoading && !loadError && tasks.length === 0 && (
              <div className="kanban-page__hint">
                <p>
                  Your board is ready. Create your first task to get started.
                </p>
                <Link to="/tasks">
                  <Plus size={15} />
                  Create your first task
                </Link>
              </div>
            )}

            {isUpdatingTaskId !== null && (
              <p className="kanban-page__saving">
                <LoaderCircle size={14} className="kanban-spin" />
                Saving task status...
              </p>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
