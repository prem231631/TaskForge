
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Zap,
  MailCheck,
  CircleCheck,
  CircleX,
  LoaderCircle,
  ArrowRight,
} from 'lucide-react'

import { verifyEmail } from '../api/auth'
import './VerifyEmail.css'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const hasVerified = useRef(false)

  useEffect(() => {
    if (hasVerified.current) return

    hasVerified.current = true

    async function verify() {
      if (!token) {
        setStatus('error')
        setMessage('The verification link is missing its token.')
        return
      }

      try {
        const response = await verifyEmail(token)

        setStatus('success')
        setMessage(
          response.message ||
            'Your email address has been verified successfully.',
        )
      } catch (error) {
        setStatus('error')
        setMessage(
          error.response?.data?.detail ||
            'Unable to verify your email address. Please try again.',
        )
      }
    }

    verify()
  }, [token])

  return (
    <main className="verify-email-page">
      <section className="verify-email-card">
        <Link to="/login" className="verify-email-brand">
          <span className="verify-email-brand-icon">
            <Zap size={22} fill="white" />
          </span>
          <span>TaskForge</span>
        </Link>

        <div className={`verify-email-status-icon ${status}`}>
          {status === 'loading' && (
            <LoaderCircle size={36} className="verify-email-spinner" />
          )}

          {status === 'success' && <CircleCheck size={38} />}

          {status === 'error' && <CircleX size={38} />}
        </div>

        {status === 'loading' && (
          <>
            <p className="verify-email-eyebrow">EMAIL VERIFICATION</p>
            <h1>Verifying your email</h1>
            <p className="verify-email-description">
              Please wait while we verify your email address.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <p className="verify-email-eyebrow">VERIFICATION COMPLETE</p>
            <h1>Email verified!</h1>
            <p className="verify-email-description">{message}</p>

            <Link to="/login" className="verify-email-action">
              Continue to sign in
              <ArrowRight size={18} />
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="verify-email-eyebrow">VERIFICATION FAILED</p>
            <h1>Unable to verify</h1>
            <p className="verify-email-description">{message}</p>

            <p className="verify-email-help">
              The link may have expired or already been used. You can request
              another verification email from the Check Email page.
            </p>

            <Link to="/check-email" className="verify-email-action">
              Back to email verification
              <MailCheck size={18} />
            </Link>
          </>
        )}
      </section>

      <p className="verify-email-copyright">
        © {new Date().getFullYear()} TaskForge. All rights reserved.
      </p>
    </main>
  )
}
