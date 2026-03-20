export const VIEWS = [
  { id: "overview", label: "总览", icon: "总", subtitle: "大纲、章节与时间线" },
  { id: "characters", label: "角色", icon: "角", subtitle: "人物设定与关系树" },
  { id: "world", label: "世界观", icon: "界", subtitle: "地图、场景与势力" },
  { id: "events", label: "事件", icon: "事", subtitle: "事件链与分支树" },
];

export function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function dataImage(title, subtitle, colorA, colorB, colorC) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${colorA}" />
          <stop offset="50%" stop-color="${colorB}" />
          <stop offset="100%" stop-color="${colorC}" />
        </linearGradient>
      </defs>
      <rect width="720" height="480" fill="url(#g)" />
      <circle cx="560" cy="140" r="110" fill="rgba(255,255,255,0.14)" />
      <circle cx="580" cy="160" r="42" fill="rgba(255,255,255,0.18)" />
      <rect x="50" y="70" width="620" height="340" rx="28" fill="rgba(6,10,20,0.28)" stroke="rgba(255,255,255,0.18)" />
      <text x="88" y="180" font-family="Segoe UI Variable Display, Bahnschrift, sans-serif" font-size="54" font-weight="700" fill="#ecfaff">${title}</text>
      <text x="88" y="225" font-family="Aptos, Segoe UI, sans-serif" font-size="23" fill="rgba(236,250,255,0.82)">${subtitle}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function blankTheme(theme = {}) {
  const preferredSiteBackgroundIds = uniqueList([
    ...(Array.isArray(theme.preferred_site_background_ids) ? theme.preferred_site_background_ids : []),
    theme.preferred_site_background_id,
  ]);
  const preferredSidebarBackgroundIds = uniqueList([
    ...(Array.isArray(theme.preferred_sidebar_background_ids) ? theme.preferred_sidebar_background_ids : []),
    theme.preferred_sidebar_background_id,
  ]);

  return {
    border_color: theme.border_color || "#7ce5ff",
    border_color_strong: theme.border_color_strong || "rgba(124, 229, 255, 0.34)",
    ui_background: theme.ui_background || "rgba(9, 16, 30, 0.78)",
    ui_background_alt: theme.ui_background_alt || "rgba(12, 20, 38, 0.92)",
    panel_background: theme.panel_background || "rgba(12, 21, 38, 0.86)",
    panel_background_alt: theme.panel_background_alt || "rgba(9, 17, 32, 0.82)",
    soft_panel_background: theme.soft_panel_background || "rgba(255, 255, 255, 0.035)",
    title_color: theme.title_color || "#edf6ff",
    text_color: theme.text_color || "#edf6ff",
    muted_text_color: theme.muted_text_color || "rgba(233, 245, 255, 0.66)",
    accent_color: theme.accent_color || "#7ce5ff",
    accent_secondary_color: theme.accent_secondary_color || "#ffbc88",
    accent_tertiary_color: theme.accent_tertiary_color || "#9f9dff",
    primary_button_background: theme.primary_button_background || "#1b85a1",
    primary_button_text_color: theme.primary_button_text_color || "#edf6ff",
    secondary_button_background: theme.secondary_button_background || "rgba(16, 31, 55, 0.82)",
    secondary_button_text_color: theme.secondary_button_text_color || "#edf6ff",
    danger_button_background: theme.danger_button_background || "rgba(91, 21, 41, 0.82)",
    danger_button_text_color: theme.danger_button_text_color || "#ffd8e3",
    topbar_background: theme.topbar_background || "rgba(7, 12, 23, 0.92)",
    topbar_border_color: theme.topbar_border_color || "rgba(124, 229, 255, 0.26)",
    sidebar_tint: theme.sidebar_tint || "rgba(7, 11, 22, 0.88)",
    site_overlay: theme.site_overlay || "rgba(5, 7, 15, 0.62)",
    background_display_mode: theme.background_display_mode || "cinematic",
    preferred_site_background_ids: preferredSiteBackgroundIds,
    preferred_sidebar_background_ids: preferredSidebarBackgroundIds,
    preferred_site_background_id: preferredSiteBackgroundIds[0] || null,
    preferred_sidebar_background_id: preferredSidebarBackgroundIds[0] || null,
  };
}

export function blankCharacter() {
  return {
    id: uid("char"),
    name: "",
    alias: "",
    tagline: "",
    summary: "",
    role: "",
    status: "活跃",
    archetype: "",
    voice_style: "",
    signature_item: "",
    arc_stage: "",
    accent_color: "#7ce5ff",
    image: dataImage("新角色", "等待你的设定", "#0c1120", "#104768", "#52d8ff"),
    abilities: [],
    personality: [],
    motivations: [],
    fears: [],
    secrets: [],
    theme_keywords: [],
    background_story: "",
    appearance_notes: "",
    notes: "",
    relationships: [],
  };
}

export function blankWorld(world = {}) {
  return {
    title: world.title || "",
    era: world.era || "",
    premise: world.premise || "",
    atmosphere: world.atmosphere || "",
    central_conflict: world.central_conflict || "",
    cosmic_rule: world.cosmic_rule || "",
    technology_level: world.technology_level || "",
    mystery_system: world.mystery_system || "",
    travel_system: world.travel_system || "",
    calendar_system: world.calendar_system || "",
    map_image: world.map_image || dataImage("世界总览", "上传地图或概念图", "#09111d", "#183757", "#328c90"),
    recurring_motifs: world.recurring_motifs || [],
  };
}

export function blankLocation() {
  return {
    id: uid("loc"),
    name: "",
    type: "",
    summary: "",
    purpose: "",
    tone: "",
    climate: "",
    danger_level: "",
    description: "",
    image: dataImage("场景", "等待你的场景设定", "#140c20", "#2a315d", "#ffae7a"),
    tags: [],
    landmarks: [],
    resources: [],
    character_ids: [],
    faction_ids: [],
  };
}

export function blankFaction() {
  return {
    id: uid("fac"),
    name: "",
    summary: "",
    description: "",
    identity: "",
    goal: "",
    methods: "",
    emblem_color: "#7ce5ff",
    values: [],
    resources: [],
    tension_points: [],
    territory_location_ids: [],
    character_ids: [],
  };
}

export function blankEvent() {
  return {
    id: uid("evt"),
    title: "",
    summary: "",
    description: "",
    story_time: "",
    sequence: 10,
    chapter_id: null,
    parent_id: null,
    branch_label: "",
    purpose: "",
    outcome: "",
    consequence: "",
    stakes: "",
    mood: "",
    status: "计划中",
    tags: [],
    foreshadowing: [],
    unresolved_threads: [],
    character_ids: [],
    faction_ids: [],
    location_id: null,
  };
}

export function blankChapter(sequence = 1) {
  return {
    id: uid("chap"),
    title: "",
    subtitle: "",
    sequence,
    summary: "",
    objective: "",
    timeline_span: "",
    focus_question: "",
    hook: "",
    pacing_note: "",
    scene_goals: [],
    expected_character_ids: [],
  };
}

export function blankRelationship(currentCharacterId) {
  return {
    id: uid("rel"),
    target_character_id: "",
    label: "",
    status: "",
    notes: "",
    shared_event_ids: [],
    owner_id: currentCharacterId,
  };
}

export function blankSettings(settings = {}) {
  return {
    sidebar_backgrounds: settings.sidebar_backgrounds || [],
    site_backgrounds: settings.site_backgrounds || [],
    background_rotation_seconds: settings.background_rotation_seconds || 60,
    current_theme: blankTheme(settings.current_theme || {}),
    style_presets: settings.style_presets || [],
    active_style_preset_id: settings.active_style_preset_id || null,
    project_bound_style_preset_id: settings.project_bound_style_preset_id || null,
  };
}

export function blankProjectForm() {
  return {
    title: "",
    description: "",
    template: "blank",
  };
}

export function blankPresetForm() {
  return {
    name: "",
    description: "",
  };
}

export function listToLines(values = []) {
  return values.join("\n");
}

export function linesToList(value = "") {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function uniqueList(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function escapeHtml(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function richText(value = "") {
  if (!String(value || "").trim()) return '<span class="muted">暂无内容</span>';
  return escapeHtml(value).replaceAll("\n", "<br />");
}

export function sortBySequence(items) {
  return [...items].sort((a, b) => {
    if (Number(a.sequence || 0) !== Number(b.sequence || 0)) {
      return Number(a.sequence || 0) - Number(b.sequence || 0);
    }
    return `${a.title || ""}${a.name || ""}`.localeCompare(`${b.title || ""}${b.name || ""}`, "zh-CN");
  });
}
