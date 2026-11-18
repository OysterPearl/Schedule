-- 日程表数据表（字段来源：data.txt）
-- 文本存储约定：
--   date       -> 'YYYY-MM-DD'
--   start_time -> 'HH:MM:SS'（可空，表示全天日程）
-- created_at / updated_at 为 UTC 时间，由数据库自动维护
CREATE TABLE IF NOT EXISTS events (
    id          INTEGER     PRIMARY KEY AUTOINCREMENT,
    date        DATE        NOT NULL,
    title       TEXT        NOT NULL,
    location    TEXT,
    start_time  TIME,
    end_time    TIME,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remark      TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events (date);
