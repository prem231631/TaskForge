
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_verification_email(
    recipient_email: str,
    recipient_name: str,
    verification_token: str,
) -> None:
    """Send an email containing the account verification link."""

    settings = get_settings()

    required_settings = [
        settings.smtp_host,
        settings.smtp_username,
        settings.smtp_password,
        settings.smtp_sender_email,
    ]

    if not all(required_settings):
        raise RuntimeError(
            "Email delivery is not configured. "
            "Please configure the SMTP environment variables."
        )

    verification_url = (
        f"{settings.frontend_base_url.rstrip('/')}"
        f"/verify-email?token={verification_token}"
    )

    message = EmailMessage()
    message["Subject"] = "Verify your TaskForge email address"
    message["From"] = (
        f"{settings.smtp_sender_name} "
        f"<{settings.smtp_sender_email}>"
    )
    message["To"] = recipient_email

    message.set_content(
        f"""Hello {recipient_name},

Thank you for creating your TaskForge account.

Please verify your email address by opening this link:

{verification_url}

This verification link expires in
{settings.email_verification_expire_minutes} minutes.

If you did not create this account, you can ignore this email.

Regards,
TaskForge Team
"""
    )

    message.add_alternative(
        f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #252533;">
                <div style="max-width: 560px; margin: 30px auto; padding: 32px;
                            border: 1px solid #e8e8ee; border-radius: 12px;">
                    <h1 style="font-size: 24px;">Welcome to TaskForge</h1>

                    <p>Hello {recipient_name},</p>

                    <p>
                        Thank you for creating your TaskForge account.
                        Please verify your email address to activate your account.
                    </p>

                    <p style="margin: 30px 0;">
                        <a href="{verification_url}"
                           style="background: #6755e8; color: white;
                                  padding: 13px 22px; border-radius: 7px;
                                  text-decoration: none; font-weight: bold;">
                            Verify Email Address
                        </a>
                    </p>

                    <p>
                        This link expires in
                        {settings.email_verification_expire_minutes} minutes.
                    </p>

                    <p style="color: #777; font-size: 13px;">
                        If you did not create this account, you can ignore
                        this email.
                    </p>

                    <p>Regards,<br>TaskForge Team</p>
                </div>
            </body>
        </html>
        """,
        subtype="html",
    )

    try:
        with smtplib.SMTP(
            settings.smtp_host,
            settings.smtp_port,
            timeout=15,
        ) as server:
            server.ehlo()

            if settings.smtp_use_tls:
                server.starttls()
                server.ehlo()

            server.login(
                settings.smtp_username,
                settings.smtp_password,
            )

            server.send_message(message)

    except (smtplib.SMTPException, OSError):
        logger.exception(
            "Failed to deliver verification email to %s",
            recipient_email,
        )
        raise RuntimeError(
            "Unable to send the verification email. "
            "Please try again later."
        ) from None
