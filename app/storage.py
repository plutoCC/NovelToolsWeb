from __future__ import annotations

import json
import re
from pathlib import Path
from uuid import uuid4

from .defaults import create_blank_state, create_cyber_wuxia_test_state, create_default_state
from .models import BootstrapPayload, NovelState, ProjectSummary, ThemePreset, Workspace, normalize_state, normalize_ui_theme


class WorkspaceStorage:
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir
        self.workspace_path = self.base_dir / "workspace.json"
        self.projects_dir = self.base_dir / "projects"
        self.legacy_state_path = self.base_dir / "novel-tools-data.json"
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_workspace()

    def _ensure_workspace(self) -> None:
        if self.workspace_path.exists():
            workspace = self.load_workspace()
            workspace = self._ensure_workspace_presets(workspace)
            if workspace.projects and workspace.active_project_id:
                return

        projects: list[ProjectSummary] = []
        if self.legacy_state_path.exists():
            with self.legacy_state_path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
            legacy_state = normalize_state(NovelState.model_validate(payload))
            legacy_state.project_id = legacy_state.project_id or "project-gray-echo"
            legacy_state.project_slug = legacy_state.project_slug or "gray-echo"
            if not legacy_state.project_title:
                legacy_state.project_title = legacy_state.overview.book_title or "灰穹回响"
            self._save_state_file(legacy_state)
            projects.append(self._summary_from_state(legacy_state))
        else:
            default_state = create_default_state()
            self._save_state_file(default_state)
            projects.append(self._summary_from_state(default_state))

        if not any(item.id == "project-cyber-wuxia" for item in projects):
            cyber_state = create_cyber_wuxia_test_state()
            self._save_state_file(cyber_state)
            projects.append(self._summary_from_state(cyber_state))

        workspace = Workspace(
            active_project_id=projects[0].id,
            projects=projects,
        )
        workspace = self._ensure_workspace_presets(workspace)
        self.save_workspace(workspace)

    def _project_path(self, project_id: str) -> Path:
        return self.projects_dir / project_id / "state.json"

    def _project_dir(self, project_id: str) -> Path:
        return self.projects_dir / project_id

    def _save_state_file(self, state: NovelState) -> NovelState:
        normalized = normalize_state(state)
        project_dir = self._project_dir(normalized.project_id)
        project_dir.mkdir(parents=True, exist_ok=True)
        with self._project_path(normalized.project_id).open("w", encoding="utf-8") as handle:
            json.dump(normalized.model_dump(mode="json"), handle, ensure_ascii=False, indent=2)
        return normalized

    def _merge_style_presets(
        self,
        current: list[ThemePreset],
        incoming: list[ThemePreset],
    ) -> list[ThemePreset]:
        merged: list[ThemePreset] = []
        seen: set[str] = set()
        replacements = {item.id: item.model_copy(deep=True) for item in incoming if item.id}

        for item in current:
            if not item.id or item.id in seen:
                continue
            merged.append(replacements.pop(item.id, item.model_copy(deep=True)))
            seen.add(item.id)

        for item in incoming:
            if not item.id or item.id in seen:
                continue
            merged.append(item.model_copy(deep=True))
            seen.add(item.id)

        return merged[-48:]

    def _ensure_workspace_presets(self, workspace: Workspace) -> Workspace:
        before = workspace.model_dump(mode="json")
        merged = self._merge_style_presets(create_default_state().settings.style_presets, [])
        merged = self._merge_style_presets(merged, create_cyber_wuxia_test_state().settings.style_presets)
        merged = self._merge_style_presets(merged, workspace.style_presets)

        for project in workspace.projects:
            path = self._project_path(project.id)
            if not path.exists():
                continue
            with path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
            project_state = NovelState.model_validate(payload)
            merged = self._merge_style_presets(merged, project_state.settings.style_presets)

        for preset in merged:
            preset.theme = normalize_ui_theme(preset.theme)

        workspace.style_presets = merged
        if workspace.model_dump(mode="json") != before:
            self.save_workspace(workspace)
        return workspace

    def _sync_state_with_workspace(self, state: NovelState, workspace: Workspace) -> NovelState:
        synced = state.model_copy(deep=True)
        synced.settings.style_presets = [item.model_copy(deep=True) for item in workspace.style_presets]
        preset_ids = {item.id for item in workspace.style_presets}

        if synced.settings.active_style_preset_id and synced.settings.active_style_preset_id not in preset_ids:
            synced.settings.active_style_preset_id = None
        if (
            synced.settings.project_bound_style_preset_id
            and synced.settings.project_bound_style_preset_id not in preset_ids
        ):
            synced.settings.project_bound_style_preset_id = None

        if synced.settings.project_bound_style_preset_id:
            preset = next(
                (item for item in workspace.style_presets if item.id == synced.settings.project_bound_style_preset_id),
                None,
            )
            if preset:
                synced.settings.current_theme = preset.theme.model_copy(deep=True)
                synced.settings.active_style_preset_id = preset.id

        site_background_ids = {item.id for item in synced.settings.site_backgrounds}
        sidebar_background_ids = {item.id for item in synced.settings.sidebar_backgrounds}
        synced.settings.current_theme = normalize_ui_theme(
            synced.settings.current_theme,
            site_background_ids,
            sidebar_background_ids,
        )
        for preset in synced.settings.style_presets:
            preset.theme = normalize_ui_theme(preset.theme)

        return synced

    def _summary_from_state(self, state: NovelState) -> ProjectSummary:
        return ProjectSummary(
            id=state.project_id,
            slug=state.project_slug or state.project_id,
            title=state.project_title,
            description=state.project_description,
            last_updated=state.last_updated,
            bound_style_preset_id=state.settings.project_bound_style_preset_id,
            cover_image=state.world.map_image or "",
        )

    def _slugify(self, value: str, fallback: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
        return slug or fallback

    def _generate_project_id(self, title: str) -> str:
        return f"project-{self._slugify(title, uuid4().hex[:8])}-{uuid4().hex[:6]}"

    def load_workspace(self) -> Workspace:
        with self.workspace_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        workspace = Workspace.model_validate(payload)
        workspace.projects = sorted(workspace.projects, key=lambda item: item.last_updated, reverse=True)
        return workspace

    def save_workspace(self, workspace: Workspace) -> Workspace:
        workspace.projects = sorted(workspace.projects, key=lambda item: item.last_updated, reverse=True)
        workspace.style_presets = workspace.style_presets[-48:]
        with self.workspace_path.open("w", encoding="utf-8") as handle:
            json.dump(workspace.model_dump(mode="json"), handle, ensure_ascii=False, indent=2)
        return workspace

    def load_state(self, project_id: str | None = None) -> NovelState:
        workspace = self.load_workspace()
        target_project_id = project_id or workspace.active_project_id
        path = self._project_path(target_project_id)
        if not path.exists():
            raise FileNotFoundError(f"Project state not found: {target_project_id}")
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        state = normalize_state(NovelState.model_validate(payload))
        synced = self._sync_state_with_workspace(state, workspace)
        if synced.model_dump(mode="json") != payload:
            self._save_state_file(synced)
            self._sync_project_summary(synced)
        return synced

    def _sync_project_summary(self, state: NovelState) -> Workspace:
        workspace = self.load_workspace()
        summary = self._summary_from_state(state)
        updated = False
        for index, existing in enumerate(workspace.projects):
            if existing.id == state.project_id:
                workspace.projects[index] = summary
                updated = True
                break
        if not updated:
            workspace.projects.append(summary)
        return self.save_workspace(workspace)

    def save_state(self, state: NovelState, project_id: str | None = None) -> NovelState:
        workspace = self.load_workspace()
        target_state = normalize_state(state)
        if project_id:
            target_state.project_id = project_id
        workspace.style_presets = [item.model_copy(deep=True) for item in target_state.settings.style_presets[-48:]]
        workspace = self.save_workspace(workspace)
        saved = self._save_state_file(self._sync_state_with_workspace(target_state, workspace))
        workspace = self._sync_project_summary(saved)
        if not workspace.active_project_id:
            workspace.active_project_id = saved.project_id
            self.save_workspace(workspace)
        return saved

    def bootstrap(self) -> BootstrapPayload:
        workspace = self.load_workspace()
        state = self.load_state(workspace.active_project_id)
        return BootstrapPayload(workspace=workspace, state=state)

    def switch_project(self, project_id: str) -> BootstrapPayload:
        workspace = self.load_workspace()
        if not any(item.id == project_id for item in workspace.projects):
            raise FileNotFoundError(f"Unknown project: {project_id}")
        workspace.active_project_id = project_id
        self.save_workspace(workspace)
        return self.bootstrap()

    def create_project(self, title: str, description: str = "", template: str = "blank") -> BootstrapPayload:
        workspace = self.load_workspace()
        project_id = self._generate_project_id(title)
        if template == "cyber_wuxia":
            state = create_cyber_wuxia_test_state(project_id=project_id)
            state.project_title = title.strip() or state.project_title
            state.overview.book_title = state.project_title
            state.project_description = description.strip() or state.project_description
            state.project_slug = self._slugify(title, project_id)
        else:
            state = create_blank_state(
                project_id=project_id,
                project_title=title.strip() or "未命名项目",
                project_description=description.strip(),
            )
            state.project_slug = self._slugify(title, project_id)

        state.settings.style_presets = self._merge_style_presets(workspace.style_presets, state.settings.style_presets)
        self.save_state(state)
        return self.switch_project(project_id)

    def import_state(self, payload: dict, mode: str = "new_project", target_project_id: str | None = None) -> BootstrapPayload:
        if isinstance(payload, dict) and "payload" in payload:
            payload = payload["payload"]

        workspace = self.load_workspace()
        state = normalize_state(NovelState.model_validate(payload))
        state.settings.style_presets = self._merge_style_presets(workspace.style_presets, state.settings.style_presets)

        if mode == "replace_active":
            replace_id = target_project_id or workspace.active_project_id
            current = self.load_state(replace_id)
            state.project_id = current.project_id
            state.project_slug = current.project_slug
            self.save_state(state, project_id=replace_id)
            return self.switch_project(replace_id)

        project_id = self._generate_project_id(state.project_title or state.overview.book_title or "imported-project")
        state.project_id = project_id
        state.project_slug = self._slugify(state.project_title or state.overview.book_title or project_id, project_id)
        self.save_state(state)
        return self.switch_project(project_id)
