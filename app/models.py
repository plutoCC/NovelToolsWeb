from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def unique_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        normalized = value.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


class AppModel(BaseModel):
    model_config = ConfigDict(extra="ignore")


class ImageAsset(AppModel):
    id: str
    name: str
    data_url: str
    added_at: str = Field(default_factory=now_iso)


class UiTheme(AppModel):
    border_color: str = "#7ce5ff"
    border_color_strong: str = "rgba(124, 229, 255, 0.34)"
    ui_background: str = "rgba(9, 16, 30, 0.78)"
    ui_background_alt: str = "rgba(12, 20, 38, 0.92)"
    panel_background: str = "rgba(12, 21, 38, 0.86)"
    panel_background_alt: str = "rgba(9, 17, 32, 0.82)"
    soft_panel_background: str = "rgba(255, 255, 255, 0.035)"
    title_color: str = "#edf6ff"
    text_color: str = "#edf6ff"
    muted_text_color: str = "rgba(233, 245, 255, 0.66)"
    accent_color: str = "#7ce5ff"
    accent_secondary_color: str = "#ffbc88"
    accent_tertiary_color: str = "#9f9dff"
    primary_button_background: str = "#1b85a1"
    primary_button_text_color: str = "#edf6ff"
    secondary_button_background: str = "rgba(16, 31, 55, 0.82)"
    secondary_button_text_color: str = "#edf6ff"
    danger_button_background: str = "rgba(91, 21, 41, 0.82)"
    danger_button_text_color: str = "#ffd8e3"
    topbar_background: str = "rgba(7, 12, 23, 0.92)"
    topbar_border_color: str = "rgba(124, 229, 255, 0.26)"
    sidebar_tint: str = "rgba(7, 11, 22, 0.88)"
    site_overlay: str = "rgba(5, 7, 15, 0.62)"
    background_display_mode: Literal["cinematic", "natural"] = "cinematic"
    preferred_site_background_ids: list[str] = Field(default_factory=list)
    preferred_sidebar_background_ids: list[str] = Field(default_factory=list)
    preferred_site_background_id: str | None = None
    preferred_sidebar_background_id: str | None = None


class ThemePreset(AppModel):
    id: str
    name: str
    description: str = ""
    built_in: bool = False
    created_at: str = Field(default_factory=now_iso)
    theme: UiTheme = Field(default_factory=UiTheme)


def normalize_ui_theme(
    theme: UiTheme,
    site_background_ids: set[str] | None = None,
    sidebar_background_ids: set[str] | None = None,
) -> UiTheme:
    site_ids = unique_preserve_order(
        [*theme.preferred_site_background_ids, theme.preferred_site_background_id or ""],
    )
    sidebar_ids = unique_preserve_order(
        [*theme.preferred_sidebar_background_ids, theme.preferred_sidebar_background_id or ""],
    )

    if site_background_ids is not None:
        site_ids = [item for item in site_ids if item in site_background_ids]
    if sidebar_background_ids is not None:
        sidebar_ids = [item for item in sidebar_ids if item in sidebar_background_ids]

    theme.preferred_site_background_ids = site_ids
    theme.preferred_sidebar_background_ids = sidebar_ids
    theme.preferred_site_background_id = site_ids[0] if site_ids else None
    theme.preferred_sidebar_background_id = sidebar_ids[0] if sidebar_ids else None
    return theme


class CharacterRelationship(AppModel):
    id: str
    target_character_id: str
    label: str = ""
    status: str = ""
    notes: str = ""
    shared_event_ids: list[str] = Field(default_factory=list)


class Character(AppModel):
    id: str
    name: str
    alias: str = ""
    tagline: str = ""
    summary: str = ""
    role: str = ""
    status: str = "活跃"
    archetype: str = ""
    voice_style: str = ""
    signature_item: str = ""
    arc_stage: str = ""
    accent_color: str = "#8ae4ff"
    image: str = ""
    abilities: list[str] = Field(default_factory=list)
    personality: list[str] = Field(default_factory=list)
    motivations: list[str] = Field(default_factory=list)
    fears: list[str] = Field(default_factory=list)
    secrets: list[str] = Field(default_factory=list)
    theme_keywords: list[str] = Field(default_factory=list)
    background_story: str = ""
    appearance_notes: str = ""
    notes: str = ""
    relationships: list[CharacterRelationship] = Field(default_factory=list)


class WorldOverview(AppModel):
    title: str = "未命名宇宙"
    era: str = ""
    premise: str = ""
    atmosphere: str = ""
    central_conflict: str = ""
    cosmic_rule: str = ""
    technology_level: str = ""
    mystery_system: str = ""
    travel_system: str = ""
    calendar_system: str = ""
    map_image: str = ""
    recurring_motifs: list[str] = Field(default_factory=list)


class Location(AppModel):
    id: str
    name: str
    type: str = ""
    summary: str = ""
    purpose: str = ""
    tone: str = ""
    climate: str = ""
    danger_level: str = ""
    description: str = ""
    image: str = ""
    tags: list[str] = Field(default_factory=list)
    landmarks: list[str] = Field(default_factory=list)
    resources: list[str] = Field(default_factory=list)
    character_ids: list[str] = Field(default_factory=list)
    faction_ids: list[str] = Field(default_factory=list)


class Faction(AppModel):
    id: str
    name: str
    summary: str = ""
    description: str = ""
    identity: str = ""
    goal: str = ""
    methods: str = ""
    emblem_color: str = "#7ce5ff"
    values: list[str] = Field(default_factory=list)
    resources: list[str] = Field(default_factory=list)
    tension_points: list[str] = Field(default_factory=list)
    territory_location_ids: list[str] = Field(default_factory=list)
    character_ids: list[str] = Field(default_factory=list)


class StoryEvent(AppModel):
    id: str
    title: str
    summary: str = ""
    description: str = ""
    story_time: str = ""
    sequence: int = 0
    chapter_id: str | None = None
    parent_id: str | None = None
    branch_label: str = ""
    purpose: str = ""
    outcome: str = ""
    consequence: str = ""
    stakes: str = ""
    mood: str = ""
    status: Literal["计划中", "已铺垫", "进行中", "已完成"] = "计划中"
    tags: list[str] = Field(default_factory=list)
    foreshadowing: list[str] = Field(default_factory=list)
    unresolved_threads: list[str] = Field(default_factory=list)
    character_ids: list[str] = Field(default_factory=list)
    faction_ids: list[str] = Field(default_factory=list)
    location_id: str | None = None


class Chapter(AppModel):
    id: str
    title: str
    subtitle: str = ""
    sequence: int = 0
    summary: str = ""
    objective: str = ""
    timeline_span: str = ""
    focus_question: str = ""
    hook: str = ""
    pacing_note: str = ""
    scene_goals: list[str] = Field(default_factory=list)
    expected_character_ids: list[str] = Field(default_factory=list)


class StoryOverview(AppModel):
    book_title: str = "未命名计划"
    pitch: str = ""
    synopsis: str = ""
    core_theme: str = ""
    ending_signal: str = ""
    series_scope: str = ""
    narrative_style: str = ""
    active_promises: list[str] = Field(default_factory=list)
    chapters: list[Chapter] = Field(default_factory=list)


class Settings(AppModel):
    sidebar_backgrounds: list[ImageAsset] = Field(default_factory=list)
    site_backgrounds: list[ImageAsset] = Field(default_factory=list)
    background_rotation_seconds: int = 60
    current_theme: UiTheme = Field(default_factory=UiTheme)
    style_presets: list[ThemePreset] = Field(default_factory=list)
    active_style_preset_id: str | None = None
    project_bound_style_preset_id: str | None = None


class NovelState(AppModel):
    version: str = "novel-tools.state.v2"
    project_id: str = ""
    project_slug: str = ""
    project_title: str = "星图写作台"
    project_description: str = ""
    last_updated: str = Field(default_factory=now_iso)
    characters: list[Character] = Field(default_factory=list)
    world: WorldOverview = Field(default_factory=WorldOverview)
    locations: list[Location] = Field(default_factory=list)
    factions: list[Faction] = Field(default_factory=list)
    events: list[StoryEvent] = Field(default_factory=list)
    overview: StoryOverview = Field(default_factory=StoryOverview)
    settings: Settings = Field(default_factory=Settings)


class ProjectSummary(AppModel):
    id: str
    slug: str = ""
    title: str
    description: str = ""
    created_at: str = Field(default_factory=now_iso)
    last_updated: str = Field(default_factory=now_iso)
    bound_style_preset_id: str | None = None
    cover_image: str = ""


class Workspace(AppModel):
    version: str = "novel-tools.workspace.v1"
    active_project_id: str = ""
    projects: list[ProjectSummary] = Field(default_factory=list)
    style_presets: list[ThemePreset] = Field(default_factory=list)


class BootstrapPayload(AppModel):
    workspace: Workspace
    state: NovelState


class ExportPackage(AppModel):
    format: str = "novel-tools.export.v2"
    exported_at: str = Field(default_factory=now_iso)
    project_title: str = ""
    project_id: str = ""
    payload: NovelState


class ProjectCreateRequest(AppModel):
    title: str
    description: str = ""
    template: Literal["blank", "cyber_wuxia"] = "blank"


class ProjectSwitchRequest(AppModel):
    project_id: str


def normalize_state(state: NovelState) -> NovelState:
    character_ids = {item.id for item in state.characters}
    location_ids = {item.id for item in state.locations}
    faction_ids = {item.id for item in state.factions}
    chapter_ids = {item.id for item in state.overview.chapters}
    event_ids = {item.id for item in state.events}

    state.project_title = state.project_title.strip() or state.overview.book_title.strip() or "未命名项目"
    state.project_description = state.project_description.strip()
    state.overview.book_title = state.overview.book_title.strip() or state.project_title

    for character in state.characters:
        character.abilities = unique_preserve_order(character.abilities)
        character.personality = unique_preserve_order(character.personality)
        character.motivations = unique_preserve_order(character.motivations)
        character.fears = unique_preserve_order(character.fears)
        character.secrets = unique_preserve_order(character.secrets)
        character.theme_keywords = unique_preserve_order(character.theme_keywords)
        filtered_relationships: list[CharacterRelationship] = []
        for relationship in character.relationships:
            if relationship.target_character_id == character.id:
                continue
            if relationship.target_character_id not in character_ids:
                continue
            relationship.shared_event_ids = [
                event_id for event_id in unique_preserve_order(relationship.shared_event_ids) if event_id in event_ids
            ]
            filtered_relationships.append(relationship)
        character.relationships = filtered_relationships

    state.world.recurring_motifs = unique_preserve_order(state.world.recurring_motifs)

    for location in state.locations:
        location.tags = unique_preserve_order(location.tags)
        location.landmarks = unique_preserve_order(location.landmarks)
        location.resources = unique_preserve_order(location.resources)
        location.character_ids = [item for item in unique_preserve_order(location.character_ids) if item in character_ids]
        location.faction_ids = [item for item in unique_preserve_order(location.faction_ids) if item in faction_ids]

    for faction in state.factions:
        faction.values = unique_preserve_order(faction.values)
        faction.resources = unique_preserve_order(faction.resources)
        faction.tension_points = unique_preserve_order(faction.tension_points)
        faction.character_ids = [item for item in unique_preserve_order(faction.character_ids) if item in character_ids]
        faction.territory_location_ids = [
            item for item in unique_preserve_order(faction.territory_location_ids) if item in location_ids
        ]

    for chapter in state.overview.chapters:
        chapter.scene_goals = unique_preserve_order(chapter.scene_goals)
        chapter.expected_character_ids = [
            item for item in unique_preserve_order(chapter.expected_character_ids) if item in character_ids
        ]

    for event in state.events:
        event.tags = unique_preserve_order(event.tags)
        event.foreshadowing = unique_preserve_order(event.foreshadowing)
        event.unresolved_threads = unique_preserve_order(event.unresolved_threads)
        event.character_ids = [item for item in unique_preserve_order(event.character_ids) if item in character_ids]
        event.faction_ids = [item for item in unique_preserve_order(event.faction_ids) if item in faction_ids]
        if event.location_id and event.location_id not in location_ids:
            event.location_id = None
        if event.chapter_id and event.chapter_id not in chapter_ids:
            event.chapter_id = None
        if event.parent_id and event.parent_id not in event_ids:
            event.parent_id = None

    state.settings.background_rotation_seconds = max(30, int(state.settings.background_rotation_seconds or 60))
    state.settings.sidebar_backgrounds = state.settings.sidebar_backgrounds[-48:]
    state.settings.site_backgrounds = state.settings.site_backgrounds[-48:]
    state.settings.style_presets = state.settings.style_presets[-48:]
    site_background_ids = {item.id for item in state.settings.site_backgrounds}
    sidebar_background_ids = {item.id for item in state.settings.sidebar_backgrounds}
    state.settings.current_theme = normalize_ui_theme(
        state.settings.current_theme,
        site_background_ids,
        sidebar_background_ids,
    )
    for preset in state.settings.style_presets:
        preset.theme = normalize_ui_theme(preset.theme)

    state.overview.chapters = sorted(state.overview.chapters, key=lambda item: (item.sequence, item.title))
    state.events = sorted(state.events, key=lambda item: (item.sequence, item.story_time, item.title))
    state.last_updated = now_iso()
    return state
