
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  LockKeyhole,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  KeyRound,
  LogOut,
} from 'lucide-react'

import DashboardLayout from '../layouts/DashboardLayout'
import { useAuth } from '../context/useAuth'
import { changeCurrentUserPassword } from '../api/auth'
import './PasswordSecurity.css'

function getPasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: 'Not entered',
    }
  }

  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1

  if (score <= 2) {
    return { score, label: 'Needs improvement' }
  }

  if (score <= 3) {
    return { score, label: 'Good' }
  }

  return { score, label: 'Strong' }
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  visible,
  onToggleVisibility,
}) {
  return (
    <div className="security-field">
      <label htmlFor={id}>{label}</label>

      <div className="security-field__input-wrapper">
        <LockKeyhole
          size={17}
          className="security-field__icon"
        />

        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={128}
          required
        />

        <button
          type="button"
          className="security-field__visibility"
          onClick={onToggleVisibility}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}

export default function PasswordSecurity() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [visibility, setVisibility] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [success, setSuccess] = useState('')

  const strength = getPasswordStrength(formData.new_password)

  function updateField(field, value) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))

    setError('')
    setFieldError('')
    setSuccess('')
  }

  function toggleVisibility(field) {
    setVisibility((current) => ({
      ...current,
      [field]: !current[field],
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setFieldError('')
    setSuccess('')

    if (formData.new_password.length < 8) {
      setFieldError('Your new password must contain at least 8 characters.')
      return
    }

    if (formData.new_password === formData.current_password) {
      setFieldError('Your new password must be different from your current password.')
      return
    }

    if (formData.new_password !== formData.confirm_password) {
      setFieldError('The password confirmation does not match.')
      return
    }

    setIsSubmitting(true)

    try {
      await changeCurrentUserPassword({
        current_password: formData.current_password,
        new_password: formData.new_password,
      })

      logout()

      navigate('/login', {
        replace: true,
        state: {
          passwordChanged: true,
        },
      })
    } catch (requestError) {
      const status = requestError.response?.status
      const message = requestError.response?.data?.detail

      if (status === 400) {
        setError(
          typeof message === 'string'
            ? message
            : 'The current password is incorrect.',
        )
      } else if (status === 401) {
        logout()
        navigate('/login', { replace: true })
      } else if (status === 422) {
        setError(
          typeof message === 'string'
            ? message
            : 'Please check your password information.',
        )
      } else if (status === 429) {
        setError('Too many password change attempts. Please try again later.')
      } else {
        setError(
          'Unable to change your password. Please check your connection and try again.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="security-page">
        <div className="security-page__heading">
          <div>
            <span className="security-page__eyebrow">
              ACCOUNT SETTINGS
            </span>

            <h1>Password & Security</h1>

            <p>
              Manage your password and keep your TaskForge account secure.
            </p>
          </div>
        </div>

        <div className="security-page__grid">
          <section className="security-card">
            <div className="security-card__heading">
              <div className="security-card__icon">
                <KeyRound size={20} />
              </div>

              <div>
                <h2>Change password</h2>
                <p>
                  Choose a new password to protect your account.
                </p>
              </div>
            </div>

            <form
              className="security-form"
              onSubmit={handleSubmit}
            >
              <PasswordField
                id="current-password"
                label="Current password"
                value={formData.current_password}
                onChange={(event) =>
                  updateField('current_password', event.target.value)
                }
                placeholder="Enter your current password"
                autoComplete="current-password"
                visible={visibility.current}
                onToggleVisibility={() => toggleVisibility('current')}
              />

              <PasswordField
                id="new-password"
                label="New password"
                value={formData.new_password}
                onChange={(event) =>
                  updateField('new_password', event.target.value)
                }
                placeholder="Enter your new password"
                autoComplete="new-password"
                visible={visibility.new}
                onToggleVisibility={() => toggleVisibility('new')}
              />

              {formData.new_password && (
                <div className="security-strength">
                  <div className="security-strength__top">
                    <span>Password strength</span>
                    <span>{strength.label}</span>
                  </div>

                  <div
                    className="security-strength__bars"
                    aria-label={`Password strength: ${strength.label}`}
                  >
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <span
                        key={bar}
                        className={
                          bar <= strength.score
                            ? 'security-strength__bar security-strength__bar--active'
                            : 'security-strength__bar'
                        }
                      />
                    ))}
                  </div>

                  <p>
                    Use a mix of uppercase and lowercase letters,
                    numbers, and symbols.
                  </p>
                </div>
              )}

              <PasswordField
                id="confirm-password"
                label="Confirm new password"
                value={formData.confirm_password}
                onChange={(event) =>
                  updateField('confirm_password', event.target.value)
                }
                placeholder="Enter your new password again"
                autoComplete="new-password"
                visible={visibility.confirm}
                onToggleVisibility={() => toggleVisibility('confirm')}
              />

              {fieldError && (
                <div
                  className="security-message security-message--error"
                  role="alert"
                >
                  <AlertCircle size={17} />
                  <span>{fieldError}</span>
                </div>
              )}

              {error && (
                <div
                  className="security-message security-message--error"
                  role="alert"
                >
                  <AlertCircle size={17} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="security-message security-message--success">
                  <CheckCircle2 size={17} />
                  <span>{success}</span>
                </div>
              )}

              <button
                className="security-submit"
                type="submit"
                disabled={
                  isSubmitting ||
                  !formData.current_password ||
                  !formData.new_password ||
                  !formData.confirm_password
                }
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className="security-spinner"
                    />
                    Updating password...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Update password
                  </>
                )}
              </button>
            </form>
          </section>

          <aside className="security-side">
            <section className="security-card security-info-card">
              <div className="security-info-card__icon">
                <ShieldCheck size={22} />
              </div>

              <h2>Account protection</h2>

              <p>
                Your account uses secure password hashing and
                authenticated access tokens.
              </p>

              <div className="security-info-card__divider" />

              <div className="security-info-item">
                <CheckCircle2 size={17} />
                <span>Secure password storage</span>
              </div>

              <div className="security-info-item">
                <CheckCircle2 size={17} />
                <span>Authenticated account access</span>
              </div>

              <div className="security-info-item">
                <CheckCircle2 size={17} />
                <span>Session invalidation after password changes</span>
              </div>
            </section>

            <section className="security-card security-notice">
              <div className="security-notice__heading">
                <LogOut size={18} />
                <h3>Important security notice</h3>
              </div>

              <p>
                After changing your password, all existing sessions
                will be invalidated. You will be redirected to the
                login page and must sign in again using your new password.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  )
}
