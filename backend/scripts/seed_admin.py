#!/usr/bin/env python3
"""CLI utility to seed or update the administrator account."""

import sys
import argparse
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config.settings import get_settings
from app.db.session import SessionLocal, init_db
from app.models.user import User
from app.core.security import hash_password

settings = get_settings()


def seed_admin(email: str, password: str, full_name: str) -> None:
    """Seed or update an administrator account."""
    init_db()
    db = SessionLocal()
    try:
        email_clean = email.lower().strip()
        user = db.query(User).filter(User.email == email_clean).first()
        if user:
            print(f"Updating existing user '{email_clean}' to administrator...")
            user.full_name = full_name
            user.hashed_password = hash_password(password)
            user.role = "admin"
            user.is_active = True
            db.commit()
            print(f"✅ Administrator '{email_clean}' updated successfully.")
        else:
            print(f"Creating new administrator account '{email_clean}'...")
            admin_user = User(
                email=email_clean,
                full_name=full_name,
                hashed_password=hash_password(password),
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            print(f"✅ Administrator '{email_clean}' created successfully.")
    except Exception as exc:
        db.rollback()
        print(f"❌ Failed to seed administrator: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Seed or update Walcano administrator account")
    parser.add_argument("--email", default=settings.INITIAL_ADMIN_EMAIL, help="Administrator email")
    parser.add_argument("--password", default=settings.INITIAL_ADMIN_PASSWORD, help="Administrator password")
    parser.add_argument("--name", default=settings.INITIAL_ADMIN_NAME, help="Administrator full name")

    args = parser.parse_args()
    seed_admin(args.email, args.password, args.name)


if __name__ == "__main__":
    main()
