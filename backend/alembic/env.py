import os
from dotenv import load_dotenv
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# 1) Load your .env so DATABASE_URL is in os.environ
load_dotenv()  

# 2) Grab the Alembic Config, then immediately override the URL
config = context.config
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise RuntimeError("DATABASE_URL must be set in your .env")
config.set_main_option("sqlalchemy.url", db_url)

# 3) Configure Python logging via the fileConfig in alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 4) Import your Base and all your models so Alembic can see them
from app.database import Base           # ← wherever you did `Base = declarative_base()`
import app.models                        # ← import your models module
target_metadata = Base.metadata         # ← now metadata includes users, sessions, events

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as conn:
        context.configure(connection=conn, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
