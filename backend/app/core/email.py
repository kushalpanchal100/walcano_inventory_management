"""Email service for password reset OTP delivery."""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def build_otp_html_content(recipient_name: str, otp_code: str, expiry_minutes: int = 15) -> str:
    """Generate luxury branded HTML email template for Wallcano & Surfaces Tiles."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset OTP - Wallcano & Surfaces Tiles</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0F172A; padding: 32px 40px; text-align: center;">
                            <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.06em; text-transform: uppercase;">
                                WALLCANO <span style="color: #DFBF77;">×</span> SURFACES
                            </div>
                            <div style="font-size: 11px; font-weight: 600; color: #DFBF77; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 4px;">
                                Centralized Inventory Platform
                            </div>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 40px 32px;">
                            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0F172A;">
                                Password Reset Request
                            </h2>
                            <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                                Hello {recipient_name},
                            </p>
                            <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
                                We received a request to reset the password for your inventory platform account. Use the 6-digit verification code below to authorize your password change:
                            </p>

                            <!-- OTP Box -->
                            <div style="background-color: #FEF9EE; border: 1px solid #DFBF77; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
                                <div style="font-size: 11px; font-weight: 700; color: #785910; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
                                    Your One-Time Security Code
                                </div>
                                <div style="font-family: 'Courier New', Courier, monospace, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #0F172A; margin: 8px 0; text-indent: 12px;">
                                    {otp_code}
                                </div>
                                <div style="font-size: 12px; color: #B45309; font-weight: 500; margin-top: 8px;">
                                    ⏱ Valid for {expiry_minutes} minutes
                                </div>
                            </div>

                            <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: #64748B;">
                                If you did not initiate this request, you can safely disregard this email. Your password will remain unchanged and your account is secure.
                            </p>
                            
                            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0 24px;" />
                            
                            <div style="font-size: 11px; color: #94A3B8; line-height: 1.5;">
                                Wallcano & Surfaces Tiles Enterprise Platform • Automated Security Notification
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def send_password_reset_otp_email(
    to_email: str,
    recipient_name: str,
    otp_code: str,
    expiry_minutes: int = 15,
) -> bool:
    """
    Send OTP code via SMTP.
    Security policy:
    - Never log or return OTP plaintext in production.
    - In dev/testing, logging is acceptable for debugging.
    """
    is_prod = settings.APP_ENV.lower() == "production"

    if not is_prod:
        logger.info(f"[DEV/TEST] Password reset OTP for {to_email}: {otp_code} (expires in {expiry_minutes}m)")

    # If SMTP is not configured
    if not settings.SMTP_HOST:
        if is_prod:
            logger.warning(
                f"[SECURITY ALERT] SMTP_HOST is not configured in production. Cannot deliver OTP to {to_email}."
            )
            return False
        else:
            logger.info(
                f"[DEV MODE] SMTP is unconfigured. OTP {otp_code} logged to console for testing."
            )
            return True

    # Attempt SMTP delivery
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your Verification Code — Wallcano Inventory Platform"
        msg["From"] = settings.SMTP_FROM
        msg["To"] = to_email

        plain_text = (
            f"Hello {recipient_name},\n\n"
            f"Your verification code for Wallcano & Surfaces Tiles is: {otp_code}\n\n"
            f"This code will expire in {expiry_minutes} minutes.\n"
            f"If you did not request this, please ignore this message."
        )
        html_text = build_otp_html_content(recipient_name, otp_code, expiry_minutes)

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_text, "html"))

        if settings.SMTP_TLS:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

        logger.info(f"Password reset OTP successfully sent via SMTP to {to_email}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send OTP email to {to_email} via SMTP: {exc}")
        return False
