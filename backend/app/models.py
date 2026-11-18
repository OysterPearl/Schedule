from datetime import date as Date
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EventBase(BaseModel):
    """日程的业务字段，对应表 events。"""

    model_config = ConfigDict(str_strip_whitespace=True)

    date: Date = Field(description="日期，格式 YYYY-MM-DD")
    title: str = Field(min_length=1, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    start_time: datetime | None = Field(default=None, description="开始时间，如 2026-11-18 18:00:00")
    end_time: datetime | None = Field(default=None, description="结束时间，如 2026-11-18 19:25:00")
    remark: str | None = None


class EventCreate(EventBase):
    """新建日程：date、title 必填。"""


class EventUpdate(BaseModel):
    """更新日程：只传需要修改的字段。"""

    model_config = ConfigDict(str_strip_whitespace=True)

    date: Date | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    start_time: datetime | None = None
    end_time: datetime | None = None
    remark: str | None = None


class EventOut(EventBase):
    """接口返回的完整日程。"""

    id: int
    created_at: datetime
    updated_at: datetime
