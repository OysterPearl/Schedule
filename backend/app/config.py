from pathlib import Path

# backend/app -> backend -> Agenda
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
PROJECT_DIR = BACKEND_DIR.parent

FRONTEND_DIR = PROJECT_DIR / "frontend"
SCHEMA_PATH = BACKEND_DIR / "schema.sql"
DATABASE_PATH = BACKEND_DIR / "data" / "agenda.db"
