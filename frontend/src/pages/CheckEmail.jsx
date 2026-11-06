
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MailCheck, ArrowLeft, LoaderCircle, Send } from 'lucide-react'

import { resendVerificationEmail } from '../api/auth'
import './CheckEmail.css'

export default function CheckEmail() {
  const location = useLocation()
  const email = location.state?.email || ''

  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleResend() {
    if (!email) {
      setError('Please register again to request a verification email.')
      return
    }

    setIsResending(true)
    setMessage('')
    setError('')

    try {
      const response = await resendVerificationEmail(email)

      setMessage(
        response.message || 'If your account is eligible, a verification email will be sent.',
      )
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Unable to resend the verification email. Please try again.',
      )
    } finally {
      setIsResending(false)
    }
  }

  return (
    <main className="check-email-page">
      <section className="check-email-card">
        <div className="check-email-icon">
          <MailCheck size={34} />
        </div>

        <p className="check-email-eyebrow">ONE MORE STEP</p>

        <h1>Check your email</h1>

        <p className="check-email-description">
          Your TaskForge account has been created. Verify your email address
          before signing in.
        </p>

        {email && (
          <div className="check-email-address">
            <MailCheck size={18} />
            <span>{email}</span>
          </div>
        )}

        <p className="check-email-instructions">
          Open the verification email and follow its instructions. If you
          cannot find it, check your spam or junk folder.
        </p>

        {message && (
          <div className="check-email-success" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="check-email-error" role="alert">
            {error}
          </div>
        )}

        <button
          type="button"
          className="check-email-resend"
          onClick={handleResend}
          disabled={isResending || !email}
        >
          {isResending ? (
            <>
              <LoaderCircle size={18} className="check-email-spinner" />
              Sending...
            </>
          ) : (
            <>
              <Send size={17} />
              Resend verification email
            </>
          )}
        </button>

        <Link to="/login" className="check-email-back">
          <ArrowLeft size={17} />
          Back to sign in
        </Link>
      </section>

      <p className="check-email-copyright">
        © {new Date().getFullYear()} TaskForge. All rights reserved.
      </p>
    </main>
  )
}
