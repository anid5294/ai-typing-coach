# tests/conftest.py
import os
import sys
import pytest

# ─── 0) let pytest find your app package ────────────────────────────────────────
# e.g. /path/to/ai-typing-coach/backend
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# ─── 1) force a test SQLite database for all tests ───────────────────────────────
import tempfile
test_db_file = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
test_db_file.close()
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_file.name}"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# ─── 2) Create test engine and session before importing app ─────────────
#    note `check_same_thread=False` so multiple threads (TestClient+FastAPI) can share it
TEST_ENGINE = create_engine(
    os.environ["DATABASE_URL"], connect_args={"check_same_thread": False}
)
TestSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=TEST_ENGINE
)

# ─── 3) Import models first to ensure they are registered with SQLAlchemy metadata ─────────────
from app import models
from app.database import Base

# ─── 4) Replace the app's database components with test ones ────────────────────────────────────────────────────────────────────────
# Monkey patch the app's database module to use our test engine and session
import app.database
app.database.engine = TEST_ENGINE
app.database.SessionLocal = TestSessionLocal

# Now import the app
from app.main import app
from app.database import get_db

# ─── 5) override the app's get_db dependency to use *our* TestSessionLocal ──────
def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# ─── 6) autouse fixture to (re)create all tables before each test ───────────────────────────────
@pytest.fixture(autouse=True)
def reset_db():
    # drop & recreate every table so tests start from scratch
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)

# ─── 6.1) cleanup function to remove test database file ─────────────────────────────────────────────────────────
def pytest_sessionfinish(session, exitstatus):
    """Clean up test database file after all tests complete"""
    import os
    if os.path.exists(test_db_file.name):
        os.unlink(test_db_file.name)

# ─── 7) provide a TestClient that will hit our overridden app ────────────────────────────────
@pytest.fixture
def client():
    return TestClient(app)
