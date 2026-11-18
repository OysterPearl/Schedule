# Agenda 日程表

日程表小项目：前端 HTML + 后端 FastAPI + SQLite。

## 界面

- **月视图（默认）**：跟随系统日期显示当前月份，左上/右上角箭头切换月份；每行一周（周日 → 周六），点击整行进入该周的周视图；日期下方用红点表示当天日程数量，最多 3 个、居中显示。
- **周视图**：左侧时间轴，底层 24 小时按 5 分钟一格，界面上每小时一条线；日程块按 `date` 落在对应列，上下边对齐 `start_time` / `end_time`。左上角「‹ 月视图」返回。
- 两个视图在同一个页面内切换，不跳转文件。

## 目录结构

```
Agenda/
├── data.txt                 # 字段定义（数据表结构来源）
├── start.bat                # Windows 一键启动
├── backend/                 # FastAPI 后端
│   ├── run.py               # 开发入口（自动重载）
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

### 方式一：Windows 双击启动（推荐）

直接双击项目根目录的 `start.bat`，然后浏览器打开 <http://127.0.0.1:8000>。
脚本会自动进入 `backend`、检查虚拟环境并安装依赖（首次）、启动服务。

启动后**修改 `backend/app/` 下的代码会自动重启服务**；修改前端页面只需刷新浏览器。

### 方式二：命令行

```bash
cd backend
.venv/Scripts/python.exe run.py
```

如果虚拟环境不存在（首次运行）：

```bash
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe run.py
```

`run.py` 内置 `reload=True`，不需要额外加参数。不需要激活虚拟环境，直接调用 venv 里的 python，可避开 PowerShell 执行策略问题。

- 页面：<http://127.0.0.1:8000>
- 交互式 API 文档：<http://127.0.0.1:8000/docs>

首次启动会自动创建 `backend/data/agenda.db`。

### 常见启动问题

| 现象 | 原因 / 解决 |
| --- | --- |
| `uvicorn` 不是内部或外部命令 | 没激活虚拟环境或没装依赖，改用 `.venv\Scripts\python.exe run.py` 或 `start.bat` |
| `Could not import module "app.main"` | 不在 `backend` 目录，先 `cd backend` 再执行 |
| PowerShell 提示无法加载 `Activate.ps1` | 不需要激活，直接调用 `.venv\Scripts\python.exe` |
| 直接双击 `frontend/index.html` 一片空白 | 页面必须经后端访问，请用 <http://127.0.0.1:8000> |
| 8000 端口被占用 | 换端口：`--port 8001`，并访问对应端口 |

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/events` | 日程列表，支持 `?date=`、`?from=`、`?to=` 筛选 |
| GET | `/api/events/{id}` | 单条日程 |
| POST | `/api/events` | 新建（必填 `date`、`title`） |
| PUT | `/api/events/{id}` | 更新（只传要改的字段） |
| DELETE | `/api/events/{id}` | 删除 |

> 注意：当前 `/api/events` 列表接口返回 `backend/app/routers/events.py` 中写死的 mock 数据（`USE_MOCK_DATA`），暂未读写数据库。

字段约定：
- `date`：`YYYY-MM-DD`，决定日程落在周视图的哪一列
- `start_time` / `end_time`：完整时间戳，如 `2026-11-18 18:00:00`（可空，表示全天日程）
- `created_at` / `updated_at`：SQLite 生成的 UTC 时间，由服务端维护

## 开发建议 / 后续可做

- 前端目前是静态页 + `fetch` 调接口的模式，后续可换成 Vue/React 或保持原生。
- 若业务变复杂（标签、重复日程、多用户），可考虑引入 ORM（SQLAlchemy）和迁移工具（Alembic）。
- 想换本地时区显示时，可在接口层统一转换 `created_at`/`updated_at`。
