
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  ClipboardList,
  Filter,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'

import DashboardLayout from '../layouts/DashboardLayout'
import TaskItem from '../components/TaskItem'
import TaskForm from '../components/TaskForm'
import { useWorkspace } from '../context/useWorkspace'
import { getWorkspaceMembers } from '../api/workspaces'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../api/tasks'

import './Tasks.css'

const PAGE_SIZE = 10

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

export default function Tasks() {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])

  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [memberError, setMemberError] = useState('')

  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(0)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [taskToDelete, setTaskToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const loadTasks = useCallback(async () => {
    if (!workspaceId) {
      setTasks([])
      setTotal(0)
      setHasMore(false)
      setIsLoading(false)
      setLoadError('')
      return
    }

    setIsLoading(true)
    setLoadError('')

    try {
      const response = await getTasks(workspaceId, {
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })

      setTasks(response.items || [])
      setTotal(response.total || 0)
      setHasMore(Boolean(response.has_more))
    } catch (error) {
      setTasks([])
      setTotal(0)
      setHasMore(false)
      setLoadError(
        getRequestError(error, 'Unable to load tasks. Please try again.'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [
    workspaceId,
    statusFilter,
    priorityFilter,
    sortBy,
    sortOrder,
    page,
  ])

  const loadMembers = useCallback(async () => {
    if (!workspaceId) {
      setMembers([])
      setMemberError('')
      return
    }

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
    let isActive = true

    const timer = setTimeout(() => {
      if (isActive) {
        loadTasks()
      }
    }, 0)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [loadTasks])

  useEffect(() => {
    let isActive = true

    const timer = setTimeout(() => {
      if (isActive) {
        loadMembers()
      }
    }, 0)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [loadMembers])

  function openCreateForm() {
    setEditingTask(null)
    setFormError('')
    setIsFormOpen(true)
  }

  function openEditForm(task) {
    setEditingTask(task)
    setFormError('')
    setIsFormOpen(true)
  }

  function closeForm() {
    if (isSaving) return

    setIsFormOpen(false)
    setEditingTask(null)
    setFormError('')
  }

  async function handleSubmit(payload) {
    if (!workspaceId || isSaving) return

    setIsSaving(true)
    setFormError('')

    try {
      if (editingTask) {
        await updateTask(workspaceId, editingTask.id, payload)
      } else {
        await createTask(workspaceId, payload)
      }

      setIsFormOpen(false)
      setEditingTask(null)

      if (!editingTask && page !== 0) {
        setPage(0)
      } else {
        await loadTasks()
      }
    } catch (error) {
      setFormError(
        getRequestError(
          error,
          `Unable to ${editingTask ? 'update' : 'create'} this task. Please try again.`,
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  function openDeleteConfirmation(task) {
    setTaskToDelete(task)
    setDeleteError('')
  }

  function closeDeleteConfirmation() {
    if (isDeleting) return

    setTaskToDelete(null)
    setDeleteError('')
  }

  async function confirmDelete() {
    if (!workspaceId || !taskToDelete || isDeleting) return

    setIsDeleting(true)
    setDeleteError('')

    try {
      await deleteTask(workspaceId, taskToDelete.id)

      const remainingOnPage = tasks.length - 1

      setTaskToDelete(null)

      if (remainingOnPage === 0 && page > 0) {
        setPage((current) => current - 1)
      } else {
        await loadTasks()
      }
    } catch (error) {
      setDeleteError(
        getRequestError(error, 'Unable to delete this task. Please try again.'),
      )
    } finally {
      setIsDeleting(false)
    }
  }

  function handleFilterChange(setter, value) {
    setter(value)
    setPage(0)
  }

  function toggleSortOrder() {
    setSortOrder((current) => current === 'asc' ? 'desc' : 'asc')
    setPage(0)
  }

  const completedOnPage = tasks.filter(
    (task) => task.status === 'done',
  ).length

  const pageCount = Math.ceil(total / PAGE_SIZE)
  const firstItem = total === 0 ? 0 : page * PAGE_SIZE + 1
  const lastItem = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <DashboardLayout>
      <div className="tasks-page">
        <section className="tasks-page__heading">
          <div>
            <p className="tasks-page__eyebrow">
              TASK MANAGEMENT
            </p>

            <h1 className="tasks-page__title">
              My Tasks
            </h1>

            <p className="tasks-page__subtitle">
              Organize, track, and manage work across your workspace.
            </p>
          </div>

          {workspaceId && (
            <button
              type="button"
              className="tasks-page__create"
              onClick={openCreateForm}
            >
              <Plus size={17} />
              Create task
            </button>
          )}
        </section>

        {!selectedWorkspace ? (
          <section className="tasks-state tasks-state--empty">
            <div className="tasks-state__icon">
              <ClipboardList size={26} />
            </div>

            <h2>No workspace selected</h2>

            <p>
              Select or create a workspace before managing tasks.
            </p>

            <Link to="/workspaces" className="tasks-state__link">
              Manage workspaces
            </Link>
          </section>
        ) : (
          <>
            <section className="tasks-overview">
              <div className="tasks-overview__workspace">
                <span>SELECTED WORKSPACE</span>
                <h2>{selectedWorkspace.name}</h2>
                <p>
                  {selectedWorkspace.description ||
                    'Manage tasks for this workspace.'}
                </p>
              </div>

              <div className="tasks-overview__metrics">
                <div>
                  <span>Total tasks</span>
                  <strong>{total}</strong>
                </div>

                <div>
                  <span>Completed on page</span>
                  <strong>{completedOnPage}</strong>
                </div>
              </div>
            </section>

            <section className="tasks-toolbar">
              <div className="tasks-toolbar__heading">
                <div>
                  <h2>All tasks</h2>
                  <p>
                    Tasks belonging to your selected workspace.
                  </p>
                </div>

                <span className="tasks-toolbar__count">
                  {total} {total === 1 ? 'task' : 'tasks'}
                </span>
              </div>

              <div className="tasks-filters">
                <div className="tasks-filters__field">
                  <label htmlFor="tasks-status-filter">
                    <Filter size={14} />
                    Status
                  </label>

                  <select
                    id="tasks-status-filter"
                    value={statusFilter}
                    onChange={(event) =>
                      handleFilterChange(setStatusFilter, event.target.value)
                    }
                  >
                    <option value="">All statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed</option>
                  </select>
                </div>

                <div className="tasks-filters__field">
                  <label htmlFor="tasks-priority-filter">
                    Priority
                  </label>

                  <select
                    id="tasks-priority-filter"
                    value={priorityFilter}
                    onChange={(event) =>
                      handleFilterChange(setPriorityFilter, event.target.value)
                    }
                  >
                    <option value="">All priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="tasks-filters__field">
                  <label htmlFor="tasks-sort">
                    <SlidersHorizontal size={14} />
                    Sort by
                  </label>

                  <select
                    id="tasks-sort"
                    value={sortBy}
                    onChange={(event) =>
                      handleFilterChange(setSortBy, event.target.value)
                    }
                  >
                    <option value="created_at">Date created</option>
                    <option value="due_date">Due date</option>
                    <option value="title">Title</option>
                    <option value="priority">Priority</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="tasks-filters__sort-order"
                  onClick={toggleSortOrder}
                  aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {sortOrder === 'asc' ? (
                    <ArrowUpWideNarrow size={17} />
                  ) : (
                    <ArrowDownWideNarrow size={17} />
                  )}
                  {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </button>

                <button
                  type="button"
                  className="tasks-filters__reset"
                  onClick={() => {
                    setStatusFilter('')
                    setPriorityFilter('')
                    setSortBy('created_at')
                    setSortOrder('desc')
                    setPage(0)
                  }}
                >
                  <RefreshCw size={14} />
                  Reset
                </button>
              </div>
            </section>

            {memberError && (
              <div className="tasks-message tasks-message--error">
                <AlertCircle size={16} />
                <span>{memberError} Task assignment may be unavailable.</span>
                <button type="button" onClick={loadMembers}>
                  Retry
                </button>
              </div>
            )}

            {loadError && (
              <div className="tasks-message tasks-message--error">
                <AlertCircle size={17} />
                <span>{loadError}</span>
                <button type="button" onClick={loadTasks}>
                  Retry
                </button>
              </div>
            )}

            <section className="tasks-list">
              {isLoading ? (
                <div className="tasks-state">
                  <LoaderCircle
                    size={25}
                    className="tasks-spin"
                  />
                  <p>Loading tasks...</p>
                </div>
              ) : loadError ? null : tasks.length === 0 ? (
                <div className="tasks-state tasks-state--empty">
                  <div className="tasks-state__icon">
                    <Search size={25} />
                  </div>

                  <h2>
                    {statusFilter || priorityFilter
                      ? 'No matching tasks'
                      : 'No tasks yet'}
                  </h2>

                  <p>
                    {statusFilter || priorityFilter
                      ? 'Try changing your filters to find tasks.'
                      : 'Create your first task to start organizing your workspace.'}
                  </p>

                  {statusFilter || priorityFilter ? (
                    <button
                      type="button"
                      className="tasks-state__link"
                      onClick={() => {
                        setStatusFilter('')
                        setPriorityFilter('')
                        setPage(0)
                      }}
                    >
                      Clear filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="tasks-state__link"
                      onClick={openCreateForm}
                    >
                      <Plus size={15} />
                      Create your first task
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="tasks-list__header">
                    <span>TASK DETAILS</span>
                    <span>PRIORITY</span>
                    <span>DUE DATE</span>
                    <span>STATUS</span>
                    <span>ACTIONS</span>
                  </div>

                  <div className="tasks-list__items">
                    {tasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        members={members}
                        onEdit={openEditForm}
                        onDelete={openDeleteConfirmation}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>

            {!isLoading && !loadError && total > 0 && (
              <section className="tasks-pagination">
                <p>
                  Showing <strong>{firstItem}-{lastItem}</strong> of{' '}
                  <strong>{total}</strong> tasks
                </p>

                <div className="tasks-pagination__actions">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Previous
                  </button>

                  <span>
                    Page {page + 1}{pageCount > 0 ? ` of ${pageCount}` : ''}
                  </span>

                  <button
                    type="button"
                    disabled={!hasMore}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {isFormOpen && (
          <div
            className="tasks-modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeForm()
              }
            }}
          >
            <section
              className="tasks-modal"
              role="dialog"
              aria-modal="true"
              aria-label={editingTask ? 'Edit task' : 'Create task'}
            >
              <TaskForm
                key={editingTask?.id ?? 'new-task'}
                members={members}
                initialTask={editingTask}
                onSubmit={handleSubmit}
                onCancel={closeForm}
                isSaving={isSaving}
                error={formError}
              />
            </section>
          </div>
        )}

        {taskToDelete && (
          <div
            className="tasks-modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeDeleteConfirmation()
              }
            }}
          >
            <section
              className="tasks-delete-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="tasks-delete-title"
              aria-describedby="tasks-delete-description"
            >
              <div className="tasks-delete-dialog__icon">
                <X size={22} />
              </div>

              <h2 id="tasks-delete-title">
                Delete this task?
              </h2>

              <p id="tasks-delete-description">
                Are you sure you want to delete{' '}
                <strong>{taskToDelete.title}</strong>? This action cannot be undone.
              </p>

              {deleteError && (
                <div className="tasks-message tasks-message--error">
                  <AlertCircle size={16} />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="tasks-delete-dialog__actions">
                <button
                  type="button"
                  onClick={closeDeleteConfirmation}
                  disabled={isDeleting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <LoaderCircle size={15} className="tasks-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete task'
                  )}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
