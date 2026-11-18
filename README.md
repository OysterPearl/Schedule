# Agenda 日程表

日程表小项目：前端 HTML + 后端 FastAPI + SQLite。

## 目录结构

```
Agenda/
├── data.txt                 # 字段定义（数据表结构来源）
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── main.py          # 应用入口（/api 接口 + 托管前端页面）
│   │   ├── config.py        # 路径配置
│   │   ├── database.py      # SQLite 连接与初始化
│   │   ├── models.py        # Pydantic 请求/响应模型
│   │   └── routers/
│   │       └── events.py    # /api/events 的 CRUD 接口
│   ├── schema.sql           # 建表语句
│   ├── requirements.txt
│   └── data/                # 运行时生成的 agenda.db
└── frontend/                # 前端静态页面
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

## 运行（需 Python 3.10+）

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate     # Windows Git Bash；PowerShell 用 .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

- 页面：<http://127.0.0.1:8000>
- 交互式 API 文档：<http://127.0.0.1:8000/docs>

首次启动会自动创建 `backend/data/agenda.db`。

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/events` | 日程列表，支持 `?date=`、`?from=`、`?to=` 筛选 |
| GET | `/api/events/{id}` | 单条日程 |
| POST | `/api/events` | 新建（必填 `date`、`title`） |
| PUT | `/api/events/{id}` | 更新（只传要改的字段） |
| DELETE | `/api/events/{id}` | 删除 |

字段约定：
- `date`：`YYYY-MM-DD`
- `start_time` / `end_time`：`HH:MM`（可空，表示全天日程）
- `created_at` / `updated_at`：SQLite 生成的 UTC 时间，由服务端维护

## 开发建议 / 后续可做

- 前端目前是静态页 + `fetch` 调接口的模式，后续可换成 Vue/React 或保持原生。
- 若业务变复杂（标签、重复日程、多用户），可考虑引入 ORM（SQLAlchemy）和迁移工具（Alembic）。
- 想换本地时区显示时，可在接口层统一转换 `created_at`/`updated_at`。
