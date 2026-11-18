import sqlite3

from .config import DATABASE_PATH, SCHEMA_PATH


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """启动时执行 schema.sql，表不存在时创建。"""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DATABASE_PATH) as conn:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))


def get_db():
    """FastAPI 依赖：每个请求一条连接，请求结束自动关闭。"""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
