from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_DIR
from .database import init_db
from .routers import events


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Agenda API", version="0.1.0", lifespan=lifespan)

app.include_router(events.router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


# 前端静态页面：/ 返回 index.html，/static 提供 css/js
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(FRONTEND_DIR / "index.html")
