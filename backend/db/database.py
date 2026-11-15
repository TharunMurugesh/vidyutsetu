"""SQLAlchemy Database Models and Session Configuration for VidyutSetu."""

import json
import subprocess
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker


def get_app_git_sha() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except Exception:
        return "unknown"

DATABASE_URL = "sqlite:///./vidyutsetu.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class DBTestRun(Base):
    __tablename__ = "test_runs"

    run_id = Column(String(64), primary_key=True, index=True)
    execution_time = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    source_vendor = Column(String(64), nullable=False)
    target_vendor = Column(String(64), nullable=True)
    total_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    invalid_records = Column(Integer, default=0)
    syntactic_score = Column(Float, default=100.0)
    semantic_score = Column(Float, default=100.0)
    integrity_score = Column(Float, default=100.0)
    total_score = Column(Float, default=100.0)
    grade = Column(String(8), default="A+")
    summary = Column(Text, default="")
    issues_json = Column(Text, default="[]")
    raw_preview = Column(Text, default="")
    canonical_preview = Column(Text, default="")
    target_preview = Column(Text, default="")
    duration_ms = Column(Float, default=0.0)

    # Reproducibility fields (evaluator finding 3.8)
    app_git_sha = Column(String(64), nullable=True)
    generator_seed = Column(Integer, nullable=True)
    blame_json = Column(Text, default="{}")


class DBCustomVendorConfig(Base):
    __tablename__ = "custom_vendor_configs"

    vendor_id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    system_type = Column(String(32), default="HES")
    format_type = Column(String(32), default="json")
    protocol = Column(String(64), default="CUSTOM")
    config_json = Column(Text, default="{}")
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
