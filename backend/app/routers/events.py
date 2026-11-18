import sqlite3
from datetime import date as Date

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from ..database import get_db
from ..models import EventCreate, EventOut, EventUpdate

router = APIRouter(tags=["events"])

# 客户端可写的字段（id / created_at / updated_at 由服务端维护）
FIELDS = ("date", "title", "location", "start_time", "end_time", "remark")

EVENT_NOT_FOUND = "日程不存在"

# ---------------------------------------------------------------------------
# 临时：前端联调阶段写死的数据，暂不读写数据库。
# 接入真实数据后把 USE_MOCK_DATA 改为 False，并删除 MOCK_EVENTS。
# ---------------------------------------------------------------------------
USE_MOCK_DATA = True

MOCK_EVENTS = [
    {
        "id": 1,
        "date": "2026-11-18",
        "title": "test",
        "location": "location",
        "start_time": "2026-11-18 18:00:00",
        "end_time": "2026-11-18 19:25:00",
        "created_at": "2026-11-18 00:00:00",
        "updated_at": "2026-11-18 00:00:00",
        "remark": "test",
    }
]


def _to_db(value):
    """把 date/time 转成 SQLite 存储的文本格式（ISO）。"""
    return value.isoformat() if hasattr(value, "isoformat") else value


def _fetch_event(db: sqlite3.Connection, event_id: int) -> sqlite3.Row:
    row = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=EVENT_NOT_FOUND)
    return row


@router.get("/events", response_model=list[EventOut])
def list_events(
    day: Date | None = Query(default=None, alias="date", description="按日期筛选"),
    start: Date | None = Query(default=None, alias="from", description="起始日期（含）"),
    end: Date | None = Query(default=None, alias="to", description="结束日期（含）"),
    db: sqlite3.Connection = Depends(get_db),
):
    if USE_MOCK_DATA:
        return MOCK_EVENTS

    where: list[str] = []
    params: list[str] = []

    if day is not None:
        where.append("date = ?")
        params.append(day.isoformat())
    if start is not None:
        where.append("date >= ?")
        params.append(start.isoformat())
    if end is not None:
        where.append("date <= ?")
        params.append(end.isoformat())

    sql = "SELECT * FROM events"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY date, start_time"

    rows = db.execute(sql, params).fetchall()
    return [dict(row) for row in rows]


@router.get("/events/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: sqlite3.Connection = Depends(get_db)):
    return dict(_fetch_event(db, event_id))


@router.post("/events", response_model=EventOut, status_code=201)
def create_event(payload: EventCreate, db: sqlite3.Connection = Depends(get_db)):
    values = [_to_db(getattr(payload, field)) for field in FIELDS]
    placeholders = ", ".join("?" for _ in FIELDS)
    cursor = db.execute(
        f"INSERT INTO events ({', '.join(FIELDS)}) VALUES ({placeholders})",
        values,
    )
    db.commit()
    return dict(_fetch_event(db, cursor.lastrowid))


@router.put("/events/{event_id}", response_model=EventOut)
def update_event(
    event_id: int,
    payload: EventUpdate,
    db: sqlite3.Connection = Depends(get_db),
):
    _fetch_event(db, event_id)

    data = {
        field: _to_db(value)
        for field, value in payload.model_dump(exclude_unset=True).items()
    }
    if not data:
        raise HTTPException(status_code=400, detail="没有可更新的字段")

    assignments = ", ".join(f"{field} = ?" for field in data)
    db.execute(
        f"UPDATE events SET {assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [*data.values(), event_id],
    )
    db.commit()
    return dict(_fetch_event(db, event_id))


@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: int, db: sqlite3.Connection = Depends(get_db)):
    _fetch_event(db, event_id)
    db.execute("DELETE FROM events WHERE id = ?", (event_id,))
    db.commit()
    return Response(status_code=204)
