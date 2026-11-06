import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Zap,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  LoaderCircle,
} from 'lucide-react'

import { useAuth } from '../context/useAuth'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!formData.email.trim() || !formData.password) {
      setError('Please enter your email and password.')
      return
    }

    setIsSubmitting(true)

    try {
      await login({
        email: formData.email.trim(),
        password: formData.password,
      })

      navigate('/', { replace: true })
    } catch (err) {
      const status = err.response?.status

      if (status === 401) {
        setError('Invalid email or password.')
      } else if (status === 429) {
        setError('Too many login attempts. Please try again later.')
      } else {
        setError(
          err.response?.data?.detail ||
            'Unable to sign in. Please check your connection and try again.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        <Link to="/login" className="auth-brand">
          <div className="auth-brand-icon">
            <Zap size={24} fill="white" />
          </div>

          <div className="auth-brand-content">
            <h1>TaskForge</h1>
            <p>Workspace platform</p>
          </div>
        </Link>

        <section className="auth-card">
          <div className="auth-card-heading">
            <h2>Welcome back</h2>
            <p>Sign in to continue to your workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="email">Email address</label>

              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon" size={18} />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>

              <div className="auth-input-wrapper">
                <LockKeyhole className="auth-input-icon" size={18} />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="auth-input auth-input-with-action"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="auth-password-toggle"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-submit-button"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={18} className="auth-spinner" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="auth-card-footer">
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/register">Create account</Link>
            </p>
          </div>
        </section>

        <p className="auth-copyright">
          © {new Date().getFullYear()} TaskForge. All rights reserved.
        </p>
      </div>
    </main>
  )
}