"""开发入口：python run.py 启动后端，修改代码后自动重启。"""

from pathlib import Path

import uvicorn

BASE_DIR = Path(__file__).resolve().parent

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  # 监听后端代码变更，自动重启
        reload_dirs=[str(BASE_DIR / "app")],
    )
