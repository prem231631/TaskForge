
import { useState } from 'react'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CirclePlus,
  LoaderCircle,
  Users,
  X,
} from 'lucide-react'

import DashboardLayout from '../layouts/DashboardLayout'
import { useWorkspace } from '../context/useWorkspace'

import './Workspaces.css'

export default function Workspaces() {
  const {
    workspaces,
    selectedWorkspace,
    selectWorkspace,
    createWorkspace,
    isLoading,
  } = useWorkspace()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const workspaceName = name.trim()
    const workspaceDescription = description.trim()

    if (workspaceName.length < 2) {
      setError('Workspace name must contain at least 2 characters.')
      return
    }

    if (workspaceName.length > 120) {
      setError('Workspace name cannot exceed 120 characters.')
      return
    }

    if (workspaceDescription.length > 500) {
      setError('Description cannot exceed 500 characters.')
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
      setSuccess(`"${newWorkspace.name}" was created successfully.`)
    } catch (requestError) {
      const status = requestError.response?.status

      if (status === 409) {
        setError('A workspace with this information already exists.')
      } else if (status === 429) {
        setError('Too many requests. Please try again later.')
      } else if (status === 422) {
        setError(
          requestError.response?.data?.detail?.[0]?.msg ||
            'Please check your workspace information.',
        )
      } else {
        setError(
          requestError.response?.data?.detail ||
            'Unable to create the workspace. Please try again.',
        )
      }
    } finally {
      setIsSubmitting(false)
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
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="What will this workspace be used for?"
                maxLength={500}
                rows={4}
              />

              <small className="workspaces-create__character-count">
                {description.length}/500 characters
              </small>
            </div>

            {error && (
              <div className="workspaces-create__message workspaces-create__message--error">
                <X size={17} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="workspaces-create__message workspaces-create__message--success">
                <Check size={17} />
                <span>{success}</span>
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
                  String(workspace.id) ===
                  String(selectedWorkspace?.id)

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
                        {workspace.role === 'owner'
                          ? 'Owner'
                          : 'Member'}
                      </span>

                      <button
                        type="button"
                        className="workspace-card__select"
                        onClick={() =>
                          selectWorkspace(workspace.id)
                        }
                        disabled={isSelected}
                      >
                        {isSelected ? 'Selected' : 'Switch workspace'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
