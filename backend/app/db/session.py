from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.SQLALCHEMY_DATABASE_URI, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_tenant_db(tenant_id: str):
    """
    Yields a DB session configured with Row Level Security for the given tenant_id.
    Executes SET LOCAL "app.current_tenant" = 'tenant_id' for RLS policies.
    """
    db = SessionLocal()
    try:
        db.execute(f"SET LOCAL app.current_tenant = '{tenant_id}'")
        yield db
    finally:
        db.close()
