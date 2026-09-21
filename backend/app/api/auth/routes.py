"""Authentication API routes: Register, Login, Logout, Me, Forgot Password, and OTP Reset."""

from datetime import datetime, timedelta, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.config.settings import get_settings
from app.core.email import send_password_reset_otp_email
from app.core.security import (
    create_access_token,
    generate_otp,
    hash_password,
    verify_password,
)
from app.models.user import PasswordResetOTP, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
    VerifyOtpRequest,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account. Role is strictly assigned as staff."""
    email_clean = req.email.lower().strip()

    # Check if user already exists
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Hash password and create user
    new_user = User(
        email=email_clean,
        full_name=req.full_name.strip(),
        hashed_password=hash_password(req.password),
        role="staff",  # Security: Public registration can never grant admin privileges
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate access token
    access_token = create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email, "role": new_user.role}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(new_user),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning JWT access token."""
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator.",
        )

    # Record last login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post("/logout", response_model=MessageResponse)
def logout():
    """Sign out the current user."""
    return MessageResponse(message="Successfully signed out.", success=True)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve current authenticated user profile."""
    return UserOut.model_validate(current_user)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Initiate password reset via email OTP. Always returns consistent message to prevent enumeration."""
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    generic_success = MessageResponse(
        message="If this email is registered, a 6-digit verification code has been sent.",
        success=True,
    )

    if not user or not user.is_active:
        return generic_success

    now = datetime.now(timezone.utc)

    # Invalidate any existing unused OTPs for this user
    db.query(PasswordResetOTP).filter(
        PasswordResetOTP.user_id == user.id,
        PasswordResetOTP.is_used.is_(False),
    ).update({"is_used": True})

    # Generate new 6-digit OTP code and 15 minute expiration
    otp_code = generate_otp(6)
    expires_at = now + timedelta(minutes=15)

    otp_record = PasswordResetOTP(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=False,
        attempts=0,
    )
    db.add(otp_record)
    db.commit()

    # Dispatch email (or log in dev/test)
    send_password_reset_otp_email(
        to_email=user.email,
        recipient_name=user.full_name,
        otp_code=otp_code,
        expiry_minutes=15,
    )

    return generic_success


@router.post("/verify-otp", response_model=MessageResponse)
def verify_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    """Validate submitted 6-digit OTP code without changing password yet."""
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or verification code.",
        )

    now = datetime.now(timezone.utc)
    otp_record = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.is_used.is_(False),
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )

    if not otp_record or otp_record.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired or is invalid. Please request a new code.",
        )

    # Rate limiting: maximum 5 incorrect attempts
    if otp_record.attempts >= 5:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new verification code.",
        )

    if otp_record.otp_code != req.otp_code.strip():
        otp_record.attempts += 1
        db.commit()
        remaining = 5 - otp_record.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. {remaining} attempt(s) remaining.",
        )

    return MessageResponse(message="Verification code is valid.", success=True)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Verify OTP and update user password in PostgreSQL."""
    email_clean = req.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or verification code.",
        )

    now = datetime.now(timezone.utc)
    otp_record = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.is_used.is_(False),
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )

    if not otp_record or otp_record.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired or is invalid. Please request a new code.",
        )

    if otp_record.attempts >= 5:
        otp_record.is_used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new verification code.",
        )

    if otp_record.otp_code != req.otp_code.strip():
        otp_record.attempts += 1
        db.commit()
        remaining = 5 - otp_record.attempts
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. {remaining} attempt(s) remaining.",
        )

    # Invalidate OTP on successful use
    otp_record.is_used = True

    # Update password securely
    user.hashed_password = hash_password(req.new_password)
    db.commit()

    logger.info(f"Password reset completed successfully for user: {user.email}")
    return MessageResponse(
        message="Password has been reset successfully. You may now log in with your new password.",
        success=True,
    )
