
import { useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  ShieldCheck,
  UserRound,
  AlertCircle,
  Save,
} from 'lucide-react'

import DashboardLayout from '../layouts/DashboardLayout'
import { useAuth } from '../context/useAuth'
import './Profile.css'

function getInitials(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'TF'
}

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export default function Profile() {
  const { user, updateProfile } = useAuth()

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const hasChanges = fullName.trim() !== (user?.full_name || '')

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedName = fullName.trim()

    if (trimmedName.length < 2) {
      setError('Your name must contain at least 2 characters.')
      setSuccess('')
      return
    }

    if (!hasChanges) return

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      await updateProfile({
        full_name: trimmedName,
      })

      setFullName(trimmedName)
      setSuccess('Your profile has been updated successfully.')
    } catch (requestError) {
      const message = requestError.response?.data?.detail

      setError(
        typeof message === 'string'
          ? message
          : 'Unable to update your profile. Please try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="profile-page">
        <div className="profile-page__heading">
          <div>
            <span className="profile-page__eyebrow">
              ACCOUNT SETTINGS
            </span>

            <h1>My Profile</h1>

            <p>
              Manage your personal information and account details.
            </p>
          </div>
        </div>

        <section className="profile-overview">
          <div className="profile-overview__avatar">
            {getInitials(user?.full_name)}
          </div>

          <div className="profile-overview__identity">
            <h2>{user?.full_name || 'TaskForge User'}</h2>

            <p>{user?.email}</p>

            <div className="profile-overview__badges">
              <span
                className={
                  user?.is_active
                    ? 'profile-badge profile-badge--success'
                    : 'profile-badge profile-badge--danger'
                }
              >
                <span className="profile-badge__dot" />
                {user?.is_active ? 'Active account' : 'Inactive account'}
              </span>

              <span
                className={
                  user?.is_verified
                    ? 'profile-badge profile-badge--success'
                    : 'profile-badge profile-badge--warning'
                }
              >
                <CheckCircle2 size={13} />
                {user?.is_verified ? 'Verified email' : 'Email not verified'}
              </span>
            </div>
          </div>
        </section>

        <div className="profile-grid">
          <section className="profile-card profile-card--personal">
            <div className="profile-card__heading">
              <div className="profile-card__icon">
                <UserRound size={19} />
              </div>

              <div>
                <h2>Personal Information</h2>
                <p>Update your personal details.</p>
              </div>
            </div>

            <form
              className="profile-form"
              onSubmit={handleSubmit}
            >
              <div className="profile-form__field">
                <label htmlFor="profile-full-name">
                  Full name
                </label>

                <input
                  id="profile-full-name"
                  type="text"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value)
                    setError('')
                    setSuccess('')
                  }}
                  minLength={2}
                  maxLength={120}
                  required
                  autoComplete="name"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="profile-form__field">
                <label htmlFor="profile-email">
                  Email address
                </label>

                <div className="profile-form__input-wrapper">
                  <Mail size={17} />

                  <input
                    id="profile-email"
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    disabled
                  />
                </div>

                <span className="profile-form__hint">
                  Your email address cannot be changed here.
                </span>
              </div>

              {error && (
                <div className="profile-message profile-message--error">
                  <AlertCircle size={17} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="profile-message profile-message--success">
                  <CheckCircle2 size={17} />
                  <span>{success}</span>
                </div>
              )}

              <div className="profile-form__actions">
                <button
                  className="profile-button"
                  type="submit"
                  disabled={!hasChanges || isSaving}
                >
                  <Save size={16} />

                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>

          <div className="profile-side-column">
            <section className="profile-card">
              <div className="profile-card__heading">
                <div className="profile-card__icon">
                  <ShieldCheck size={19} />
                </div>

                <div>
                  <h2>Account Security</h2>
                  <p>Your account status.</p>
                </div>
              </div>

              <div className="profile-detail-list">
                <div className="profile-detail">
                  <div>
                    <span className="profile-detail__label">
                      Email verification
                    </span>
                    <span className="profile-detail__value">
                      {user?.is_verified ? 'Verified' : 'Not verified'}
                    </span>
                  </div>

                  <span
                    className={
                      user?.is_verified
                        ? 'profile-status profile-status--success'
                        : 'profile-status profile-status--warning'
                    }
                  >
                    {user?.is_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>

                <div className="profile-detail">
                  <div>
                    <span className="profile-detail__label">
                      Account status
                    </span>
                    <span className="profile-detail__value">
                      {user?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <span
                    className={
                      user?.is_active
                        ? 'profile-status profile-status--success'
                        : 'profile-status profile-status--danger'
                    }
                  >
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </section>

            <section className="profile-card">
              <div className="profile-card__heading">
                <div className="profile-card__icon">
                  <CalendarDays size={19} />
                </div>

                <div>
                  <h2>Account Information</h2>
                  <p>Your account details.</p>
                </div>
              </div>

              <div className="profile-detail-list">
                <div className="profile-detail">
                  <div>
                    <span className="profile-detail__label">
                      Account ID
                    </span>
                    <span className="profile-detail__value">
                      #{user?.id ?? '—'}
                    </span>
                  </div>
                </div>

                <div className="profile-detail">
                  <div>
                    <span className="profile-detail__label">
                      Member since
                    </span>
                    <span className="profile-detail__value">
                      {formatDate(user?.created_at)}
                    </span>
                  </div>
                </div>

                <div className="profile-detail">
                  <div>
                    <span className="profile-detail__label">
                      Last updated
                    </span>
                    <span className="profile-detail__value">
                      {formatDate(user?.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="profile-page__footer">
          <Clock3 size={15} />
          <span>
            Your profile information is securely stored in TaskForge.
          </span>
        </div>
      </div>
    </DashboardLayout>
  )
}
