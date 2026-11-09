
import { useState } from 'react'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CirclePlus,
  LoaderCircle,
  Pencil,
  Trash2,
  Users,
  X,
} from 'lucide-react'

import DashboardLayout from '../layouts/DashboardLayout'
import { useWorkspace } from '../context/useWorkspace'

import './Workspaces.css'
import './WorkspaceManagement.css'

function getRequestError(error, fallback) {
  const detail = error.response?.data?.detail

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(' ')
  }

  if (typeof detail === 'string') {
    return detail
  }

  if (error.response?.status === 429) {
    return 'Too many requests. Please try again later.'
  }

  if (error.response?.status === 403) {
    return 'You do not have permission to perform this action.'
  }

  return fallback
}

export default function Workspaces() {
  const {
    workspaces,
    selectedWorkspace,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    isLoading,
  } = useWorkspace()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const [editingWorkspaceId, setEditingWorkspaceId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  const [workspaceToDelete, setWorkspaceToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    const workspaceName = name.trim()
    const workspaceDescription = description.trim()

    if (workspaceName.length < 2) {
      setCreateError('Workspace name must contain at least 2 characters.')
      return
    }

    if (workspaceName.length > 120) {
      setCreateError('Workspace name cannot exceed 120 characters.')
      return
    }

    if (workspaceDescription.length > 500) {
      setCreateError('Description cannot exceed 500 characters.')
      return
    }

    setIsSubmitting(true)

    try {
      const newWorkspace = await createWorkspace({
        name: workspaceName,
        description: workspaceDescription || null,
      })

      setName('')
      setDescription('')
      setCreateSuccess(`"${newWorkspace.name}" was created successfully.`)
    } catch (error) {
      setCreateError(
        getRequestError(error, 'Unable to create the workspace. Please try again.'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function startEditing(workspace) {
    setEditingWorkspaceId(workspace.id)
    setEditName(workspace.name)
    setEditDescription(workspace.description || '')
    setEditError('')
    setEditSuccess('')
    setDeleteError('')
    setWorkspaceToDelete(null)
  }

  function cancelEditing() {
    setEditingWorkspaceId(null)
    setEditName('')
    setEditDescription('')
    setEditError('')
  }

  async function handleUpdate(event, workspaceId) {
    event.preventDefault()
    setEditError('')
    setEditSuccess('')

    const updatedName = editName.trim()
    const updatedDescription = editDescription.trim()

    if (updatedName.length < 2 || updatedName.length > 120) {
      setEditError('Workspace name must contain between 2 and 120 characters.')
      return
    }

    if (updatedDescription.length > 500) {
      setEditError('Description cannot exceed 500 characters.')
      return
    }

    setIsSavingEdit(true)

    try {
      await updateWorkspace(workspaceId, {
        name: updatedName,
        description: updatedDescription || null,
      })

      setEditingWorkspaceId(null)
      setEditName('')
      setEditDescription('')
      setEditSuccess('Workspace updated successfully.')
    } catch (error) {
      setEditError(
        getRequestError(error, 'Unable to update the workspace. Please try again.'),
      )
    } finally {
      setIsSavingEdit(false)
    }
  }

  function openDeleteConfirmation(workspace) {
    setWorkspaceToDelete(workspace)
    setDeleteError('')
    setEditingWorkspaceId(null)
    setEditError('')
  }

  function closeDeleteConfirmation() {
    if (isDeleting) {
      return
    }

    setWorkspaceToDelete(null)
    setDeleteError('')
  }

  async function confirmDeleteWorkspace() {
    if (!workspaceToDelete || isDeleting) {
      return
    }

    setIsDeleting(true)
    setDeleteError('')

    try {
      await deleteWorkspace(workspaceToDelete.id)
      setWorkspaceToDelete(null)
      setEditSuccess(`"${workspaceToDelete.name}" was deleted successfully.`)
    } catch (error) {
      setDeleteError(
        getRequestError(error, 'Unable to delete the workspace. Please try again.'),
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="workspaces-page">
        <section className="workspaces-page__heading">
          <div>
            <p className="workspaces-page__eyebrow">
              WORKSPACE MANAGEMENT
            </p>

            <h1 className="workspaces-page__title">
              Your Workspaces
            </h1>

            <p className="workspaces-page__subtitle">
              Create and manage the spaces where your team works together.
            </p>
          </div>

          <div className="workspaces-page__count">
            <BriefcaseBusiness size={17} />
            <span>{workspaces.length} workspaces</span>
          </div>
        </section>

        <section className="workspaces-create">
          <div className="workspaces-create__heading">
            <div className="workspaces-create__icon">
              <CirclePlus size={22} />
            </div>

            <div>
              <h2>Create a workspace</h2>
              <p>
                Start a new space for your projects, tasks, and team.
              </p>
            </div>
          </div>

          <form
            className="workspaces-create__form"
            onSubmit={handleSubmit}
          >
            <div className="workspaces-create__field">
              <label htmlFor="workspace-name">
                Workspace name
                <span>*</span>
              </label>

              <input
                id="workspace-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Product Development"
                minLength={2}
                maxLength={120}
                required
                autoComplete="off"
              />

              <small>
                Choose a name that describes your team or project.
              </small>
            </div>

            <div className="workspaces-create__field">
              <label htmlFor="workspace-description">
                Description
                <span className="workspaces-create__optional">
                  Optional
                </span>
              </label>

              <textarea
                id="workspace-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What will this workspace be used for?"
                maxLength={500}
                rows={4}
              />

              <small className="workspaces-create__character-count">
                {description.length}/500 characters
              </small>
            </div>

            {createError && (
              <div className="workspaces-create__message workspaces-create__message--error">
                <X size={17} />
                <span>{createError}</span>
              </div>
            )}

            {createSuccess && (
              <div className="workspaces-create__message workspaces-create__message--success">
                <Check size={17} />
                <span>{createSuccess}</span>
              </div>
            )}

            <div className="workspaces-create__actions">
              <button
                type="submit"
                className="workspaces-create__submit"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle size={17} className="workspaces-spin" />
                    Creating workspace...
                  </>
                ) : (
                  <>
                    Create workspace
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="workspaces-list">
          <div className="workspaces-list__heading">
            <div>
              <h2>All workspaces</h2>
              <p>Workspaces you own or have joined.</p>
            </div>

            <span className="workspaces-list__total">
              {workspaces.length}
            </span>
          </div>

          {editSuccess && (
            <div className="workspaces-management__notice workspaces-management__notice--success">
              <Check size={16} />
              <span>{editSuccess}</span>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setEditSuccess('')}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="workspaces-list__loading">
              <LoaderCircle size={22} className="workspaces-spin" />
              <span>Loading workspaces...</span>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="workspaces-list__empty">
              <div className="workspaces-list__empty-icon">
                <BriefcaseBusiness size={25} />
              </div>

              <h3>No workspaces yet</h3>

              <p>
                Create your first workspace using the form above.
                Your workspace will appear here once created.
              </p>
            </div>
          ) : (
            <div className="workspaces-list__grid">
              {workspaces.map((workspace) => {
                const isSelected =
                  String(workspace.id) === String(selectedWorkspace?.id)

                const isOwner = workspace.role === 'owner'
                const isEditing =
                  String(editingWorkspaceId) === String(workspace.id)

                const initials = workspace.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((word) => word[0].toUpperCase())
                  .join('')

                return (
                  <article
                    key={workspace.id}
                    className={`workspace-card ${
                      isSelected ? 'workspace-card--selected' : ''
                    }`}
                  >
                    <div className="workspace-card__top">
                      <div className="workspace-card__avatar">
                        {initials || 'WS'}
                      </div>

                      {isSelected && (
                        <span className="workspace-card__selected">
                          <Check size={13} />
                          Active
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <form
                        className="workspace-management__edit-form"
                        onSubmit={(event) =>
                          handleUpdate(event, workspace.id)
                        }
                      >
                        <div className="workspaces-create__field">
                          <label htmlFor={`edit-name-${workspace.id}`}>
                            Workspace name
                          </label>

                          <input
                            id={`edit-name-${workspace.id}`}
                            type="text"
                            value={editName}
                            onChange={(event) =>
                              setEditName(event.target.value)
                            }
                            minLength={2}
                            maxLength={120}
                            required
                          />
                        </div>

                        <div className="workspaces-create__field">
                          <label htmlFor={`edit-description-${workspace.id}`}>
                            Description
                          </label>

                          <textarea
                            id={`edit-description-${workspace.id}`}
                            value={editDescription}
                            onChange={(event) =>
                              setEditDescription(event.target.value)
                            }
                            maxLength={500}
                            rows={3}
                          />

                          <small className="workspaces-create__character-count">
                            {editDescription.length}/500 characters
                          </small>
                        </div>

                        {editError && (
                          <div className="workspaces-create__message workspaces-create__message--error">
                            <X size={16} />
                            <span>{editError}</span>
                          </div>
                        )}

                        <div className="workspace-management__edit-actions">
                          <button
                            type="button"
                            className="workspace-management__cancel"
                            onClick={cancelEditing}
                            disabled={isSavingEdit}
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            className="workspace-management__save"
                            disabled={isSavingEdit}
                          >
                            {isSavingEdit ? (
                              <>
                                <LoaderCircle
                                  size={15}
                                  className="workspaces-spin"
                                />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Check size={15} />
                                Save changes
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h3 className="workspace-card__name">
                          {workspace.name}
                        </h3>

                        <p className="workspace-card__description">
                          {workspace.description ||
                            'No description provided.'}
                        </p>

                        <div className="workspace-card__footer">
                          <span className="workspace-card__role">
                            <Users size={14} />
                            {isOwner ? 'Owner' : 'Member'}
                          </span>

                          <button
                            type="button"
                            className="workspace-card__select"
                            onClick={() => selectWorkspace(workspace.id)}
                            disabled={isSelected}
                          >
                            {isSelected ? 'Selected' : 'Switch workspace'}
                          </button>
                        </div>

                        <div className="workspace-management__actions">
                          {isOwner ? (
                            <>
                              <button
                                type="button"
                                className="workspace-management__edit"
                                onClick={() => startEditing(workspace)}
                              >
                                <Pencil size={14} />
                                Edit
                              </button>

                              <button
                                type="button"
                                className="workspace-management__delete"
                                onClick={() =>
                                  openDeleteConfirmation(workspace)
                                }
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="workspace-management__member-note">
                              Only the workspace owner can manage this space.
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {workspaceToDelete && (
          <div
            className="workspace-management__overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeDeleteConfirmation()
              }
            }}
          >
            <section
              className="workspace-management__dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="workspace-delete-title"
              aria-describedby="workspace-delete-description"
            >
              <div className="workspace-management__dialog-icon">
                <Trash2 size={22} />
              </div>

              <h2 id="workspace-delete-title">
                Delete workspace?
              </h2>

              <p id="workspace-delete-description">
                You are about to delete{' '}
                <strong>{workspaceToDelete.name}</strong>. This action
                cannot be undone. Its workspace memberships will also
                be removed.
              </p>

              {deleteError && (
                <div className="workspaces-create__message workspaces-create__message--error">
                  <X size={16} />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="workspace-management__dialog-actions">
                <button
                  type="button"
                  className="workspace-management__cancel"
                  onClick={closeDeleteConfirmation}
                  disabled={isDeleting}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="workspace-management__confirm-delete"
                  onClick={confirmDeleteWorkspace}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <LoaderCircle
                        size={15}
                        className="workspaces-spin"
                      />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      Delete workspace
                    </>
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
