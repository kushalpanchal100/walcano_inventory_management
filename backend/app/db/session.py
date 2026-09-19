"""PostgreSQL database engine and session maker."""

import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config.settings import get_settings
from app.db.base import Base

logger = logging.getLogger(__name__)
settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Initialize database tables and seed initial admin user if missing."""
    # Import all models here so that Base.metadata has them registered
    import app.models.user  # noqa: F401
    from app.models.user import User
    from app.core.security import hash_password

    logger.info("Initializing PostgreSQL database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")

    # Seed initial administrator account if it does not exist
    db = SessionLocal()
    try:
        admin_email = settings.INITIAL_ADMIN_EMAIL.lower().strip()
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if not existing_admin:
            logger.info(f"Seeding initial administrator account: {admin_email}")
            admin_user = User(
                email=admin_email,
                full_name=settings.INITIAL_ADMIN_NAME,
                hashed_password=hash_password(settings.INITIAL_ADMIN_PASSWORD),
                role="admin",
                is_active=True,
            )
            db.add(admin_user)
            db.commit()
            logger.info(f"Initial administrator account seeded successfully: {admin_email}")
        else:
            logger.info(f"Administrator account already exists: {admin_email}")
    except Exception as exc:
        logger.error(f"Error seeding administrator account: {exc}")
        db.rollback()
    finally:
        db.close()
