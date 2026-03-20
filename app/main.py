from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .models import (
    BootstrapPayload,
    ExportPackage,
    NovelState,
    ProjectCreateRequest,
    ProjectSwitchRequest,
    Workspace,
)
from .storage import WorkspaceStorage

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
DOCS_DIR = BASE_DIR / "docs"
STORAGE_DIR = BASE_DIR / "storage"

app = FastAPI(title="星图写作台", version="2.0.0", docs_url="/api/docs", redoc_url=None)
storage = WorkspaceStorage(STORAGE_DIR)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/docs", StaticFiles(directory=DOCS_DIR), name="docs")


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/workspace", response_model=Workspace)
async def get_workspace() -> Workspace:
    return storage.load_workspace()


@app.get("/api/bootstrap", response_model=BootstrapPayload)
async def get_bootstrap() -> BootstrapPayload:
    return storage.bootstrap()


@app.get("/api/state", response_model=NovelState)
async def get_state() -> NovelState:
    return storage.load_state()


@app.put("/api/state", response_model=NovelState)
async def save_state(state: NovelState) -> NovelState:
    return storage.save_state(state)


@app.post("/api/projects/create", response_model=BootstrapPayload)
async def create_project(request: ProjectCreateRequest) -> BootstrapPayload:
    return storage.create_project(
        title=request.title,
        description=request.description,
        template=request.template,
    )


@app.post("/api/projects/switch", response_model=BootstrapPayload)
async def switch_project(request: ProjectSwitchRequest) -> BootstrapPayload:
    try:
        return storage.switch_project(request.project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="未找到要切换的项目。") from exc


@app.get("/api/export")
async def export_state() -> JSONResponse:
    state = storage.load_state()
    export_package = ExportPackage(
        project_title=state.project_title,
        project_id=state.project_id,
        payload=state,
    )
    headers = {
        "Content-Disposition": f'attachment; filename="{state.project_slug or state.project_id or "novel-project"}-export.json"'
    }
    return JSONResponse(content=export_package.model_dump(mode="json"), headers=headers)


@app.post("/api/import", response_model=BootstrapPayload)
async def import_state(
    file: UploadFile = File(...),
    mode: str = Form("new_project"),
    target_project_id: str | None = Form(None),
) -> BootstrapPayload:
    if not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="仅支持导入 JSON 文件。")

    try:
        raw = await file.read()
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="导入文件无法解析为 UTF-8 JSON。") from exc

    if mode not in {"new_project", "replace_active"}:
        raise HTTPException(status_code=400, detail="导入模式不正确。")

    try:
        return storage.import_state(payload, mode=mode, target_project_id=target_project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="目标项目不存在。") from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"导入文件格式不正确：{exc}") from exc
