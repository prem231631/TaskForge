
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Zap,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  LoaderCircle,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
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

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      })

      navigate('/login', {
        replace: true,
        state: { message: 'Account created successfully. Please sign in.' },
      })
    } catch (err) {
      const status = err.response?.status

      if (status === 409) {
        setError('An account with this email already exists.')
      } else if (status === 429) {
        setError('Too many registration attempts. Please try again later.')
      } else {
        setError(
          err.response?.data?.detail ||
          'Unable to create your account. Please try again.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7fa] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6755e8] text-white shadow-lg shadow-violet-200">
            <Zap size={24} fill="white" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#20202a]">
              TaskForge
            </h1>
            <p className="text-xs text-gray-400">
              Workspace platform
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-[#e9e9ef] bg-white p-7 shadow-xl shadow-gray-200/50 sm:p-9">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-[#20202a]">
              Create your account
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Get started with your TaskForge workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="full_name"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Full name
              </label>

              <div className="relative">
                <UserRound
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="h-12 w-full rounded-xl border border-[#e9e9ef] bg-[#fafafd] pl-11 pr-4 text-sm outline-none transition focus:border-[#6755e8] focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-[#e9e9ef] bg-[#fafafd] pl-11 pr-4 text-sm outline-none transition focus:border-[#6755e8] focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className="h-12 w-full rounded-xl border border-[#e9e9ef] bg-[#fafafd] pl-11 pr-12 text-sm outline-none transition focus:border-[#6755e8] focus:ring-4 focus:ring-violet-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Confirm password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  className="h-12 w-full rounded-xl border border-[#e9e9ef] bg-[#fafafd] pl-11 pr-4 text-sm outline-none transition focus:border-[#6755e8] focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6755e8] text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-[#5140cc] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 border-t border-[#f0f0f4] pt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#6755e8] transition hover:text-[#5140cc]"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} TaskForge. All rights reserved.
        </p>
      </div>
    </main>
  )
}
