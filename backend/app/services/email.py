
import html
import json
import logging
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.parse import urlencode

from app.core.config import get_settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def send_verification_email(
    recipient_email: str,
    recipient_name: str,
    verification_token: str,
) -> None:
    """Send an account verification email using the Resend API."""

    settings = get_settings()

    if not settings.resend_api_key or not settings.resend_from_email:
        raise RuntimeError(
            "Email delivery is not configured. "
            "Please configure RESEND_API_KEY and RESEND_FROM_EMAIL."
        )

    query_string = urlencode({"token": verification_token})

    verification_url = (
        f"{settings.frontend_base_url.rstrip('/')}"
        f"/verify-email?{query_string}"
    )

    safe_name = html.escape(recipient_name, quote=True)
    safe_url = html.escape(verification_url, quote=True)

    text_content = f"""Hello {recipient_name},

Thank you for creating your TaskForge account.

Please verify your email address by opening this link:

{verification_url}

This verification link expires in
{settings.email_verification_expire_minutes} minutes.

If you did not create this account, you can ignore this email.

Regards,
TaskForge Team
"""

    html_content = f"""\
<html>
    <body style="font-family: Arial, sans-serif; color: #252533;">
        <div style="max-width: 560px; margin: 30px auto; padding: 32px;
                    border: 1px solid #e8e8ee; border-radius: 12px;">
            <h1 style="font-size: 24px;">Welcome to TaskForge</h1>

            <p>Hello {safe_name},</p>

            <p>
                Thank you for creating your TaskForge account.
                Please verify your email address to activate your account.
            </p>

            <p style="margin: 30px 0;">
                <a href="{safe_url}"
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
"""

    payload = {
        "from": settings.resend_from_email,
        "to": [recipient_email],
        "subject": "Verify your TaskForge email address",
        "text": text_content,
        "html": html_content,
    }

    request = Request(
        RESEND_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "TaskForge/1.0",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=20) as response:
            response_data = json.loads(response.read().decode("utf-8"))

        if not response_data.get("id"):
            logger.error(
                "Resend API returned a response without an email ID."
            )
            raise RuntimeError(
                "Unable to send the verification email. "
                "Please try again later."
            )

        logger.info(
            "TaskForge verification email accepted by Resend. "
            "Email ID: %s",
            response_data["id"],
        )

    except HTTPError as exc:
        try:
            error_body = exc.read().decode("utf-8", errors="replace")
        except OSError:
            error_body = "No error response body available."

        logger.error(
            "Resend API rejected the verification email. "
            "HTTP status: %s. Response: %s",
            exc.code,
            error_body[:2000],
        )

        raise RuntimeError(
            "Unable to send the verification email. "
            "Please try again later."
        ) from None

    except (URLError, TimeoutError, OSError, ValueError):
        logger.exception(
            "TaskForge verification email delivery through Resend failed."
        )

        raise RuntimeError(
            "Unable to send the verification email. "
            "Please try again later."
        ) from None
