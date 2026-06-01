"""Email sending + OTP generation.

Pluggable sender chosen by EMAIL_PROVIDER:
  - "console" (default): logs the code to the server log. Works with zero setup
    so the verification flow is fully testable in dev / before SES is wired.
  - "ses": sends via AWS SES (needs a verified sender identity + IAM perms).

OTP codes are 6 digits; only a SHA-256 hash is ever stored.

Sending is best-effort and never raises into the request: a transient SES error
must not 500 a registration (the user can resend). boto3 is synchronous, so SES
sends run in a worker thread to avoid blocking the async event loop.
"""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

import anyio

from .config import settings

log = logging.getLogger("ledger")

CODE_TTL_MINUTES = 15
MAX_ATTEMPTS = 5

# Lazily-built SES client, reused across sends.
_ses_client = None


def generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_code(code: str) -> str:
    return hashlib.sha256(code.strip().encode()).hexdigest()


def code_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES)


def _render(code: str) -> tuple[str, str, str]:
    """Return (subject, text_body, html_body) for a verification email."""
    subject = "Your Ledger verification code"
    text = (
        f"Welcome to Ledger.\n\n"
        f"Your verification code is: {code}\n\n"
        f"It expires in {CODE_TTL_MINUTES} minutes. "
        f"If you didn't request this, you can ignore this email."
    )
    html = f"""\
<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Inter,Arial,sans-serif;color:#111827">
  <div style="max-width:440px;margin:0 auto;padding:32px 24px">
    <div style="font-size:18px;font-weight:700;color:#4f46e5;margin-bottom:20px">Ledger</div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 24px">
      <p style="margin:0 0 8px;font-size:15px;font-weight:600">Verify your email</p>
      <p style="margin:0 0 20px;font-size:13px;color:#5b6472">Enter this code to finish setting up your account.</p>
      <div style="font-size:30px;font-weight:700;letter-spacing:8px;color:#111827;text-align:center;
                  background:#f3f4f6;border-radius:10px;padding:16px 0">{code}</div>
      <p style="margin:18px 0 0;font-size:12px;color:#9aa1ad">
        Expires in {CODE_TTL_MINUTES} minutes. Didn't request this? You can safely ignore it.
      </p>
    </div>
    <p style="margin:18px 0 0;font-size:11px;color:#9aa1ad;text-align:center">&copy; Ledger</p>
  </div>
</body></html>"""
    return subject, text, html


async def send_verification_email(to_email: str, code: str) -> None:
    subject, text, html = _render(code)
    if settings.email_provider.lower() == "ses":
        # Run the blocking boto3 call off the event loop; swallow + log failures.
        try:
            await anyio.to_thread.run_sync(_send_ses_sync, to_email, subject, text, html)
        except Exception as e:  # noqa: BLE001 - never break registration on send failure
            log.error("SES send to %s failed: %s", to_email, e)
    else:
        # Console fallback - the code shows up in the server logs.
        log.info("[email:console] To %s | %s | code=%s", to_email, subject, code)


def _get_ses_client():
    global _ses_client
    if _ses_client is None:
        import boto3

        _ses_client = boto3.client("ses", region_name=settings.ses_region)
    return _ses_client


def _send_ses_sync(to_email: str, subject: str, text: str, html: str) -> None:
    client = _get_ses_client()
    kwargs = {
        "Source": settings.email_from,
        "Destination": {"ToAddresses": [to_email]},
        "Message": {
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {
                "Text": {"Data": text, "Charset": "UTF-8"},
                "Html": {"Data": html, "Charset": "UTF-8"},
            },
        },
    }
    if settings.ses_configuration_set:
        kwargs["ConfigurationSetName"] = settings.ses_configuration_set
    resp = client.send_email(**kwargs)
    log.info("SES sent to %s (MessageId=%s)", to_email, resp.get("MessageId"))
