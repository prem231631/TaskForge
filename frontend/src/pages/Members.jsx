import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  Crown,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react'

import DashboardLayout from '../layouts/DashboardLayout'
import { useWorkspace } from '../context/useWorkspace'
import {
  addWorkspaceMember,
  getWorkspaceMembers,
  removeWorkspaceMember,
} from '../api/workspaces'

import './Members.css'

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

function getInitials(name) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  )
}

function formatJoinDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export default function Members() {
  const { selectedWorkspace } = useWorkspace()

  const workspaceId = selectedWorkspace?.id
  const isOwner = selectedWorkspace?.role === 'owner'

  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [email, setEmail] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const [memberToRemove, setMemberToRemove] = useState(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [removeError, setRemoveError] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadMembers() {
      if (!workspaceId) {
        setMembers([])
        setIsLoading(false)
        setLoadError('')
        return
      }

      setIsLoading(true)
      setLoadError('')
      setAddError('')
      setAddSuccess('')
      setMemberToRemove(null)
      setRemoveError('')

      try {
        const data = await getWorkspaceMembers(workspaceId)

        if (isActive) {
          setMembers(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        if (isActive) {
          setMembers([])
          setLoadError(
            getRequestError(error, 'Unable to load workspace members. Please try again.'),
          )
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadMembers()

    return () => {
      isActive = false
    }
  }, [workspaceId])

  async function handleAddMember(event) {
    event.preventDefault()

    if (!workspaceId || !isOwner || isAdding) {
      return
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setAddError('Enter the email address of an existing TaskForge user.')
      return
    }

    setAddError('')
    setAddSuccess('')
    setIsAdding(true)

    try {
      const newMember = await addWorkspaceMember(
        workspaceId,
        normalizedEmail,
      )

      setMembers((currentMembers) => {
        const alreadyExists = currentMembers.some(
          (member) => member.user_id === newMember.user_id,
        )

        if (alreadyExists) {
          return currentMembers
        }

        return [...currentMembers, newMember]
      })

      setEmail('')
      setAddSuccess(`${newMember.full_name} was added to this workspace.`)
    } catch (error) {
      setAddError(
        getRequestError(
          error,
          'Unable to add this member. Check the email address and try again.',
        ),
      )
    } finally {
      setIsAdding(false)
    }
  }

  function openRemoveConfirmation(member) {
    if (!isOwner || member.role === 'owner') {
      return
    }

    setMemberToRemove(member)
    setRemoveError('')
    setAddSuccess('')
  }

  function closeRemoveConfirmation() {
    if (isRemoving) {
      return
    }

    setMemberToRemove(null)
    setRemoveError('')
  }

  async function confirmRemoveMember() {
    if (
      !workspaceId ||
      !memberToRemove ||
      !isOwner ||
      isRemoving
    ) {
      return
    }

    setIsRemoving(true)
    setRemoveError('')

    try {
      await removeWorkspaceMember(
        workspaceId,
        memberToRemove.user_id,
      )

      setMembers((currentMembers) =>
        currentMembers.filter(
          (member) => member.user_id !== memberToRemove.user_id,
        ),
      )

      setAddSuccess(`${memberToRemove.full_name} was removed from this workspace.`)
      setMemberToRemove(null)
    } catch (error) {
      setRemoveError(
        getRequestError(
          error,
          'Unable to remove this member. Please try again.',
        ),
      )
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="members-page">
        <section className="members-page__heading">
          <div>
            <p className="members-page__eyebrow">
              TEAM MANAGEMENT
            </p>

            <h1 className="members-page__title">
              Workspace Members
            </h1>

            <p className="members-page__subtitle">
              View and manage the people who collaborate in your workspace.
            </p>
          </div>

          {workspaceId && (
            <div className="members-page__count">
              <Users size={17} />
              <span>
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          )}
        </section>

        {!selectedWorkspace ? (
          <section className="members-empty">
            <div className="members-empty__icon">
              <Users size={25} />
            </div>

            <h2>No workspace selected</h2>

            <p>
              Select or create a workspace before viewing its members.
            </p>

            <a href="/workspaces" className="members-empty__link">
              Manage workspaces
            </a>
          </section>
        ) : (
          <>
            <section className="members-workspace">
              <div className="members-workspace__avatar">
                {getInitials(selectedWorkspace.name)}
              </div>

              <div className="members-workspace__details">
                <span>SELECTED WORKSPACE</span>
                <h2>{selectedWorkspace.name}</h2>
                <p>
                  {selectedWorkspace.description ||
                    'No workspace description provided.'}
                </p>
              </div>

              <div
                className={`members-workspace__role ${
                  isOwner
                    ? 'members-workspace__role--owner'
                    : ''
                }`}
              >
                {isOwner ? (
                  <Crown size={14} />
                ) : (
                  <ShieldCheck size={14} />
                )}
                {isOwner ? 'Owner' : 'Member'}
              </div>
            </section>

            {isOwner && (
              <section className="members-add">
                <div className="members-section-heading">
                  <div className="members-section-heading__icon">
                    <UserPlus size={20} />
                  </div>

                  <div>
                    <h2>Add a team member</h2>
                    <p>
                      Add someone who already has a TaskForge account.
                    </p>
                  </div>
                </div>

                <form
                  className="members-add__form"
                  onSubmit={handleAddMember}
                >
                  <div className="members-add__field">
                    <label htmlFor="member-email">
                      Email address
                    </label>

                    <div className="members-add__input-wrap">
                      <Mail size={17} />

                      <input
                        id="member-email"
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value)
                          setAddError('')
                          setAddSuccess('')
                        }}
                        placeholder="name@example.com"
                        autoComplete="email"
                        maxLength={255}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="members-add__submit"
                    disabled={isAdding || isLoading}
                  >
                    {isAdding ? (
                      <>
                        <LoaderCircle
                          size={16}
                          className="members-spin"
                        />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        Add member
                      </>
                    )}
                  </button>
                </form>

                <p className="members-add__hint">
                  Only existing, active TaskForge users can be added.
                </p>

                {addError && (
                  <div className="members-message members-message--error">
                    <AlertCircle size={16} />
                    <span>{addError}</span>
                  </div>
                )}

                {addSuccess && (
                  <div className="members-message members-message--success">
                    <Check size={16} />
                    <span>{addSuccess}</span>
                  </div>
                )}
              </section>
            )}

            {!isOwner && addSuccess && (
              <div className="members-message members-message--success">
                <Check size={16} />
                <span>{addSuccess}</span>
              </div>
            )}

            <section className="members-list">
              <div className="members-list__heading">
                <div>
                  <h2>People in this workspace</h2>
                  <p>
                    Everyone who currently has access to this workspace.
                  </p>
                </div>

                <span className="members-list__total">
                  {members.length}
                </span>
              </div>

              {loadError && (
                <div className="members-message members-message--error">
                  <AlertCircle size={16} />
                  <span>{loadError}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoadError('')
                      setIsLoading(true)
                      getWorkspaceMembers(workspaceId)
                        .then((data) => {
                          setMembers(Array.isArray(data) ? data : [])
                        })
                        .catch((error) => {
                          setLoadError(
                            getRequestError(
                              error,
                              'Unable to load workspace members. Please try again.',
                            ),
                          )
                        })
                        .finally(() => setIsLoading(false))
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="members-list__state">
                  <LoaderCircle
                    size={22}
                    className="members-spin"
                  />
                  <span>Loading workspace members...</span>
                </div>
              ) : loadError ? null : members.length === 0 ? (
                <div className="members-list__state members-list__state--empty">
                  <div className="members-list__empty-icon">
                    <Users size={24} />
                  </div>

                  <h3>No members found</h3>
                  <p>
                    Members of this workspace will appear here.
                  </p>
                </div>
              ) : (
                <div className="members-table">
                  <div className="members-table__header">
                    <span>MEMBER</span>
                    <span>ROLE</span>
                    <span>JOINED</span>
                    {isOwner && <span>ACTION</span>}
                  </div>

                  {members.map((member) => {
                    const isWorkspaceOwner = member.role === 'owner'

                    return (
                      <article
                        className="members-table__row"
                        key={member.user_id}
                      >
                        <div className="members-table__person">
                          <div
                            className={`members-table__avatar ${
                              isWorkspaceOwner
                                ? 'members-table__avatar--owner'
                                : ''
                            }`}
                          >
                            {getInitials(member.full_name)}
                          </div>

                          <div className="members-table__identity">
                            <strong>{member.full_name}</strong>
                            <span>{member.email}</span>
                          </div>
                        </div>

                        <div className="members-table__role">
                          <span
                            className={`members-role ${
                              isWorkspaceOwner
                                ? 'members-role--owner'
                                : 'members-role--member'
                            }`}
                          >
                            {isWorkspaceOwner ? (
                              <Crown size={13} />
                            ) : (
                              <ShieldCheck size={13} />
                            )}
                            {isWorkspaceOwner ? 'Owner' : 'Member'}
                          </span>
                        </div>

                        <div className="members-table__date">
                          {formatJoinDate(member.joined_at)}
                        </div>

                        {isOwner && (
                          <div className="members-table__action">
                            {!isWorkspaceOwner && (
                              <button
                                type="button"
                                className="members-table__remove"
                                onClick={() =>
                                  openRemoveConfirmation(member)
                                }
                                aria-label={`Remove ${member.full_name}`}
                              >
                                <UserX size={15} />
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {memberToRemove && (
          <div
            className="members-dialog-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeRemoveConfirmation()
              }
            }}
          >
            <section
              className="members-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="remove-member-title"
              aria-describedby="remove-member-description"
            >
              <div className="members-dialog__icon">
                <UserX size={22} />
              </div>

              <h2 id="remove-member-title">
                Remove workspace member?
              </h2>

              <p id="remove-member-description">
                Remove <strong>{memberToRemove.full_name}</strong> from{' '}
                <strong>{selectedWorkspace.name}</strong>? They will lose
                access to this workspace.
              </p>

              {removeError && (
                <div className="members-message members-message--error">
                  <AlertCircle size={16} />
                  <span>{removeError}</span>
                </div>
              )}

              <div className="members-dialog__actions">
                <button
                  type="button"
                  className="members-dialog__cancel"
                  onClick={closeRemoveConfirmation}
                  disabled={isRemoving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="members-dialog__confirm"
                  onClick={confirmRemoveMember}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <>
                      <LoaderCircle
                        size={15}
                        className="members-spin"
                      />
                      Removing...
                    </>
                  ) : (
                    <>
                      <UserX size={15} />
                      Remove member
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