import {
  createProject,
  exportState,
  fetchBootstrap,
  fetchWorkspace,
  importState,
  saveState,
  switchProject,
} from "./api.js";
import {
  VIEWS,
  blankChapter,
  blankCharacter,
  blankEvent,
  blankFaction,
  blankLocation,
  blankPresetForm,
  blankProjectForm,
  blankRelationship,
  blankSettings,
  blankTheme,
  blankWorld,
  escapeHtml,
  linesToList,
  listToLines,
  richText,
  sortBySequence,
  uid,
} from "./schema.js";

const EVENT_STATUS_OPTIONS = ["计划中", "已铺垫", "进行中", "已完成"];
const root = document.getElementById("app");
const THEME_ALPHA_MAP = {
  border_color_strong: 0.34,
  ui_background: 0.78,
  ui_background_alt: 0.92,
  panel_background: 0.86,
  panel_background_alt: 0.82,
  soft_panel_background: 0.035,
  muted_text_color: 0.66,
  secondary_button_background: 0.82,
  danger_button_background: 0.82,
  topbar_background: 0.92,
  topbar_border_color: 0.26,
  sidebar_tint: 0.88,
  site_overlay: 0.62,
};

const state = {
  workspace: null,
  data: null,
  loading: true,
  saving: false,
  activeView: getInitialView(),
  selectedChapterId: null,
  selectedEventId: null,
  drawer: null,
  toast: null,
  editModes: {
    overview: false,
    characters: false,
    world: false,
    events: false,
  },
  currentBackgrounds: {
    site: null,
    sidebar: null,
  },
  backgroundTimers: [],
};

document.addEventListener("click", handleClick);
document.addEventListener("submit", handleSubmit);
document.addEventListener("change", handleChange);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.drawer) {
    closeDrawer();
  }
});

boot();

async function boot() {
  try {
    const payload = await fetchBootstrap();
    applyBootstrap(payload);
  } catch (error) {
    state.loading = false;
    root.innerHTML = `
      <div class="loading-screen error-screen">
        <div class="loading-mark">加载失败</div>
        <p>${escapeHtml(error.message || "无法连接到本地服务。")}</p>
      </div>
    `;
  }
}

function getInitialView() {
  const raw = window.location.hash.replace(/^#/, "").trim();
  if (raw === "settings") return "settings";
  if (VIEWS.some((item) => item.id === raw)) return raw;
  return "overview";
}

function syncViewHash() {
  const hash = state.activeView === "overview" ? "" : `#${state.activeView}`;
  window.history.replaceState(null, "", `${window.location.pathname}${hash}`);
}

function clearToast() {
  state.toast = null;
  window.clearTimeout(notify.timer);
}

function setToast(message, kind = "success") {
  if (!message) {
    clearToast();
    return;
  }

  state.toast = { message, kind };
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => {
    state.toast = null;
    refreshToast();
  }, 2600);
}

function applyBootstrap(payload, toastMessage = "") {
  state.workspace = payload.workspace;
  state.data = payload.state;
  state.loading = false;
  state.saving = false;
  initializeSelections();
  applyThemeCss();
  chooseInitialBackgrounds();
  startBackgroundRotation();
  if (toastMessage) {
    setToast(toastMessage);
  } else {
    clearToast();
  }
  render();
}

function initializeSelections() {
  const chapters = sortBySequence(state.data?.overview?.chapters || []);
  const events = sortBySequence(state.data?.events || []);

  if (!chapters.find((item) => item.id === state.selectedChapterId)) {
    state.selectedChapterId = chapters[0]?.id || null;
  }

  if (!events.find((item) => item.id === state.selectedEventId)) {
    state.selectedEventId = events[0]?.id || null;
  }
}

function applyThemeCss() {
  const settings = blankSettings(state.data?.settings || {});
  const theme = blankTheme(settings.current_theme || {});

  const pairs = {
    "--line": theme.border_color,
    "--line-strong": theme.border_color_strong,
    "--bg-2": theme.ui_background,
    "--bg-3": theme.ui_background_alt,
    "--panel": theme.panel_background,
    "--panel-strong": theme.panel_background_alt,
    "--soft-panel": theme.soft_panel_background,
    "--title": theme.title_color,
    "--text": theme.text_color,
    "--muted": theme.muted_text_color,
    "--accent": theme.accent_color,
    "--accent-2": theme.accent_secondary_color,
    "--accent-3": theme.accent_tertiary_color,
    "--primary-button": theme.primary_button_background,
    "--primary-button-text": theme.primary_button_text_color,
    "--secondary-button": theme.secondary_button_background,
    "--secondary-button-text": theme.secondary_button_text_color,
    "--danger-button": theme.danger_button_background,
    "--danger-button-text": theme.danger_button_text_color,
    "--topbar-background": theme.topbar_background,
    "--topbar-border": theme.topbar_border_color,
    "--sidebar-tint": theme.sidebar_tint,
    "--site-overlay": theme.site_overlay,
  };

  Object.entries(pairs).forEach(([key, value]) => {
    document.body.style.setProperty(key, value || "");
  });

  document.body.dataset.backgroundMode = theme.background_display_mode || "cinematic";
  document.title = `${state.data?.project_title || "Novel Tools"} - Novel Tools`;
}

function chooseInitialBackgrounds() {
  state.currentBackgrounds.site = resolveCurrentBackground("site");
  state.currentBackgrounds.sidebar = resolveCurrentBackground("sidebar");
  applyBackgroundCss();
}

function themeBackgroundIds(scope, theme = null) {
  const settings = blankSettings(state.data?.settings || {});
  const normalizedTheme = blankTheme(theme || settings.current_theme || {});
  return scope === "site"
    ? [...normalizedTheme.preferred_site_background_ids]
    : [...normalizedTheme.preferred_sidebar_background_ids];
}

function setThemeBackgroundIds(theme, scope, ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (scope === "site") {
    theme.preferred_site_background_ids = uniqueIds;
    theme.preferred_site_background_id = uniqueIds[0] || null;
    return;
  }
  theme.preferred_sidebar_background_ids = uniqueIds;
  theme.preferred_sidebar_background_id = uniqueIds[0] || null;
}

function themeBackgroundPool(scope, data = state.data, theme = null) {
  if (!data) return [];

  const settings = blankSettings(data.settings || {});
  const items = scope === "site" ? settings.site_backgrounds : settings.sidebar_backgrounds;
  const selectedIds = themeBackgroundIds(scope, theme || settings.current_theme);

  if (!selectedIds.length) {
    return items;
  }

  const itemMap = new Map(items.map((item) => [item.id, item]));
  const selectedItems = selectedIds.map((id) => itemMap.get(id)).filter(Boolean);
  return selectedItems.length ? selectedItems : items;
}

function resolveCurrentBackground(scope, data = state.data) {
  const pool = themeBackgroundPool(scope, data);
  const currentId = state.currentBackgrounds[scope]?.id || null;
  const current = pool.find((item) => item.id === currentId);
  if (current) return current;

  const preferredId = themeBackgroundIds(scope, data?.settings?.current_theme || null)[0] || null;
  const preferred = pool.find((item) => item.id === preferredId);
  return preferred || pickRandom(pool, currentId);
}

function applyBackgroundCss() {
  const site = state.currentBackgrounds.site?.data_url || "";
  const sidebar = state.currentBackgrounds.sidebar?.data_url || "";
  const siteStage = document.querySelector(".scene-bg--site");
  const sidebarBackdrop = document.querySelector(".sidebar__backdrop");
  const sidebarBackdropImage = document.querySelector(".sidebar__backdrop-image");
  const siteLayers = [
    site ? `url("${site}")` : "",
    "radial-gradient(circle at 15% 18%, rgba(124, 229, 255, 0.2), transparent 28%)",
    "radial-gradient(circle at 85% 20%, rgba(255, 188, 136, 0.18), transparent 22%)",
    "linear-gradient(150deg, rgba(3, 5, 12, 0.96), rgba(7, 12, 24, 0.88), rgba(4, 7, 14, 0.98))",
  ]
    .filter(Boolean)
    .join(", ");

  if (siteStage) {
    siteStage.style.backgroundImage = siteLayers;
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.dataset.hasImage = sidebar ? "true" : "false";
    sidebarBackdrop.style.backgroundImage = "";
  }

  if (sidebarBackdropImage) {
    sidebarBackdropImage.style.backgroundImage = sidebar ? `url("${sidebar}")` : "none";
  }

  // Keep the legacy CSS variables empty so large custom images don't hit CSS variable length limits.
  document.body.style.setProperty("--site-bg", "none");
  document.body.style.setProperty("--sidebar-bg", "none");
}

function startBackgroundRotation() {
  state.backgroundTimers.forEach((timer) => window.clearInterval(timer));
  state.backgroundTimers = [];

  if (!state.data) return;

  const settings = blankSettings(state.data.settings);
  const intervalMs = Math.max(30, Number(settings.background_rotation_seconds || 60)) * 1000;
  const sitePool = themeBackgroundPool("site");
  const sidebarPool = themeBackgroundPool("sidebar");

  if (sitePool.length > 1) {
    state.backgroundTimers.push(
      window.setInterval(() => {
        state.currentBackgrounds.site = pickRandom(sitePool, state.currentBackgrounds.site?.id);
        applyBackgroundCss();
      }, intervalMs),
    );
  }

  if (sidebarPool.length > 1) {
    state.backgroundTimers.push(
      window.setInterval(() => {
        state.currentBackgrounds.sidebar = pickRandom(sidebarPool, state.currentBackgrounds.sidebar?.id);
        applyBackgroundCss();
      }, intervalMs),
    );
  }
}

function pickRandom(items, previousId = null) {
  if (!items?.length) return null;
  if (items.length === 1) return items[0];

  const candidates = items.filter((item) => item.id !== previousId);
  return candidates[Math.floor(Math.random() * candidates.length)] || items[0];
}

function render() {
  if (state.loading) {
    root.innerHTML = `
      <div class="loading-screen">
        <div class="loading-mark">正在编织星图</div>
      </div>
    `;
    return;
  }

  syncViewHash();

  root.innerHTML = `
    <div class="scene-shell">
      <div class="scene-bg scene-bg--site"></div>
      <div class="scene-bg scene-bg--veil"></div>
      <aside class="sidebar">
        <div class="sidebar__backdrop" data-has-image="false">
          <div class="sidebar__backdrop-image"></div>
          <div class="sidebar__backdrop-tint"></div>
        </div>
        <div class="sidebar__content" id="sidebar-content">
          ${renderSidebar()}
        </div>
      </aside>
      <header class="topbar" id="topbar-shell">
        ${renderTopbar()}
      </header>
      <main id="main-stage" class="main-stage ${state.saving ? "is-saving" : ""}">
        ${renderActiveView()}
      </main>
      <div id="drawer-root">${renderDrawer()}</div>
      <div id="toast-root">${renderToast()}</div>
      <input id="import-new-input" type="file" accept=".json,application/json" hidden />
      <input id="import-replace-input" type="file" accept=".json,application/json" hidden />
      <input id="sidebar-bg-upload" type="file" accept="image/*" multiple hidden data-upload-scope="sidebar" />
      <input id="site-bg-upload" type="file" accept="image/*" multiple hidden data-upload-scope="site" />
    </div>
  `;

  applyBackgroundCss();
}

function refreshSidebar() {
  const container = document.getElementById("sidebar-content");
  if (!container) {
    render();
    return;
  }
  container.innerHTML = renderSidebar();
}

function refreshTopbar() {
  const container = document.getElementById("topbar-shell");
  if (!container) {
    render();
    return;
  }
  container.innerHTML = renderTopbar();
}

function refreshMainStage() {
  const container = document.getElementById("main-stage");
  if (!container) {
    render();
    return;
  }
  syncViewHash();
  container.className = `main-stage ${state.saving ? "is-saving" : ""}`.trim();
  container.innerHTML = renderActiveView();
}

function refreshDrawer() {
  const container = document.getElementById("drawer-root");
  if (!container) {
    render();
    return;
  }
  container.innerHTML = renderDrawer();
}

function refreshToast() {
  const container = document.getElementById("toast-root");
  if (!container) {
    render();
    return;
  }
  container.innerHTML = renderToast();
}

function renderSidebar() {
  const projectCount = state.workspace?.projects?.length || 0;
  const activeProject = getActiveProjectSummary();
  const mainItems = VIEWS.map((view) => {
    const active = state.activeView === view.id;
    return `
      <button class="nav-button ${active ? "is-active" : ""}" data-action="select-view" data-view="${view.id}">
        <span class="nav-button__icon">${escapeHtml(view.icon)}</span>
        <span>
          <strong>${escapeHtml(view.label)}</strong>
          <small>${escapeHtml(view.subtitle)}</small>
        </span>
      </button>
    `;
  }).join("");

  return `
    <div class="sidebar__brand">
      <span class="eyebrow">视觉小说工坊</span>
      <h1>${escapeHtml(activeProject?.title || state.data.project_title || state.data.overview.book_title)}</h1>
      <p>${escapeHtml(state.data.project_description || "暂无项目说明")}</p>
    </div>
    <nav class="sidebar__nav">${mainItems}</nav>
    <div class="sidebar__meta">
      <span>项目数量</span>
      <strong>${projectCount}</strong>
      <small>最后更新：${formatDate(state.data.last_updated)}</small>
    </div>
    <button
      class="settings-button ${state.activeView === "settings" ? "is-active" : ""}"
      data-action="select-view"
      data-view="settings"
    >
      设置与迁移
    </button>
  `;
}

function renderTopbar() {
  const view = VIEWS.find((item) => item.id === state.activeView);
  const editView = state.editModes[state.activeView];
  const activePreset = getActivePreset();
  const showEditToggle = state.activeView !== "settings";

  return `
    <div class="topbar__content">
      <div class="topbar__copy">
        <span class="eyebrow">当前项目</span>
        <strong>${escapeHtml(state.data.project_title || state.data.overview.book_title)}</strong>
        <small>${escapeHtml(view?.label || "设置")} / ${escapeHtml(view?.subtitle || "风格、项目与迁移管理")}</small>
      </div>
      <div class="topbar__meta">
        <span class="topbar-badge">当前风格：${escapeHtml(activePreset?.name || "自定义当前风格")}</span>
        ${
          showEditToggle
            ? `
              <button class="ghost-button ${editView ? "is-active" : ""}" data-action="toggle-edit" data-view="${state.activeView}">
                ${editView ? "收起编辑入口" : "显示编辑入口"}
              </button>
            `
            : `<span class="topbar-badge">设置页始终可编辑</span>`
        }
      </div>
    </div>
  `;
}

function renderActiveView() {
  switch (state.activeView) {
    case "characters":
      return renderCharactersView();
    case "world":
      return renderWorldView();
    case "events":
      return renderEventsView();
    case "settings":
      return renderSettingsView();
    case "overview":
    default:
      return renderOverviewView();
  }
}

function renderPageHeader(viewId, title, subtitle, actionButtons = "", options = {}) {
  const showEditToggle = options.showEditToggle !== false;
  const editActive = Boolean(state.editModes[viewId]);

  return `
    <header class="page-header">
      <div>
        <span class="eyebrow">星图视图</span>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="header-actions">
        ${actionButtons}
        ${
          showEditToggle
            ? `
              <button class="ghost-button ${editActive ? "is-active" : ""}" data-action="toggle-edit" data-view="${viewId}">
                ${editActive ? "收起编辑" : "编辑"}
              </button>
            `
            : ""
        }
      </div>
    </header>
  `;
}

function renderOverviewView() {
  const editActive = state.editModes.overview;
  const overview = state.data.overview;
  const chapters = sortBySequence(overview.chapters);
  const selectedChapter = chapters.find((item) => item.id === state.selectedChapterId) || chapters[0];
  const chapterEvents = selectedChapter
    ? sortBySequence(state.data.events.filter((item) => item.chapter_id === selectedChapter.id))
    : [];
  const actualCharacters = selectedChapter ? getChapterCharacters(selectedChapter.id) : [];
  const expectedCharacters = selectedChapter
    ? selectedChapter.expected_character_ids.map((id) => getCharacter(id)).filter(Boolean)
    : [];

  return `
    <section class="page">
      ${renderPageHeader(
        "overview",
        "总览",
        "全书大纲、章节与时间线",
        editActive
          ? `
            <button class="primary-button" data-action="open-drawer" data-form="overview">编辑大纲</button>
            <button class="secondary-button" data-action="open-drawer" data-form="chapter">新增章节</button>
          `
          : "",
      )}
      <section class="hero-card">
        <div class="hero-card__copy">
          <span class="eyebrow">故事核心</span>
          <h3>${escapeHtml(overview.book_title)}</h3>
          <p class="hero-card__pitch">${escapeHtml(overview.pitch || "一句话概括你的全书卖点")}</p>
          <div class="meta-grid">
            ${metaTile("核心主题", overview.core_theme)}
            ${metaTile("结局方向", overview.ending_signal)}
            ${metaTile("系列范围", overview.series_scope)}
            ${metaTile("叙事风格", overview.narrative_style)}
          </div>
          <div class="soft-panel">
            <h4>全书概要</h4>
            <p>${richText(overview.synopsis)}</p>
          </div>
        </div>
        <div class="hero-card__aside">
          <div class="stat-stack">
            ${statCard("章节", String(chapters.length), "当前已规划的章节数量")}
            ${statCard("事件", String(state.data.events.length), "时间线中的事件总数")}
            ${statCard("承诺", String(overview.active_promises.length), "长期吊着读者的线索与回报")}
          </div>
          <div class="soft-panel">
            <h4>正在向读者承诺的内容</h4>
            ${chipList(overview.active_promises, "promise-chip")}
          </div>
        </div>
      </section>
      <section class="chapter-zone">
        <div class="chapter-tabs">
          ${
            chapters.length
              ? chapters
                  .map(
                    (chapter) => `
                      <button
                        class="chapter-tab ${chapter.id === selectedChapter?.id ? "is-active" : ""}"
                        data-action="select-chapter"
                        data-id="${chapter.id}"
                      >
                        <span>第 ${chapter.sequence} 章</span>
                        <strong>${escapeHtml(chapter.title)}</strong>
                      </button>
                    `,
                  )
                  .join("")
              : `<div class="empty-state inline-empty">还没有章节，打开编辑模式后就可以创建第一章。</div>`
          }
        </div>
        ${
          selectedChapter
            ? `
              <div class="overview-grid">
                <article class="panel-card">
                  <div class="panel-card__header">
                    <div>
                      <span class="eyebrow">章节聚焦</span>
                      <h3>${escapeHtml(selectedChapter.title)}</h3>
                      <p>${escapeHtml(selectedChapter.subtitle || "暂无副标题")}</p>
                    </div>
                  </div>
                  <div class="meta-grid">
                    ${metaTile("章节目标", selectedChapter.objective)}
                    ${metaTile("时间跨度", selectedChapter.timeline_span)}
                    ${metaTile("焦点问题", selectedChapter.focus_question)}
                    ${metaTile("悬念钩子", selectedChapter.hook)}
                  </div>
                  <div class="soft-panel">
                    <h4>章节摘要</h4>
                    <p>${richText(selectedChapter.summary)}</p>
                  </div>
                  <div class="split-panel">
                    <div class="soft-panel">
                      <h4>预期出场人物</h4>
                      ${entityPills(expectedCharacters, "暂未安排")}
                    </div>
                    <div class="soft-panel">
                      <h4>章节场景目标</h4>
                      ${chipList(selectedChapter.scene_goals, "tag-chip")}
                    </div>
                  </div>
                  ${
                    editActive
                      ? `
                        <div class="detail-footer">
                          <button class="small-button" data-action="open-drawer" data-form="chapter" data-id="${selectedChapter.id}">编辑章节</button>
                          <button class="danger-button" data-action="delete-entity" data-entity="chapter" data-id="${selectedChapter.id}">删除章节</button>
                        </div>
                      `
                      : ""
                  }
                </article>
                <article class="panel-card">
                  <div class="panel-card__header">
                    <div>
                      <span class="eyebrow">章节时间线</span>
                      <h3>章节事件时间轴</h3>
                    </div>
                  </div>
                  <div class="timeline-list">
                    ${
                      chapterEvents.length
                        ? chapterEvents
                            .map(
                              (event) => `
                                <button class="timeline-item" data-action="jump-event" data-id="${event.id}">
                                  <span class="timeline-item__time">${escapeHtml(event.story_time || "未标注时间")}</span>
                                  <strong>${escapeHtml(event.title)}</strong>
                                  <p>${escapeHtml(event.summary)}</p>
                                </button>
                              `,
                            )
                            .join("")
                        : `<div class="empty-state">这个章节还没有挂载事件，可以在事件页里为事件设置所属章节。</div>`
                    }
                  </div>
                </article>
                <article class="panel-card">
                  <div class="panel-card__header">
                    <div>
                      <span class="eyebrow">本章人物</span>
                      <h3>实际出现人物</h3>
                    </div>
                  </div>
                  ${entityPills(actualCharacters, "暂无人物")}
                </article>
              </div>
            `
            : ""
        }
      </section>
    </section>
  `;
}

function renderCharactersView() {
  const editActive = state.editModes.characters;
  const activeCount = state.data.characters.filter((item) => item.status === "活跃").length;
  const relationCount = state.data.characters.reduce((count, item) => count + item.relationships.length, 0);
  const unresolved = state.data.characters.reduce((count, item) => count + item.secrets.length, 0);

  return `
    <section class="page">
      ${renderPageHeader(
        "characters",
        "角色",
        "人物档案、关系树与事件挂载",
        editActive ? `<button class="primary-button" data-action="open-drawer" data-form="character">新增角色</button>` : "",
      )}
      <div class="stats-row">
        ${statCard("角色", String(state.data.characters.length), "已建立的人物档案数量")}
        ${statCard("活跃", String(activeCount), "当前仍在主线中活跃的人物")}
        ${statCard("关系", String(relationCount), "角色之间的关系连线")}
        ${statCard("暗线", String(unresolved), "尚未回收的秘密与伏笔")}
      </div>
      <div class="accordion-grid">
        ${
          state.data.characters.length
            ? state.data.characters.map((character) => renderCharacterCard(character, editActive)).join("")
            : `<div class="empty-state">还没有角色。打开编辑模式后就可以创建你的第一位角色。</div>`
        }
      </div>
    </section>
  `;
}

function renderCharacterCard(character, editActive) {
  const relatedEvents = sortBySequence(state.data.events.filter((item) => item.character_ids.includes(character.id)));
  const relatedLocations = state.data.locations.filter((item) => item.character_ids.includes(character.id));
  const relatedFactions = state.data.factions.filter((item) => item.character_ids.includes(character.id));

  return `
    <details class="accordion-card character-card" style="--character-accent:${escapeHtml(character.accent_color)}">
      <summary class="accordion-card__summary">
        <div class="character-hero">
          <img src="${character.image}" alt="${escapeHtml(character.name)}" />
          <div>
            <span class="eyebrow">角色档案</span>
            <h3>${escapeHtml(character.name)} ${character.alias ? `<small>${escapeHtml(character.alias)}</small>` : ""}</h3>
            <p>${escapeHtml(character.tagline || character.summary)}</p>
            ${chipList([character.status, character.role, ...character.theme_keywords.slice(0, 3)], "tag-chip")}
          </div>
        </div>
      </summary>
      <div class="accordion-card__body">
        <div class="detail-grid">
          <div class="soft-panel">
            <h4>基本信息</h4>
            <div class="meta-grid">
              ${metaTile("故事作用", character.role)}
              ${metaTile("人物原型", character.archetype)}
              ${metaTile("说话风格", character.voice_style)}
              ${metaTile("角色弧线", character.arc_stage)}
              ${metaTile("标志物", character.signature_item)}
              ${metaTile("状态", character.status)}
            </div>
          </div>
          <div class="soft-panel">
            <h4>简述</h4>
            <p>${richText(character.summary)}</p>
          </div>
          <div class="soft-panel">
            <h4>背景故事</h4>
            <p>${richText(character.background_story)}</p>
          </div>
          <div class="soft-panel">
            <h4>外形与补充备注</h4>
            <p>${richText(character.appearance_notes)}</p>
            <p class="top-gap">${richText(character.notes)}</p>
          </div>
          <div class="soft-panel">
            <h4>能力与性格</h4>
            ${chipSection("能力", character.abilities)}
            ${chipSection("性格", character.personality)}
            ${chipSection("动机", character.motivations)}
            ${chipSection("恐惧", character.fears)}
          </div>
          <div class="soft-panel">
            <h4>秘密与主题关键词</h4>
            ${chipSection("秘密", character.secrets)}
            ${chipSection("主题关键词", character.theme_keywords)}
          </div>
          <div class="soft-panel">
            <h4>挂载位置与势力</h4>
            <div class="split-panel">
              <div>
                <h5>场景</h5>
                ${entityPills(relatedLocations, "暂无挂载场景")}
              </div>
              <div>
                <h5>势力</h5>
                ${entityPills(relatedFactions, "暂无挂载势力")}
              </div>
            </div>
          </div>
          <div class="soft-panel">
            <h4>角色事件</h4>
            <div class="stack-list">
              ${
                relatedEvents.length
                  ? relatedEvents
                      .map(
                        (event) => `
                          <button class="micro-card" data-action="jump-event" data-id="${event.id}">
                            <span>${escapeHtml(event.story_time || "未标注时间")}</span>
                            <strong>${escapeHtml(event.title)}</strong>
                            <p>${escapeHtml(event.summary)}</p>
                          </button>
                        `,
                      )
                      .join("")
                  : `<div class="empty-state inline-empty">还没有与他挂载的事件。</div>`
              }
            </div>
          </div>
        </div>
        <div class="relationship-panel">
          <h4>角色关系树</h4>
          ${
            character.relationships.length
              ? `
                <div class="relationship-tree">
                  <div class="relationship-tree__root">
                    <strong>${escapeHtml(character.name)}</strong>
                    <span>${escapeHtml(character.alias || character.role)}</span>
                  </div>
                  <div class="relationship-tree__branches">
                    ${character.relationships
                      .map((relationship) => {
                        const target = getCharacter(relationship.target_character_id);
                        if (!target) return "";
                        return `
                          <article class="relationship-card">
                            <span class="relationship-card__label">${escapeHtml(relationship.label || "待补充标签")}</span>
                            <strong>${escapeHtml(target.name)}</strong>
                            <p>${escapeHtml(relationship.status || "关系状态待补充")}</p>
                            <small>${escapeHtml(relationship.notes || "暂无备注")}</small>
                          </article>
                        `;
                      })
                      .join("")}
                  </div>
                </div>
              `
               : `<div class="empty-state inline-empty">暂未填写关系树。</div>`
          }
        </div>
        ${
          editActive
            ? `
              <div class="detail-footer">
                <button class="small-button" data-action="open-drawer" data-form="character" data-id="${character.id}">编辑角色</button>
                <button class="danger-button" data-action="delete-entity" data-entity="character" data-id="${character.id}">删除角色</button>
              </div>
            `
            : ""
        }
      </div>
    </details>
  `;
}

function renderWorldView() {
  const editActive = state.editModes.world;
  const world = state.data.world;

  return `
    <section class="page">
      ${renderPageHeader(
        "world",
        "世界观",
        "地图、场景、势力与角色挂载",
        editActive
          ? `
            <button class="primary-button" data-action="open-drawer" data-form="world">编辑世界总览</button>
            <button class="secondary-button" data-action="open-drawer" data-form="location">新增场景</button>
            <button class="secondary-button" data-action="open-drawer" data-form="faction">新增势力</button>
          `
          : "",
      )}
      <section class="hero-card world-hero">
        <div class="world-map">
          <img src="${world.map_image}" alt="${escapeHtml(world.title)} 世界地图总览" />
        </div>
        <div class="hero-card__copy">
          <span class="eyebrow">世界圣经</span>
          <h3>${escapeHtml(world.title)}</h3>
          <p class="hero-card__pitch">${escapeHtml(world.premise)}</p>
          <div class="meta-grid">
            ${metaTile("时代背景", world.era)}
            ${metaTile("氛围", world.atmosphere)}
            ${metaTile("核心冲突", world.central_conflict)}
            ${metaTile("宇宙规则", world.cosmic_rule)}
            ${metaTile("科技等级", world.technology_level)}
            ${metaTile("神秘体系", world.mystery_system)}
            ${metaTile("移动方式", world.travel_system)}
            ${metaTile("历法系统", world.calendar_system)}
          </div>
          <div class="soft-panel">
            <h4>反复出现的意象</h4>
            ${chipList(world.recurring_motifs, "tag-chip")}
          </div>
        </div>
      </section>
      <div class="overview-grid">
        <article class="panel-card">
          <div class="panel-card__header">
            <div>
              <span class="eyebrow">场景列表</span>
              <h3>地图场景</h3>
            </div>
          </div>
          <div class="stack-list">
            ${
              state.data.locations.length
                ? state.data.locations.map((location) => renderLocationCard(location, editActive)).join("")
                : `<div class="empty-state inline-empty">还没有场景。</div>`
            }
          </div>
        </article>
        <article class="panel-card">
          <div class="panel-card__header">
            <div>
              <span class="eyebrow">势力列表</span>
              <h3>势力</h3>
            </div>
          </div>
          <div class="stack-list">
            ${
              state.data.factions.length
                ? state.data.factions.map((faction) => renderFactionCard(faction, editActive)).join("")
                : `<div class="empty-state inline-empty">还没有势力。</div>`
            }
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderLocationCard(location, editActive) {
  const characters = location.character_ids.map((id) => getCharacter(id)).filter(Boolean);
  const factions = location.faction_ids.map((id) => getFaction(id)).filter(Boolean);

  return `
    <details class="accordion-card mini-accordion">
      <summary class="accordion-card__summary">
        <div class="list-card">
          <img src="${location.image}" alt="${escapeHtml(location.name)}" />
          <div>
            <h4>${escapeHtml(location.name)}</h4>
            <p>${escapeHtml(location.summary)}</p>
            ${chipList([location.type, location.danger_level, ...location.tags], "tag-chip")}
          </div>
        </div>
      </summary>
      <div class="accordion-card__body">
        <div class="meta-grid">
          ${metaTile("作用", location.purpose)}
          ${metaTile("基调", location.tone)}
          ${metaTile("气候", location.climate)}
          ${metaTile("危险等级", location.danger_level)}
        </div>
        <div class="soft-panel">
          <h4>场景描述</h4>
          <p>${richText(location.description)}</p>
        </div>
        <div class="split-panel">
          <div class="soft-panel">
            <h4>地标</h4>
            ${chipList(location.landmarks, "tag-chip")}
          </div>
          <div class="soft-panel">
            <h4>资源</h4>
            ${chipList(location.resources, "tag-chip")}
          </div>
        </div>
        <div class="split-panel">
          <div class="soft-panel">
            <h4>挂载角色</h4>
            ${entityPills(characters, "暂无挂载角色")}
          </div>
          <div class="soft-panel">
            <h4>关联势力</h4>
            ${entityPills(factions, "暂无挂载势力")}
          </div>
        </div>
        ${
          editActive
            ? `
              <div class="detail-footer">
                <button class="small-button" data-action="open-drawer" data-form="location" data-id="${location.id}">挂载角色</button>
                <button class="small-button" data-action="open-drawer" data-form="location" data-id="${location.id}">编辑场景</button>
                <button class="danger-button" data-action="delete-entity" data-entity="location" data-id="${location.id}">删除场景</button>
              </div>
            `
            : ""
        }
      </div>
    </details>
  `;
}

function renderFactionCard(faction, editActive) {
  const characters = faction.character_ids.map((id) => getCharacter(id)).filter(Boolean);
  const territories = faction.territory_location_ids.map((id) => getLocation(id)).filter(Boolean);

  return `
    <details class="accordion-card mini-accordion">
      <summary class="accordion-card__summary">
        <div class="faction-summary" style="--accent:${escapeHtml(faction.emblem_color)}">
          <div class="faction-sigil"></div>
          <div>
            <h4>${escapeHtml(faction.name)}</h4>
            <p>${escapeHtml(faction.summary)}</p>
            ${chipList([faction.identity, faction.goal], "tag-chip")}
          </div>
        </div>
      </summary>
      <div class="accordion-card__body">
        <div class="meta-grid">
          ${metaTile("身份定位", faction.identity)}
          ${metaTile("主要目标", faction.goal)}
          ${metaTile("行动方式", faction.methods)}
        </div>
        <div class="soft-panel">
          <h4>势力描述</h4>
          <p>${richText(faction.description)}</p>
        </div>
        <div class="split-panel">
          <div class="soft-panel">
            <h4>信条</h4>
            ${chipList(faction.values, "tag-chip")}
          </div>
          <div class="soft-panel">
            <h4>资源</h4>
            ${chipList(faction.resources, "tag-chip")}
          </div>
        </div>
        <div class="split-panel">
          <div class="soft-panel">
            <h4>紧张点</h4>
            ${chipList(faction.tension_points, "tag-chip")}
          </div>
          <div class="soft-panel">
            <h4>挂载角色</h4>
            ${entityPills(characters, "暂无挂载角色")}
          </div>
        </div>
        <div class="soft-panel">
          <h4>控制区域</h4>
          ${entityPills(territories, "暂无控制地点")}
        </div>
        ${
          editActive
            ? `
              <div class="detail-footer">
                <button class="small-button" data-action="open-drawer" data-form="faction" data-id="${faction.id}">挂载角色</button>
                <button class="small-button" data-action="open-drawer" data-form="faction" data-id="${faction.id}">编辑势力</button>
                <button class="danger-button" data-action="delete-entity" data-entity="faction" data-id="${faction.id}">删除势力</button>
              </div>
            `
            : ""
        }
      </div>
    </details>
  `;
}

function renderEventsView() {
  const editActive = state.editModes.events;
  const events = sortBySequence(state.data.events);
  const selectedEvent = events.find((item) => item.id === state.selectedEventId) || events[0];
  const lineage = selectedEvent ? getEventLineage(selectedEvent.id) : [];
  const rootEvent = selectedEvent ? getRootEvent(selectedEvent.id) : null;

  return `
    <section class="page">
      ${renderPageHeader(
        "events",
        "事件",
        "时间线、事件树与分支",
        editActive ? `<button class="primary-button" data-action="open-drawer" data-form="event">新增事件</button>` : "",
      )}
      <div class="event-layout">
        <aside class="timeline-panel panel-card">
          <div class="panel-card__header">
            <div>
              <span class="eyebrow">时间线</span>
              <h3>按时间排序</h3>
            </div>
          </div>
          <div id="events-timeline-list" class="timeline-list">
            ${
              events.length
                ? events
                    .map(
                      (event) => `
                        <button
                          class="timeline-item ${event.id === selectedEvent?.id ? "is-active" : ""}"
                          data-action="select-event"
                          data-id="${event.id}"
                        >
                          <span class="timeline-item__time">${escapeHtml(event.story_time || "未标注时间")}</span>
                          <strong>${escapeHtml(event.title)}</strong>
                          <p>${escapeHtml(event.summary)}</p>
                        </button>
                      `,
                    )
                    .join("")
                : `<div class="empty-state">还没有事件。</div>`
            }
          </div>
        </aside>
        <div id="event-detail-column" class="event-detail-column">
          ${
            selectedEvent
              ? `
                <article class="panel-card">
                  <div class="panel-card__header">
                    <div>
                      <span class="eyebrow">事件聚焦</span>
                      <h3>${escapeHtml(selectedEvent.title)}</h3>
                      <p>${escapeHtml(selectedEvent.story_time || "未标注时间")}</p>
                    </div>
                  </div>
                  <div class="meta-grid">
                    ${metaTile("事件作用", selectedEvent.purpose)}
                    ${metaTile("结果导向", selectedEvent.outcome)}
                    ${metaTile("后续影响", selectedEvent.consequence)}
                    ${metaTile("筹码", selectedEvent.stakes)}
                    ${metaTile("情绪色调", selectedEvent.mood)}
                    ${metaTile("状态", selectedEvent.status)}
                  </div>
                  <div class="soft-panel">
                    <h4>摘要与描述</h4>
                    <p>${richText(selectedEvent.summary)}</p>
                    <p class="top-gap">${richText(selectedEvent.description)}</p>
                  </div>
                  <div class="split-panel">
                    <div class="soft-panel">
                      <h4>伏笔</h4>
                      ${chipList(selectedEvent.foreshadowing, "tag-chip")}
                    </div>
                    <div class="soft-panel">
                      <h4>未回收线索</h4>
                      ${chipList(selectedEvent.unresolved_threads, "tag-chip")}
                    </div>
                  </div>
                  <div class="split-panel">
                    <div class="soft-panel">
                      <h4>挂载角色</h4>
                      ${entityPills(
                        selectedEvent.character_ids.map((id) => getCharacter(id)).filter(Boolean),
                        "暂无挂载角色",
                      )}
                    </div>
                    <div class="soft-panel">
                      <h4>地点与势力</h4>
                      ${entityPills(
                        [
                          selectedEvent.location_id ? getLocation(selectedEvent.location_id) : null,
                          ...selectedEvent.faction_ids.map((id) => getFaction(id)),
                        ].filter(Boolean),
                        "暂无地点或势力挂载",
                      )}
                    </div>
                  </div>
                  ${
                    editActive
                      ? `
                        <div class="detail-footer">
                          <button class="small-button" data-action="open-drawer" data-form="event" data-id="${selectedEvent.id}">挂载角色</button>
                          <button class="small-button" data-action="create-event-branch" data-id="${selectedEvent.id}">新增分支事件</button>
                          <button class="small-button" data-action="open-drawer" data-form="event" data-id="${selectedEvent.id}">编辑事件</button>
                          <button class="danger-button" data-action="delete-entity" data-entity="event" data-id="${selectedEvent.id}">删除事件</button>
                        </div>
                      `
                      : ""
                  }
                </article>
                <article class="panel-card">
                  <div class="panel-card__header">
                    <div>
                      <span class="eyebrow">思维导图</span>
                      <h3>事件树视图</h3>
                    </div>
                  </div>
                  <div class="event-lineage">
                    ${
                      lineage.length
                        ? lineage
                            .map(
                              (event) => `
                                <button
                                  class="lineage-chip ${event.id === selectedEvent.id ? "is-active" : ""}"
                                  data-action="select-event"
                                  data-id="${event.id}"
                                >
                                  ${escapeHtml(event.title)}
                                </button>
                              `,
                            )
                            .join('<span class="lineage-separator">→</span>')
                        : `<span class="muted">暂无父事件链。</span>`
                    }
                  </div>
                  <div class="mindmap-tree">
                    ${rootEvent ? renderEventTreeNode(rootEvent, selectedEvent.id) : `<div class="empty-state inline-empty">暂无可展示的事件树。</div>`}
                  </div>
                </article>
              `
              : `<div class="empty-state">请选择一个事件。</div>`
          }
        </div>
      </div>
    </section>
  `;
}

function renderEventDetailColumn(selectedEvent, editActive) {
  if (!selectedEvent) {
    return `<div class="empty-state">请选择一个事件。</div>`;
  }

  const lineage = getEventLineage(selectedEvent.id);
  const rootEvent = getRootEvent(selectedEvent.id);

  return `
    <article class="panel-card">
      <div class="panel-card__header">
        <div>
          <span class="eyebrow">事件聚焦</span>
          <h3>${escapeHtml(selectedEvent.title)}</h3>
          <p>${escapeHtml(selectedEvent.story_time || "未标注时间")}</p>
        </div>
      </div>
      <div class="meta-grid">
        ${metaTile("事件作用", selectedEvent.purpose)}
        ${metaTile("结果导向", selectedEvent.outcome)}
        ${metaTile("后续影响", selectedEvent.consequence)}
        ${metaTile("筹码", selectedEvent.stakes)}
        ${metaTile("情绪色调", selectedEvent.mood)}
        ${metaTile("状态", selectedEvent.status)}
      </div>
      <div class="soft-panel">
        <h4>摘要与描述</h4>
        <p>${richText(selectedEvent.summary)}</p>
        <p class="top-gap">${richText(selectedEvent.description)}</p>
      </div>
      <div class="split-panel">
        <div class="soft-panel">
          <h4>伏笔</h4>
          ${chipList(selectedEvent.foreshadowing, "tag-chip")}
        </div>
        <div class="soft-panel">
          <h4>未回收线索</h4>
          ${chipList(selectedEvent.unresolved_threads, "tag-chip")}
        </div>
      </div>
      <div class="split-panel">
        <div class="soft-panel">
          <h4>挂载角色</h4>
          ${entityPills(
            selectedEvent.character_ids.map((id) => getCharacter(id)).filter(Boolean),
            "暂无挂载角色",
          )}
        </div>
        <div class="soft-panel">
          <h4>地点与势力</h4>
          ${entityPills(
            [
              selectedEvent.location_id ? getLocation(selectedEvent.location_id) : null,
              ...selectedEvent.faction_ids.map((id) => getFaction(id)),
            ].filter(Boolean),
            "暂无地点或势力挂载",
          )}
        </div>
      </div>
      ${
        editActive
          ? `
            <div class="detail-footer">
              <button class="small-button" data-action="open-drawer" data-form="event" data-id="${selectedEvent.id}">挂载角色</button>
              <button class="small-button" data-action="create-event-branch" data-id="${selectedEvent.id}">新增分支事件</button>
              <button class="small-button" data-action="open-drawer" data-form="event" data-id="${selectedEvent.id}">编辑事件</button>
              <button class="danger-button" data-action="delete-entity" data-entity="event" data-id="${selectedEvent.id}">删除事件</button>
            </div>
          `
          : ""
      }
    </article>
    <article class="panel-card">
      <div class="panel-card__header">
        <div>
          <span class="eyebrow">思维导图</span>
          <h3>事件树</h3>
        </div>
      </div>
      <div class="event-lineage">
        ${
          lineage.length
            ? lineage
                .map(
                  (event) => `
                    <button
                      class="lineage-chip ${event.id === selectedEvent.id ? "is-active" : ""}"
                      data-action="select-event"
                      data-id="${event.id}"
                    >
                      ${escapeHtml(event.title)}
                    </button>
                  `,
                )
                .join('<span class="lineage-separator">→</span>')
            : `<span class="muted">暂无父事件链。</span>`
        }
      </div>
      <div class="mindmap-tree">
        ${rootEvent ? renderEventTreeNode(rootEvent, selectedEvent.id) : `<div class="empty-state inline-empty">暂无可展示的事件树。</div>`}
      </div>
    </article>
  `;
}

function updateSelectedEvent(nextEventId) {
  const nextEvent = getEvent(nextEventId);
  if (!nextEvent) return;

  state.selectedEventId = nextEventId;

  if (state.activeView !== "events") {
    render();
    return;
  }

  const timeline = document.getElementById("events-timeline-list");
  const detail = document.getElementById("event-detail-column");
  if (!timeline || !detail) {
    render();
    return;
  }

  timeline
    .querySelectorAll('[data-action="select-event"]')
    .forEach((button) => button.classList.toggle("is-active", button.dataset.id === nextEventId));
  detail.innerHTML = renderEventDetailColumn(nextEvent, state.editModes.events);
}

function renderEventTreeNode(event, selectedId) {
  const children = getEventChildren(event.id);

  return `
    <div class="mindmap-node-wrap">
      <button class="mindmap-node ${event.id === selectedId ? "is-active" : ""}" data-action="select-event" data-id="${event.id}">
        <span>${escapeHtml(event.story_time || "未标注时间")}</span>
        <strong>${escapeHtml(event.title)}</strong>
        <small>${escapeHtml(event.branch_label || event.status)}</small>
      </button>
      ${
        children.length
          ? `<div class="mindmap-children">${children.map((child) => renderEventTreeNode(child, selectedId)).join("")}</div>`
          : ""
      }
    </div>
  `;
}

function renderSettingsView() {
  const settings = blankSettings(state.data.settings);
  const activePreset = getActivePreset();
  const boundPreset = getBoundPreset();

  return `
    <section class="page">
      ${renderPageHeader(
        "settings",
        "设置",
        "项目、迁移、风格与背景",
        `
          <button class="primary-button" data-action="open-drawer" data-form="project">新建项目</button>
          <button class="secondary-button" data-action="export-data">导出当前项目</button>
          <a class="ghost-button link-button" href="/docs/export-format.md" target="_blank" rel="noreferrer">格式说明</a>
        `,
        { showEditToggle: false },
      )}
      <div class="settings-grid settings-grid--hero">
        <article class="panel-card settings-panel">
          <div class="panel-card__header">
            <div>
              <span class="eyebrow">工作区</span>
              <h3>项目工作区</h3>
              <p>所有导入的数据都会落在本地项目目录中，后续可以随时切换。</p>
            </div>
          </div>
          <div class="meta-grid">
            ${metaTile("当前项目", state.data.project_title)}
            ${metaTile("项目编号", state.data.project_id)}
            ${metaTile("当前风格", activePreset?.name || "自定义当前风格")}
            ${metaTile("绑定风格", boundPreset?.name || "未绑定")}
          </div>
          <div class="soft-panel">
            <h4>项目说明</h4>
            <p>${richText(state.data.project_description || "暂无项目说明")}</p>
          </div>
        </article>
        <article class="panel-card settings-panel">
          <div class="panel-card__header">
            <div>
              <span class="eyebrow">迁移</span>
              <h3>迁移与导入</h3>
              <p>导入时可以选择建立新项目，或者直接覆盖当前项目。</p>
            </div>
          </div>
          <div class="settings-actions">
            <button class="primary-button" data-action="trigger-import-new">导入为新项目</button>
            <button class="secondary-button" data-action="trigger-import-replace">覆盖当前项目</button>
            <button class="ghost-button" data-action="export-data">导出当前项目</button>
          </div>
          <p class="muted">导出文件会包含当前项目的结构化数据与已上传图片，适合一键迁移到另一台设备。</p>
        </article>
      </div>
      <div class="settings-grid settings-grid--two">
        <article class="panel-card">
          <div class="panel-card__header">
            <div>
              <span class="eyebrow">项目列表</span>
              <h3>切换项目</h3>
            </div>
          </div>
          <div class="project-grid">
            ${renderProjectCards()}
          </div>
        </article>
        <article class="panel-card">
          <div class="panel-card__header">
            <div>
              <span class="eyebrow">风格库</span>
              <h3>风格预设</h3>
            </div>
          </div>
          <div class="settings-actions">
            <button class="primary-button" data-action="open-drawer" data-form="preset">保存当前为新风格</button>
            <button class="secondary-button" data-action="save-current-as-default">保存当前为默认</button>
            ${
              boundPreset
                ? `<button class="ghost-button" data-action="unbind-project-style">取消项目风格绑定</button>`
                : `<span class="muted">当前项目尚未绑定预设风格。</span>`
            }
          </div>
          <div class="preset-grid">
            ${renderPresetCards(settings.style_presets)}
          </div>
        </article>
      </div>
      <article class="panel-card theme-editor-card">
        <div class="panel-card__header">
          <div>
            <span class="eyebrow">调色台</span>
            <h3>界面风格编辑</h3>
            <p>保存当前风格时会自动解除项目绑定，方便你自由调色；需要重新绑定时，可在上方预设卡片里一键完成。</p>
          </div>
        </div>
        <form class="editor-form" data-form="theme-editor">
          <div class="theme-editor__controls">
            ${inputField(
              "background_rotation_seconds",
              "背景轮播间隔（秒）",
              settings.background_rotation_seconds,
              { type: "number", min: "30", step: "5" },
            )}
            ${selectField("background_display_mode", "背景显示方式", settings.current_theme.background_display_mode, [
              { value: "cinematic", label: "电影感：放大 + 柔雾" },
              { value: "natural", label: "自然显示：正常铺满，不模糊不放大" },
            ])}
            ${themeBackgroundSummaryCard("site", "站点轮播背景", settings.site_backgrounds.length)}
            ${themeBackgroundSummaryCard("sidebar", "侧栏轮播背景", settings.sidebar_backgrounds.length)}
          </div>
          <div class="theme-grid">
            ${colorInputField("border_color", "边框主色", settings.current_theme.border_color)}
            ${colorInputField("border_color_strong", "边框强调色", settings.current_theme.border_color_strong)}
            ${colorInputField("ui_background", "UI 背景主色", settings.current_theme.ui_background)}
            ${colorInputField("ui_background_alt", "UI 背景副色", settings.current_theme.ui_background_alt)}
            ${colorInputField("panel_background", "卡片背景主色", settings.current_theme.panel_background)}
            ${colorInputField("panel_background_alt", "卡片背景副色", settings.current_theme.panel_background_alt)}
            ${colorInputField("soft_panel_background", "柔光面板色", settings.current_theme.soft_panel_background)}
            ${colorInputField("title_color", "标题文字色", settings.current_theme.title_color)}
            ${colorInputField("text_color", "正文主色", settings.current_theme.text_color)}
            ${colorInputField("muted_text_color", "正文辅色", settings.current_theme.muted_text_color)}
            ${colorInputField("accent_color", "强调主色", settings.current_theme.accent_color)}
            ${colorInputField("accent_secondary_color", "强调副色", settings.current_theme.accent_secondary_color)}
            ${colorInputField("accent_tertiary_color", "强调第三色", settings.current_theme.accent_tertiary_color)}
            ${colorInputField("primary_button_background", "主按钮背景", settings.current_theme.primary_button_background)}
            ${colorInputField("primary_button_text_color", "主按钮文字", settings.current_theme.primary_button_text_color)}
            ${colorInputField("secondary_button_background", "次按钮背景", settings.current_theme.secondary_button_background)}
            ${colorInputField("secondary_button_text_color", "次按钮文字", settings.current_theme.secondary_button_text_color)}
            ${colorInputField("danger_button_background", "危险按钮背景", settings.current_theme.danger_button_background)}
            ${colorInputField("danger_button_text_color", "危险按钮文字", settings.current_theme.danger_button_text_color)}
            ${colorInputField("topbar_background", "顶栏背景", settings.current_theme.topbar_background)}
            ${colorInputField("topbar_border_color", "顶栏底线", settings.current_theme.topbar_border_color)}
            ${colorInputField("sidebar_tint", "侧栏蒙层色", settings.current_theme.sidebar_tint)}
            ${colorInputField("site_overlay", "站点背景遮罩", settings.current_theme.site_overlay)}
          </div>
          <div class="form-actions">
            <button class="primary-button" type="submit">保存当前风格</button>
            <button class="secondary-button" type="button" data-action="open-drawer" data-form="preset">另存为新预设</button>
          </div>
        </form>
      </article>
      <div class="settings-grid settings-grid--two">
        <article class="panel-card">
          <div class="panel-card__header">
            <div>
              <span class="eyebrow">站点背景</span>
              <h3>站点背景图库</h3>
            </div>
            <button class="small-button" data-action="trigger-background-upload" data-target="site-bg-upload">添加图片</button>
          </div>
          ${renderBackgroundGallery(settings.site_backgrounds, "site")}
        </article>
        <article class="panel-card">
          <div class="panel-card__header">
            <div>
              <span class="eyebrow">侧栏背景</span>
              <h3>侧栏背景图库</h3>
            </div>
            <button class="small-button" data-action="trigger-background-upload" data-target="sidebar-bg-upload">添加图片</button>
          </div>
          ${renderBackgroundGallery(settings.sidebar_backgrounds, "sidebar")}
        </article>
      </div>
    </section>
  `;
}

function themeBackgroundSummaryCard(scope, title, libraryCount) {
  const explicitIds = themeBackgroundIds(scope);
  const boundCount = themeBackgroundPool(scope).length;
  const currentItem = state.currentBackgrounds[scope];
  const summary = explicitIds.length
    ? `当前风格已绑定 ${boundCount} 张，可在下方图库里继续增减。`
    : `当前未单独指定，将在图库中的 ${libraryCount} 张背景里随机轮播。`;
  const currentLabel = currentItem?.name || "未指定";

  return `
    <div class="soft-panel theme-summary-card">
      <h4>${escapeHtml(title)}</h4>
      <strong>${explicitIds.length ? `已选 ${boundCount} 张` : "跟随图库轮播"}</strong>
      <p>${escapeHtml(summary)}</p>
      <small class="muted">当前显示：${escapeHtml(currentLabel)}</small>
    </div>
  `;
}

function renderProjectCards() {
  const projects = state.workspace?.projects || [];

  if (!projects.length) {
    return `<div class="empty-state inline-empty">还没有项目。</div>`;
  }

  return projects
    .map((project) => {
      const active = project.id === state.workspace.active_project_id;
      return `
        <article class="project-card ${active ? "is-active" : ""}">
          <div class="project-card__cover" style="background-image:url('${project.cover_image || ""}')"></div>
          <div class="project-card__body">
            <div class="project-card__header">
              <strong>${escapeHtml(project.title)}</strong>
              ${active ? `<span class="tag-chip">当前项目</span>` : ""}
            </div>
            <p>${escapeHtml(project.description || "暂无项目说明")}</p>
            <small>最近更新：${formatDate(project.last_updated)}</small>
            <div class="detail-footer detail-footer--compact">
              ${
                active
                  ? `<button class="ghost-button" type="button" disabled>已在当前项目</button>`
                  : `<button class="small-button" data-action="switch-project" data-id="${project.id}">切换到此项目</button>`
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderPresetCards(presets) {
  if (!presets.length) {
    return `<div class="empty-state inline-empty">还没有风格预设。</div>`;
  }

  const activePresetId = state.data.settings.active_style_preset_id;
  const boundPresetId = state.data.settings.project_bound_style_preset_id;

  return presets
    .map((preset) => {
      const isActive = preset.id === activePresetId;
      const isBound = preset.id === boundPresetId;
      return `
        <article class="preset-card ${isActive ? "is-active" : ""}">
          <div class="preset-card__swatches">
            <span style="background:${escapeHtml(preset.theme.accent_color)}"></span>
            <span style="background:${escapeHtml(preset.theme.accent_secondary_color)}"></span>
            <span style="background:${escapeHtml(preset.theme.primary_button_background)}"></span>
            <span style="background:${escapeHtml(preset.theme.panel_background)}"></span>
          </div>
          <div class="preset-card__body">
            <div class="project-card__header">
              <strong>${escapeHtml(preset.name)}</strong>
              <div class="chip-row">
                ${isActive ? `<span class="tag-chip">当前</span>` : ""}
                ${isBound ? `<span class="promise-chip">已绑定</span>` : ""}
                ${preset.built_in ? `<span class="lineage-chip">内置</span>` : ""}
              </div>
            </div>
            <p>${escapeHtml(preset.description || "暂无风格说明")}</p>
            <div class="detail-footer detail-footer--compact">
              <button class="small-button" data-action="apply-preset" data-id="${preset.id}">应用</button>
              <button class="secondary-button" data-action="bind-preset" data-id="${preset.id}">绑定到项目</button>
              ${
                preset.built_in
                  ? ""
                  : `<button class="danger-button" data-action="delete-preset" data-id="${preset.id}">删除</button>`
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderBackgroundGallery(items, scope) {
  if (!items.length) {
    return `<div class="empty-state inline-empty">还没有图片，先添加几张背景图吧。</div>`;
  }

  const selectedIds = new Set(themeBackgroundIds(scope));
  const currentId = state.currentBackgrounds[scope]?.id || null;

  return `
    <div class="background-gallery">
      ${items
        .map((item) => {
          const isSelected = selectedIds.has(item.id);
          const isCurrent = currentId === item.id;
          return `
            <article class="background-card ${isSelected ? "is-active" : ""} ${isCurrent ? "is-current" : ""}">
              <div class="background-card__image" style="background-image:url('${item.data_url}')"></div>
              <div class="background-card__meta">
                <strong>${escapeHtml(item.name)}</strong>
                <small>${formatDate(item.added_at)}</small>
              </div>
              <div class="chip-row">
                ${isSelected ? `<span class="tag-chip">已加入当前风格</span>` : ""}
                ${isCurrent ? `<span class="promise-chip">当前显示</span>` : ""}
              </div>
              <div class="detail-footer detail-footer--compact">
                <button
                  class="${isSelected ? "secondary-button" : "small-button"}"
                  data-action="toggle-theme-background"
                  data-scope="${scope}"
                  data-id="${item.id}"
                >
                  ${isSelected ? "移出当前风格" : "加入当前风格"}
                </button>
                <button
                  class="ghost-button"
                  data-action="apply-theme-background-now"
                  data-scope="${scope}"
                  data-id="${item.id}"
                  ${isCurrent ? "disabled" : ""}
                >
                  ${isCurrent ? "正在显示" : isSelected ? "立即显示" : "加入并显示"}
                </button>
                <button class="danger-button" data-action="delete-background" data-scope="${scope}" data-id="${item.id}">移除</button>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDrawer() {
  if (!state.drawer) return "";

  return `
    <div class="drawer-layer">
      <button class="drawer-backdrop" data-action="close-drawer" aria-label="关闭"></button>
      <aside class="drawer-panel">
        <div class="drawer-panel__header">
          <div>
            <span class="eyebrow">编辑面板</span>
            <h3>${escapeHtml(drawerTitle(state.drawer.form, state.drawer.mode))}</h3>
            <p>${escapeHtml(drawerSubtitle(state.drawer.form))}</p>
          </div>
          <button class="ghost-button" data-action="close-drawer">关闭</button>
        </div>
        <div class="drawer-panel__body">
          ${renderDrawerForm()}
        </div>
      </aside>
    </div>
  `;
}

function renderDrawerForm() {
  const drawer = state.drawer;
  const draft = drawer.draft;

  switch (drawer.form) {
    case "character":
      return `
        <form class="editor-form" data-form="character" data-id="${escapeHtml(draft.id)}">
          <div class="form-grid form-grid--two">
            ${inputField("name", "名字", draft.name, { required: true })}
            ${inputField("alias", "别名", draft.alias)}
            ${inputField("tagline", "一句话概述", draft.tagline)}
            ${inputField("role", "故事作用", draft.role)}
            ${inputField("status", "状态", draft.status)}
            ${inputField("archetype", "人物原型", draft.archetype)}
            ${inputField("voice_style", "说话风格", draft.voice_style)}
            ${inputField("signature_item", "标志物", draft.signature_item)}
            ${inputField("arc_stage", "角色弧线", draft.arc_stage)}
            ${colorInputField("accent_color", "角色主色", draft.accent_color)}
            ${textareaField("summary", "角色简述", draft.summary, { rows: 3 })}
            ${imageField("image_upload", "角色形象", draft.image, "image_current")}
          </div>
          ${textareaField("background_story", "背景故事", draft.background_story, { rows: 5 })}
          ${textareaField("appearance_notes", "外形描写", draft.appearance_notes, { rows: 4 })}
          ${textareaField("notes", "创作备注", draft.notes, { rows: 4 })}
          <div class="form-grid form-grid--two">
            ${linesField("abilities", "能力", draft.abilities, "每行一项")}
            ${linesField("personality", "性格", draft.personality, "每行一项")}
            ${linesField("motivations", "动机", draft.motivations, "每行一项")}
            ${linesField("fears", "恐惧", draft.fears, "每行一项")}
            ${linesField("secrets", "秘密", draft.secrets, "每行一项")}
            ${linesField("theme_keywords", "主题关键词", draft.theme_keywords, "每行一项")}
          </div>
          <section class="form-section">
            <div class="form-section__header">
              <div>
                <h4>关系树编辑</h4>
                <p>为当前角色挂载其他角色，并补充关系标签与备注。</p>
              </div>
              <button class="small-button" data-action="add-relation-row" data-owner-id="${draft.id}" type="button">新增关系</button>
            </div>
            <div id="relation-editor-list">
              ${
                draft.relationships.length
                  ? draft.relationships.map((relationship) => relationEditorRow(relationship, draft.id)).join("")
                  : `<div class="empty-state inline-empty">还没有关系，点击右上角可新增。</div>`
              }
            </div>
          </section>
          ${formActions()}
        </form>
      `;
    case "world":
      return `
        <form class="editor-form" data-form="world">
          <div class="form-grid form-grid--two">
            ${inputField("title", "世界标题", draft.title, { required: true })}
            ${inputField("era", "时代背景", draft.era)}
            ${textareaField("premise", "世界一句话前提", draft.premise, { rows: 3 })}
            ${textareaField("atmosphere", "氛围", draft.atmosphere, { rows: 3 })}
            ${textareaField("central_conflict", "核心冲突", draft.central_conflict, { rows: 3 })}
            ${textareaField("cosmic_rule", "宇宙规则", draft.cosmic_rule, { rows: 3 })}
            ${inputField("technology_level", "科技等级", draft.technology_level)}
            ${inputField("mystery_system", "神秘体系", draft.mystery_system)}
            ${inputField("travel_system", "移动方式", draft.travel_system)}
            ${inputField("calendar_system", "历法系统", draft.calendar_system)}
            ${imageField("map_image_upload", "地图总览", draft.map_image, "map_image_current")}
            ${linesField("recurring_motifs", "反复出现的意象", draft.recurring_motifs, "每行一项")}
          </div>
          ${formActions()}
        </form>
      `;
    case "location":
      return `
        <form class="editor-form" data-form="location" data-id="${escapeHtml(draft.id)}">
          <div class="form-grid form-grid--two">
            ${inputField("name", "名称", draft.name, { required: true })}
            ${inputField("type", "类型", draft.type)}
            ${inputField("purpose", "作用", draft.purpose)}
            ${inputField("tone", "基调", draft.tone)}
            ${inputField("climate", "气候", draft.climate)}
            ${inputField("danger_level", "危险等级", draft.danger_level)}
            ${textareaField("summary", "简述", draft.summary, { rows: 3 })}
            ${imageField("image_upload", "场景图片", draft.image, "image_current")}
          </div>
          ${textareaField("description", "详细描述", draft.description, { rows: 5 })}
          <div class="form-grid form-grid--two">
            ${linesField("tags", "标签", draft.tags, "每行一项")}
            ${linesField("landmarks", "地标", draft.landmarks, "每行一项")}
            ${linesField("resources", "资源", draft.resources, "每行一项")}
          </div>
          ${checkboxField("character_ids", "挂载角色", state.data.characters, draft.character_ids)}
          ${checkboxField("faction_ids", "关联势力", state.data.factions, draft.faction_ids)}
          ${formActions()}
        </form>
      `;
    case "faction":
      return `
        <form class="editor-form" data-form="faction" data-id="${escapeHtml(draft.id)}">
          <div class="form-grid form-grid--two">
            ${inputField("name", "名称", draft.name, { required: true })}
            ${inputField("identity", "身份定位", draft.identity)}
            ${textareaField("summary", "简述", draft.summary, { rows: 3 })}
            ${textareaField("goal", "主要目标", draft.goal, { rows: 3 })}
            ${textareaField("methods", "行动方式", draft.methods, { rows: 3 })}
            ${colorInputField("emblem_color", "徽记主色", draft.emblem_color)}
          </div>
          ${textareaField("description", "详细描述", draft.description, { rows: 5 })}
          <div class="form-grid form-grid--two">
            ${linesField("values", "信条", draft.values, "每行一项")}
            ${linesField("resources", "资源", draft.resources, "每行一项")}
            ${linesField("tension_points", "紧张点", draft.tension_points, "每行一项")}
          </div>
          ${checkboxField("territory_location_ids", "控制地点", state.data.locations, draft.territory_location_ids)}
          ${checkboxField("character_ids", "挂载角色", state.data.characters, draft.character_ids)}
          ${formActions()}
        </form>
      `;
    case "event":
      return `
        <form class="editor-form" data-form="event" data-id="${escapeHtml(draft.id)}">
          <div class="form-grid form-grid--two">
            ${inputField("title", "事件标题", draft.title, { required: true })}
            ${inputField("story_time", "故事时间", draft.story_time)}
            ${inputField("sequence", "排序序号", draft.sequence, { type: "number", min: "0", step: "1" })}
            ${selectField(
              "status",
              "状态",
              draft.status,
              EVENT_STATUS_OPTIONS.map((item) => ({ value: item, label: item })),
            )}
            ${selectField(
              "chapter_id",
              "所属章节",
              draft.chapter_id || "",
              [{ value: "", label: "不挂章节" }, ...sortBySequence(state.data.overview.chapters).map((item) => ({ value: item.id, label: item.title }))],
            )}
            ${selectField(
              "parent_id",
              "父事件",
              draft.parent_id || "",
              [{ value: "", label: "无父事件" }, ...parentEventOptions(draft.id)],
            )}
            ${inputField("branch_label", "分支标签", draft.branch_label)}
            ${textareaField("summary", "摘要", draft.summary, { rows: 3 })}
            ${textareaField("purpose", "事件作用", draft.purpose, { rows: 3 })}
            ${textareaField("outcome", "结果导向", draft.outcome, { rows: 3 })}
            ${textareaField("consequence", "后续影响", draft.consequence, { rows: 3 })}
            ${textareaField("stakes", "筹码", draft.stakes, { rows: 3 })}
            ${inputField("mood", "情绪色调", draft.mood)}
            ${selectField(
              "location_id",
              "发生地点",
              draft.location_id || "",
              [{ value: "", label: "暂不指定" }, ...state.data.locations.map((item) => ({ value: item.id, label: item.name }))],
            )}
          </div>
          ${textareaField("description", "事件描述", draft.description, { rows: 5 })}
          <div class="form-grid form-grid--two">
            ${linesField("tags", "标签", draft.tags, "每行一项")}
            ${linesField("foreshadowing", "伏笔", draft.foreshadowing, "每行一项")}
            ${linesField("unresolved_threads", "未回收线索", draft.unresolved_threads, "每行一项")}
          </div>
          ${checkboxField("character_ids", "挂载角色", state.data.characters, draft.character_ids)}
          ${checkboxField("faction_ids", "关联势力", state.data.factions, draft.faction_ids)}
          ${formActions()}
        </form>
      `;
    case "chapter":
      return `
        <form class="editor-form" data-form="chapter" data-id="${escapeHtml(draft.id)}">
          <div class="form-grid form-grid--two">
            ${inputField("title", "章节标题", draft.title, { required: true })}
            ${inputField("subtitle", "副标题", draft.subtitle)}
            ${inputField("sequence", "章节序号", draft.sequence, { type: "number", min: "1", step: "1" })}
            ${inputField("timeline_span", "时间跨度", draft.timeline_span)}
            ${textareaField("summary", "章节摘要", draft.summary, { rows: 4 })}
            ${textareaField("objective", "章节目标", draft.objective, { rows: 4 })}
            ${textareaField("focus_question", "焦点问题", draft.focus_question, { rows: 3 })}
            ${textareaField("hook", "悬念钩子", draft.hook, { rows: 3 })}
            ${textareaField("pacing_note", "节奏提示", draft.pacing_note, { rows: 4 })}
            ${linesField("scene_goals", "场景目标", draft.scene_goals, "每行一项")}
          </div>
          ${checkboxField("expected_character_ids", "预期出场人物", state.data.characters, draft.expected_character_ids)}
          ${formActions()}
        </form>
      `;
    case "overview":
      return `
        <form class="editor-form" data-form="overview">
          <div class="form-grid form-grid--two">
            ${inputField("book_title", "书名", draft.book_title, { required: true })}
            ${textareaField("pitch", "一句话卖点", draft.pitch, { rows: 3 })}
            ${textareaField("core_theme", "核心主题", draft.core_theme, { rows: 3 })}
            ${textareaField("ending_signal", "结局方向", draft.ending_signal, { rows: 3 })}
            ${textareaField("series_scope", "系列范围", draft.series_scope, { rows: 3 })}
            ${textareaField("narrative_style", "叙事风格", draft.narrative_style, { rows: 3 })}
          </div>
          ${textareaField("synopsis", "全书概要", draft.synopsis, { rows: 7 })}
          ${linesField("active_promises", "长期承诺", draft.active_promises, "每行一项")}
          ${formActions()}
        </form>
      `;
    case "project":
      return `
        <form class="editor-form" data-form="project">
          <div class="form-grid form-grid--two">
            ${inputField("title", "项目名称", draft.title, { required: true })}
            ${selectField("template", "模板", draft.template, [
              { value: "blank", label: "空白项目" },
              { value: "cyber_wuxia", label: "赛博武侠" },
            ])}
          </div>
          ${textareaField("description", "项目描述", draft.description, { rows: 5 })}
          ${formActions("创建项目", "取消")}
        </form>
      `;
    case "preset":
      return `
        <form class="editor-form" data-form="preset">
          <div class="form-grid form-grid--two">
            ${inputField("name", "风格名称", draft.name, { required: true })}
            ${textareaField("description", "风格说明", draft.description, { rows: 4 })}
          </div>
          <p class="muted">会把当前颜色配置、背景显示模式以及当前选中的站点与侧栏背景一起保存为预设。</p>
          ${formActions("保存预设", "取消")}
        </form>
      `;
    default:
      return "";
  }
}

function drawerTitle(form, mode) {
  const map = {
    character: mode === "edit" ? "编辑角色" : "新增角色",
    world: "编辑世界总览",
    location: mode === "edit" ? "编辑场景" : "新增场景",
    faction: mode === "edit" ? "编辑势力" : "新增势力",
    event: mode === "edit" ? "编辑事件" : "新增事件",
    chapter: mode === "edit" ? "编辑章节" : "新增章节",
    overview: "编辑全书总览",
    project: "创建项目",
    preset: "保存风格预设",
  };
  return map[form] || "编辑";
}

function drawerSubtitle(form) {
  const map = {
    character: "完善角色档案、关系树与挂载信息。",
    world: "更新世界总览、地图与核心规则。",
    location: "补充场景属性、资源与角色挂载。",
    faction: "补充势力定位、目标与控制区域。",
    event: "维护事件属性、分支关系与挂载对象。",
    chapter: "整理章节目标、时间跨度与预期角色。",
    overview: "维护全书的大纲、主题与长期承诺。",
    project: "创建一个新的本地写作项目。",
    preset: "把当前界面风格保存成可复用的预设。",
  };
  return map[form] || "";
}

function inputField(name, label, value, options = {}) {
  return `
    <label class="form-field">
      <span>${escapeHtml(label)}</span>
      <input
        name="${name}"
        type="${options.type || "text"}"
        value="${escapeHtml(value ?? "")}"
        ${options.required ? "required" : ""}
        ${options.min ? `min="${options.min}"` : ""}
        ${options.step ? `step="${options.step}"` : ""}
      />
    </label>
  `;
}

function textInputField(name, label, value) {
  return inputField(name, label, value);
}

function colorInputField(name, label, value) {
  return inputField(name, label, toColorValue(value), { type: "color" });
}

function textareaField(name, label, value, options = {}) {
  return `
    <label class="form-field ${options.full ? "form-field--full" : ""}">
      <span>${escapeHtml(label)}</span>
      <textarea name="${name}" rows="${options.rows || 4}">${escapeHtml(value ?? "")}</textarea>
    </label>
  `;
}

function linesField(name, label, values, placeholder) {
  return `
    <label class="form-field">
      <span>${escapeHtml(label)}</span>
      <textarea name="${name}" rows="4" placeholder="${escapeHtml(placeholder)}">${escapeHtml(listToLines(values || []))}</textarea>
    </label>
  `;
}

function selectField(name, label, currentValue, options) {
  return `
    <label class="form-field">
      <span>${escapeHtml(label)}</span>
      <select name="${name}">
        ${options
          .map(
            (option) => `
              <option value="${escapeHtml(option.value)}" ${String(option.value) === String(currentValue) ? "selected" : ""}>
                ${escapeHtml(option.label)}
              </option>
            `,
          )
          .join("")}
      </select>
    </label>
  `;
}

function imageField(name, label, currentValue, hiddenName) {
  return `
    <label class="form-field form-field--image">
      <span>${escapeHtml(label)}</span>
      <div class="image-picker">
        <img src="${currentValue}" alt="${escapeHtml(label)}" />
        <input name="${name}" type="file" accept="image/*" />
        <input name="${hiddenName}" type="hidden" value="${escapeHtml(currentValue)}" />
      </div>
    </label>
  `;
}

function checkboxField(name, label, items, selectedIds = []) {
  return `
    <section class="form-section">
      <div class="form-section__header">
        <div>
          <h4>${escapeHtml(label)}</h4>
        </div>
      </div>
      <div class="checkbox-grid">
        ${
          items.length
            ? items
                .map(
                  (item) => `
                    <label class="checkbox-chip">
                      <input type="checkbox" name="${name}" value="${item.id}" ${selectedIds.includes(item.id) ? "checked" : ""} />
                      <span>${escapeHtml(item.title || item.name)}</span>
                    </label>
                  `,
                )
                .join("")
            : `<div class="empty-state inline-empty">暂无可选项。</div>`
        }
      </div>
    </section>
  `;
}

function relationEditorRow(relationship, currentCharacterId) {
  return `
    <article class="relation-row" data-relation-id="${escapeHtml(relationship.id || uid("rel"))}">
      <div class="form-grid form-grid--two">
        ${selectField(
          "relation_target",
          "目标角色",
          relationship.target_character_id || "",
          [
            { value: "", label: "请选择角色" },
            ...state.data.characters
              .filter((item) => item.id !== currentCharacterId)
              .map((item) => ({ value: item.id, label: item.name })),
          ],
        )}
        ${inputField("relation_label", "关系标签", relationship.label || "")}
        ${inputField("relation_status", "关系状态", relationship.status || "")}
        ${textareaField("relation_notes", "关系备注", relationship.notes || "", { rows: 3 })}
      </div>
      <label class="form-field">
        <span>共享事件</span>
        <select name="shared_event_ids" multiple size="4">
          ${state.data.events
            .map(
              (event) => `
                <option value="${event.id}" ${relationship.shared_event_ids?.includes(event.id) ? "selected" : ""}>
                  ${escapeHtml(event.title)}
                </option>
              `,
            )
            .join("")}
        </select>
      </label>
      <div class="detail-footer detail-footer--compact">
        <button class="danger-button" data-action="remove-relation-row" type="button">移除关系</button>
      </div>
    </article>
  `;
}

function formActions(primaryText = "保存", secondaryText = "取消") {
  return `
    <div class="form-actions">
      <button class="primary-button" type="submit">${escapeHtml(primaryText)}</button>
      <button class="ghost-button" type="button" data-action="close-drawer">${escapeHtml(secondaryText)}</button>
    </div>
  `;
}

function metaTile(label, value) {
  return `
    <div class="meta-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "待补充")}</strong>
    </div>
  `;
}

function statCard(label, value, note) {
  return `
    <article class="stat-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </article>
  `;
}

function chipList(values = [], chipClass = "tag-chip") {
  const filtered = values.filter(Boolean);
  if (!filtered.length) {
    return `<span class="muted">鏆傛棤</span>`;
  }

  return `
    <div class="chip-row">
      ${filtered.map((value) => `<span class="${chipClass}">${escapeHtml(value)}</span>`).join("")}
    </div>
  `;
}

function chipSection(title, values) {
  return `
    <div class="chip-section">
      <span>${escapeHtml(title)}</span>
      ${chipList(values, "tag-chip")}
    </div>
  `;
}

function entityPills(items, emptyTitle) {
  if (!items.length) {
    return `<div class="empty-state inline-empty">${escapeHtml(emptyTitle)}</div>`;
  }

  return `
    <div class="pill-list">
      ${items
        .map(
          (item) => `
            <span class="entity-pill">
              <strong>${escapeHtml(item.title || item.name)}</strong>
              <small>${escapeHtml(item.alias || item.summary || item.role || item.type || item.identity || item.story_time || "")}</small>
            </span>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderToast() {
  if (!state.toast) return "";
  return `
    <div class="toast toast--${state.toast.kind}">
      <strong>${escapeHtml(state.toast.message)}</strong>
    </div>
  `;
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const { action } = target.dataset;

  if (action === "select-view") {
    state.activeView = target.dataset.view;
    render();
    return;
  }

  if (action === "toggle-edit") {
    const view = target.dataset.view;
    state.editModes[view] = !state.editModes[view];
    render();
    return;
  }

  if (action === "open-drawer") {
    openDrawer(target.dataset.form, target.dataset.id || null);
    return;
  }

  if (action === "close-drawer") {
    closeDrawer();
    return;
  }

  if (action === "select-chapter") {
    state.selectedChapterId = target.dataset.id;
    render();
    return;
  }

  if (action === "select-event") {
    updateSelectedEvent(target.dataset.id);
    return;
  }

  if (action === "jump-event") {
    state.activeView = "events";
    state.selectedEventId = target.dataset.id;
    render();
    return;
  }

  if (action === "create-event-branch") {
    openDrawer("event", null, { parentId: target.dataset.id });
    return;
  }

  if (action === "delete-entity") {
    deleteEntity(target.dataset.entity, target.dataset.id);
    return;
  }

  if (action === "export-data") {
    exportState();
    notify("导出已开始。");
    return;
  }

  if (action === "trigger-import-new") {
    document.getElementById("import-new-input")?.click();
    return;
  }

  if (action === "trigger-import-replace") {
    document.getElementById("import-replace-input")?.click();
    return;
  }

  if (action === "trigger-background-upload") {
    document.getElementById(target.dataset.target)?.click();
    return;
  }

  if (action === "delete-background") {
    deleteBackground(target.dataset.scope, target.dataset.id);
    return;
  }

  if (action === "toggle-theme-background") {
    toggleThemeBackground(target.dataset.scope, target.dataset.id);
    return;
  }

  if (action === "apply-theme-background-now") {
    applyThemeBackgroundNow(target.dataset.scope, target.dataset.id);
    return;
  }

  if (action === "apply-preset") {
    applyPreset(target.dataset.id);
    return;
  }

  if (action === "bind-preset") {
    bindPresetToProject(target.dataset.id);
    return;
  }

  if (action === "unbind-project-style") {
    unbindProjectStyle();
    return;
  }

  if (action === "delete-preset") {
    deletePreset(target.dataset.id);
    return;
  }

  if (action === "save-current-as-default") {
    saveCurrentAsDefault();
    return;
  }

  if (action === "switch-project") {
    handleProjectSwitch(target.dataset.id);
    return;
  }

  if (action === "add-relation-row") {
    const list = document.getElementById("relation-editor-list");
    if (!list) return;

    if (list.querySelector(".empty-state")) {
      list.innerHTML = "";
    }

    list.insertAdjacentHTML("beforeend", relationEditorRow(blankRelationship(target.dataset.ownerId), target.dataset.ownerId));
    return;
  }

  if (action === "remove-relation-row") {
    target.closest(".relation-row")?.remove();
    const list = document.getElementById("relation-editor-list");
    if (list && !list.children.length) {
      list.innerHTML = `<div class="empty-state inline-empty">还没有关系，点击右上角可新增。</div>`;
    }
  }
}

async function handleChange(event) {
  const input = event.target;

  if (input.id === "import-new-input" && input.files?.[0]) {
    await handleImport(input.files[0], "new_project");
    input.value = "";
    return;
  }

  if (input.id === "import-replace-input" && input.files?.[0]) {
    await handleImport(input.files[0], "replace_active", state.data.project_id);
    input.value = "";
    return;
  }

  if (input.dataset.uploadScope && input.files?.length) {
    const scope = input.dataset.uploadScope;
    const assets = await Promise.all(Array.from(input.files).map(fileToAsset));
    input.value = "";
    await produce((draft) => {
      if (scope === "site") {
        draft.settings.site_backgrounds.push(...assets);
      } else {
        draft.settings.sidebar_backgrounds.push(...assets);
      }
    }, "背景图片已添加。");
  }
}

async function handleImport(file, mode, targetProjectId = null) {
  try {
    state.saving = true;
    render();
    const payload = await importState(file, mode, targetProjectId);
    applyBootstrap(payload, mode === "new_project" ? "导入成功，已创建新项目。" : "导入成功，当前项目已被替换。");
  } catch (error) {
    state.saving = false;
    render();
    notify(error.message || "操作失败。", "error");
  }
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  event.preventDefault();

  switch (form.dataset.form) {
    case "character":
      await submitCharacter(form);
      return;
    case "world":
      await submitWorld(form);
      return;
    case "location":
      await submitLocation(form);
      return;
    case "faction":
      await submitFaction(form);
      return;
    case "event":
      await submitEvent(form);
      return;
    case "chapter":
      await submitChapter(form);
      return;
    case "overview":
      await submitOverview(form);
      return;
    case "project":
      await submitProject(form);
      return;
    case "preset":
      await submitPreset(form);
      return;
    case "theme-editor":
      await submitThemeEditor(form);
      return;
    default:
      return;
  }
}

async function submitCharacter(form) {
  const fields = form.elements;
  const nextCharacter = {
    id: form.dataset.id,
    name: fields.name.value.trim(),
    alias: fields.alias.value.trim(),
    tagline: fields.tagline.value.trim(),
    summary: fields.summary.value.trim(),
    role: fields.role.value.trim(),
    status: fields.status.value.trim(),
    archetype: fields.archetype.value.trim(),
    voice_style: fields.voice_style.value.trim(),
    signature_item: fields.signature_item.value.trim(),
    arc_stage: fields.arc_stage.value.trim(),
    accent_color: fields.accent_color.value,
    image: await resolveImage(fields.image_upload, fields.image_current.value),
    abilities: linesToList(fields.abilities.value),
    personality: linesToList(fields.personality.value),
    motivations: linesToList(fields.motivations.value),
    fears: linesToList(fields.fears.value),
    secrets: linesToList(fields.secrets.value),
    theme_keywords: linesToList(fields.theme_keywords.value),
    background_story: fields.background_story.value.trim(),
    appearance_notes: fields.appearance_notes.value.trim(),
    notes: fields.notes.value.trim(),
    relationships: Array.from(form.querySelectorAll(".relation-row"))
      .map((row) => {
        const selectedOptions = Array.from(row.querySelector('select[name="shared_event_ids"]').selectedOptions).map(
          (option) => option.value,
        );
        return {
          id: row.dataset.relationId || uid("rel"),
          target_character_id: row.querySelector('[name="relation_target"]').value,
          label: row.querySelector('[name="relation_label"]').value.trim(),
          status: row.querySelector('[name="relation_status"]').value.trim(),
          notes: row.querySelector('[name="relation_notes"]').value.trim(),
          shared_event_ids: selectedOptions,
        };
      })
      .filter((item) => item.target_character_id),
  };

  const saved = await produce((draft) => {
    upsertById(draft.characters, nextCharacter);
  }, "角色已保存。");

  if (saved) closeDrawer();
}

async function submitWorld(form) {
  const fields = form.elements;
  const nextWorld = {
    title: fields.title.value.trim(),
    era: fields.era.value.trim(),
    premise: fields.premise.value.trim(),
    atmosphere: fields.atmosphere.value.trim(),
    central_conflict: fields.central_conflict.value.trim(),
    cosmic_rule: fields.cosmic_rule.value.trim(),
    technology_level: fields.technology_level.value.trim(),
    mystery_system: fields.mystery_system.value.trim(),
    travel_system: fields.travel_system.value.trim(),
    calendar_system: fields.calendar_system.value.trim(),
    map_image: await resolveImage(fields.map_image_upload, fields.map_image_current.value),
    recurring_motifs: linesToList(fields.recurring_motifs.value),
  };

  const saved = await produce((draft) => {
    draft.world = nextWorld;
  }, "世界观已保存。");

  if (saved) closeDrawer();
}

async function submitLocation(form) {
  const fields = form.elements;
  const nextLocation = {
    id: form.dataset.id,
    name: fields.name.value.trim(),
    type: fields.type.value.trim(),
    summary: fields.summary.value.trim(),
    purpose: fields.purpose.value.trim(),
    tone: fields.tone.value.trim(),
    climate: fields.climate.value.trim(),
    danger_level: fields.danger_level.value.trim(),
    description: fields.description.value.trim(),
    image: await resolveImage(fields.image_upload, fields.image_current.value),
    tags: linesToList(fields.tags.value),
    landmarks: linesToList(fields.landmarks.value),
    resources: linesToList(fields.resources.value),
    character_ids: checkedValues(form, "character_ids"),
    faction_ids: checkedValues(form, "faction_ids"),
  };

  const saved = await produce((draft) => {
    upsertById(draft.locations, nextLocation);
  }, "场景已保存。");

  if (saved) closeDrawer();
}

async function submitFaction(form) {
  const fields = form.elements;
  const nextFaction = {
    id: form.dataset.id,
    name: fields.name.value.trim(),
    summary: fields.summary.value.trim(),
    description: fields.description.value.trim(),
    identity: fields.identity.value.trim(),
    goal: fields.goal.value.trim(),
    methods: fields.methods.value.trim(),
    emblem_color: fields.emblem_color.value,
    values: linesToList(fields.values.value),
    resources: linesToList(fields.resources.value),
    tension_points: linesToList(fields.tension_points.value),
    territory_location_ids: checkedValues(form, "territory_location_ids"),
    character_ids: checkedValues(form, "character_ids"),
  };

  const saved = await produce((draft) => {
    upsertById(draft.factions, nextFaction);
  }, "势力已保存。");

  if (saved) closeDrawer();
}

async function submitEvent(form) {
  const fields = form.elements;
  const nextEvent = {
    id: form.dataset.id,
    title: fields.title.value.trim(),
    summary: fields.summary.value.trim(),
    description: fields.description.value.trim(),
    story_time: fields.story_time.value.trim(),
    sequence: Number(fields.sequence.value || 0),
    chapter_id: fields.chapter_id.value || null,
    parent_id: fields.parent_id.value || null,
    branch_label: fields.branch_label.value.trim(),
    purpose: fields.purpose.value.trim(),
    outcome: fields.outcome.value.trim(),
    consequence: fields.consequence.value.trim(),
    stakes: fields.stakes.value.trim(),
    mood: fields.mood.value.trim(),
    status: fields.status.value,
    tags: linesToList(fields.tags.value),
    foreshadowing: linesToList(fields.foreshadowing.value),
    unresolved_threads: linesToList(fields.unresolved_threads.value),
    character_ids: checkedValues(form, "character_ids"),
    faction_ids: checkedValues(form, "faction_ids"),
    location_id: fields.location_id.value || null,
  };

  if (!isValidParent(nextEvent.id, nextEvent.parent_id)) {
    notify("父事件不能指向自己或自己的子事件。", "error");
    return;
  }

  const saved = await produce((draft) => {
    upsertById(draft.events, nextEvent);
  }, "事件已保存。");

  if (saved) {
    state.selectedEventId = nextEvent.id;
    closeDrawer();
  }
}

async function submitChapter(form) {
  const fields = form.elements;
  const nextChapter = {
    id: form.dataset.id,
    title: fields.title.value.trim(),
    subtitle: fields.subtitle.value.trim(),
    sequence: Number(fields.sequence.value || 1),
    summary: fields.summary.value.trim(),
    objective: fields.objective.value.trim(),
    timeline_span: fields.timeline_span.value.trim(),
    focus_question: fields.focus_question.value.trim(),
    hook: fields.hook.value.trim(),
    pacing_note: fields.pacing_note.value.trim(),
    scene_goals: linesToList(fields.scene_goals.value),
    expected_character_ids: checkedValues(form, "expected_character_ids"),
  };

  const saved = await produce((draft) => {
    upsertById(draft.overview.chapters, nextChapter);
  }, "章节已保存。");

  if (saved) {
    state.selectedChapterId = nextChapter.id;
    closeDrawer();
  }
}

async function submitOverview(form) {
  const fields = form.elements;
  const nextOverview = {
    ...state.data.overview,
    book_title: fields.book_title.value.trim(),
    pitch: fields.pitch.value.trim(),
    synopsis: fields.synopsis.value.trim(),
    core_theme: fields.core_theme.value.trim(),
    ending_signal: fields.ending_signal.value.trim(),
    series_scope: fields.series_scope.value.trim(),
    narrative_style: fields.narrative_style.value.trim(),
    active_promises: linesToList(fields.active_promises.value),
  };

  const saved = await produce((draft) => {
    draft.overview = nextOverview;
    draft.project_title = nextOverview.book_title || draft.project_title;
  }, "总览已保存。");

  if (saved) closeDrawer();
}

async function submitProject(form) {
  const fields = form.elements;
  const payload = {
    title: fields.title.value.trim(),
    description: fields.description.value.trim(),
    template: fields.template.value,
  };

  if (!payload.title) {
    notify("请先填写项目名称。", "error");
    return;
  }

  try {
    state.saving = true;
    render();
    const bootstrap = await createProject(payload);
    closeDrawer();
    state.activeView = "settings";
    applyBootstrap(bootstrap, "项目已创建。");
  } catch (error) {
    state.saving = false;
    render();
    notify(error.message || "操作失败。", "error");
  }
}

async function submitPreset(form) {
  const fields = form.elements;
  const nextPreset = {
    id: `preset-${uid("style")}`,
    name: fields.name.value.trim(),
    description: fields.description.value.trim(),
    built_in: false,
    created_at: new Date().toISOString(),
    theme: {
      ...blankTheme(state.data.settings.current_theme),
    },
  };

  if (!nextPreset.name) {
    notify("请输入风格名称。", "error");
    return;
  }

  const saved = await produce((draft) => {
    draft.settings.style_presets.push(nextPreset);
    draft.settings.active_style_preset_id = nextPreset.id;
  }, "风格预设已保存。");

  if (saved) closeDrawer();
}

async function submitThemeEditor(form) {
  const fields = form.elements;
  const nextTheme = {
    ...blankTheme(state.data.settings.current_theme),
    border_color: themeColorValue("border_color", fields.border_color.value),
    border_color_strong: themeColorValue("border_color_strong", fields.border_color_strong.value),
    ui_background: themeColorValue("ui_background", fields.ui_background.value),
    ui_background_alt: themeColorValue("ui_background_alt", fields.ui_background_alt.value),
    panel_background: themeColorValue("panel_background", fields.panel_background.value),
    panel_background_alt: themeColorValue("panel_background_alt", fields.panel_background_alt.value),
    soft_panel_background: themeColorValue("soft_panel_background", fields.soft_panel_background.value),
    title_color: themeColorValue("title_color", fields.title_color.value),
    text_color: themeColorValue("text_color", fields.text_color.value),
    muted_text_color: themeColorValue("muted_text_color", fields.muted_text_color.value),
    accent_color: themeColorValue("accent_color", fields.accent_color.value),
    accent_secondary_color: themeColorValue("accent_secondary_color", fields.accent_secondary_color.value),
    accent_tertiary_color: themeColorValue("accent_tertiary_color", fields.accent_tertiary_color.value),
    primary_button_background: themeColorValue("primary_button_background", fields.primary_button_background.value),
    primary_button_text_color: themeColorValue("primary_button_text_color", fields.primary_button_text_color.value),
    secondary_button_background: themeColorValue("secondary_button_background", fields.secondary_button_background.value),
    secondary_button_text_color: themeColorValue("secondary_button_text_color", fields.secondary_button_text_color.value),
    danger_button_background: themeColorValue("danger_button_background", fields.danger_button_background.value),
    danger_button_text_color: themeColorValue("danger_button_text_color", fields.danger_button_text_color.value),
    topbar_background: themeColorValue("topbar_background", fields.topbar_background.value),
    topbar_border_color: themeColorValue("topbar_border_color", fields.topbar_border_color.value),
    sidebar_tint: themeColorValue("sidebar_tint", fields.sidebar_tint.value),
    site_overlay: themeColorValue("site_overlay", fields.site_overlay.value),
    background_display_mode: fields.background_display_mode.value,
  };

  await produce((draft) => {
    draft.settings.background_rotation_seconds = Number(fields.background_rotation_seconds.value || 60);
    draft.settings.current_theme = nextTheme;
    draft.settings.active_style_preset_id = null;
    draft.settings.project_bound_style_preset_id = null;
  }, "界面风格已保存。");
}

function checkedValues(container, name) {
  return Array.from(container.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
}

async function resolveImage(fileInput, currentValue) {
  if (fileInput?.files?.[0]) {
    return fileToDataUrl(fileInput.files[0]);
  }
  return currentValue;
}

async function fileToAsset(file) {
  return {
    id: uid("bg"),
    name: file.name.replace(/\.[^.]+$/, ""),
    data_url: await fileToDataUrl(file),
    added_at: new Date().toISOString(),
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

async function produce(mutator, successMessage) {
  try {
    state.saving = true;
    render();
    const draft = structuredClone(state.data);
    await mutator(draft);
    const saved = await saveState(draft);
    state.data = saved;
    state.workspace = await fetchWorkspace();
    initializeSelections();
    applyThemeCss();
    chooseInitialBackgrounds();
    startBackgroundRotation();
    setToast(successMessage);
    return true;
  } catch (error) {
    setToast(error.message || "保存失败。", "error");
    return false;
  } finally {
    state.saving = false;
    render();
  }
}

function openDrawer(form, id, options = {}) {
  let draft;
  let mode = id ? "edit" : "create";

  switch (form) {
    case "character":
      draft = id ? structuredClone(getCharacter(id) || blankCharacter()) : blankCharacter();
      break;
    case "world":
      draft = blankWorld(state.data.world);
      mode = "edit";
      break;
    case "location":
      draft = id ? structuredClone(getLocation(id) || blankLocation()) : blankLocation();
      break;
    case "faction":
      draft = id ? structuredClone(getFaction(id) || blankFaction()) : blankFaction();
      break;
    case "event":
      draft = id ? structuredClone(getEvent(id) || blankEvent()) : blankEvent();
      if (!id && options.parentId) {
        const parent = getEvent(options.parentId);
        if (parent) {
          draft.parent_id = parent.id;
          draft.chapter_id = parent.chapter_id;
          draft.sequence = Number(parent.sequence || 0) + 5;
          draft.story_time = parent.story_time;
          draft.location_id = parent.location_id;
        }
      }
      break;
    case "chapter":
      draft = id
        ? structuredClone(getChapter(id) || blankChapter((state.data.overview.chapters?.length || 0) + 1))
        : blankChapter((state.data.overview.chapters?.length || 0) + 1);
      break;
    case "overview":
      draft = structuredClone(state.data.overview);
      mode = "edit";
      break;
    case "project":
      draft = blankProjectForm();
      mode = "create";
      break;
    case "preset":
      draft = blankPresetForm();
      mode = "create";
      break;
    default:
      return;
  }

  state.drawer = { form, mode, draft, meta: options };
  render();
}

function closeDrawer() {
  state.drawer = null;
  render();
}

async function handleProjectSwitch(projectId) {
  try {
    const payload = await switchProject(projectId);
    applyBootstrap(payload, "项目已切换。");
  } catch (error) {
    notify(error.message || "操作失败。", "error");
  }
}

async function applyPreset(presetId) {
  const preset = findPresetById(presetId);
  if (!preset) return;

  await produce((draft) => {
    draft.settings.current_theme = structuredClone(preset.theme);
    draft.settings.active_style_preset_id = preset.id;
  }, `已应用风格：${preset.name}`);
}

async function bindPresetToProject(presetId) {
  const preset = findPresetById(presetId);
  if (!preset) return;

  await produce((draft) => {
    draft.settings.current_theme = structuredClone(preset.theme);
    draft.settings.active_style_preset_id = preset.id;
    draft.settings.project_bound_style_preset_id = preset.id;
  }, `当前项目已绑定风格：${preset.name}`);
}

async function unbindProjectStyle() {
  await produce((draft) => {
    draft.settings.project_bound_style_preset_id = null;
  }, "项目风格绑定已解除。");
}

async function deletePreset(presetId) {
  const preset = findPresetById(presetId);
  if (!preset) return;

  const confirmed = window.confirm(`确定要删除风格预设「${preset.name}」吗？`);
  if (!confirmed) return;

  await produce((draft) => {
    draft.settings.style_presets = draft.settings.style_presets.filter((item) => item.id !== presetId);
    if (draft.settings.active_style_preset_id === presetId) {
      draft.settings.active_style_preset_id = null;
    }
    if (draft.settings.project_bound_style_preset_id === presetId) {
      draft.settings.project_bound_style_preset_id = null;
    }
  }, "风格预设已删除。");
}

async function saveCurrentAsDefault() {
  await produce((draft) => {
    const defaultId = "preset-default";
    const existing = draft.settings.style_presets.find((item) => item.id === defaultId);
    const nextTheme = {
      ...blankTheme(draft.settings.current_theme),
    };

    if (existing) {
      existing.name = "星图默认";
      existing.description = "当前保存的默认界面风格";
      existing.theme = nextTheme;
    } else {
      draft.settings.style_presets.unshift({
        id: defaultId,
        name: "星图默认",
        description: "当前保存的默认界面风格",
        built_in: true,
        created_at: new Date().toISOString(),
        theme: nextTheme,
      });
    }

    draft.settings.active_style_preset_id = defaultId;
  }, "当前风格已保存为默认预设。");
}

function syncThemeBackgroundUi() {
  applyThemeCss();
  applyBackgroundCss();
  refreshTopbar();
  if (state.activeView === "settings") {
    refreshMainStage();
  }
  refreshToast();
}

async function persistThemeBackgroundChange(successMessage, previousState, previousBackgrounds) {
  try {
    const saved = await saveState(structuredClone(state.data));
    state.data = saved;
    state.workspace = await fetchWorkspace();
    initializeSelections();
    applyThemeCss();
    chooseInitialBackgrounds();
    startBackgroundRotation();
    setToast(successMessage);
    refreshTopbar();
    if (state.activeView === "settings") {
      refreshMainStage();
    }
    refreshToast();
  } catch (error) {
    state.data = previousState;
    state.currentBackgrounds = previousBackgrounds;
    applyThemeCss();
    applyBackgroundCss();
    refreshTopbar();
    if (state.activeView === "settings") {
      refreshMainStage();
    }
    notify(error.message || "应用背景失败。", "error");
  }
}

async function toggleThemeBackground(scope, id) {
  const previousState = structuredClone(state.data);
  const previousBackgrounds = {
    site: state.currentBackgrounds.site,
    sidebar: state.currentBackgrounds.sidebar,
  };
  const collection = scope === "site" ? state.data.settings.site_backgrounds : state.data.settings.sidebar_backgrounds;
  const target = collection.find((item) => item.id === id);
  if (!target) return;

  state.data.settings.active_style_preset_id = null;
  state.data.settings.project_bound_style_preset_id = null;

  const ids = themeBackgroundIds(scope, state.data.settings.current_theme);
  const isSelected = ids.includes(id);
  const nextIds = isSelected ? ids.filter((item) => item !== id) : [...ids, id];
  setThemeBackgroundIds(state.data.settings.current_theme, scope, nextIds);

  if (!isSelected) {
    state.currentBackgrounds[scope] = target;
  } else if (state.currentBackgrounds[scope]?.id === id) {
    state.currentBackgrounds[scope] = resolveCurrentBackground(scope);
  }

  syncThemeBackgroundUi();
  await persistThemeBackgroundChange(
    isSelected ? "已移出当前风格背景轮播。" : "已加入当前风格背景轮播。",
    previousState,
    previousBackgrounds,
  );
}

async function applyThemeBackgroundNow(scope, id) {
  const previousState = structuredClone(state.data);
  const previousBackgrounds = {
    site: state.currentBackgrounds.site,
    sidebar: state.currentBackgrounds.sidebar,
  };
  const collection = scope === "site" ? state.data.settings.site_backgrounds : state.data.settings.sidebar_backgrounds;
  const target = collection.find((item) => item.id === id);
  if (!target) return;

  state.data.settings.active_style_preset_id = null;
  state.data.settings.project_bound_style_preset_id = null;

  const ids = themeBackgroundIds(scope, state.data.settings.current_theme);
  setThemeBackgroundIds(
    state.data.settings.current_theme,
    scope,
    [id, ...ids.filter((item) => item !== id)],
  );
  state.currentBackgrounds[scope] = target;

  syncThemeBackgroundUi();
  await persistThemeBackgroundChange("背景已立即应用。", previousState, previousBackgrounds);
}

async function deleteBackground(scope, id) {
  const confirmed = window.confirm("确定要移除这张背景图吗？");
  if (!confirmed) return;

  await produce((draft) => {
    if (scope === "site") {
      draft.settings.site_backgrounds = draft.settings.site_backgrounds.filter((item) => item.id !== id);
      setThemeBackgroundIds(
        draft.settings.current_theme,
        scope,
        themeBackgroundIds(scope, draft.settings.current_theme).filter((item) => item !== id),
      );
    } else {
      draft.settings.sidebar_backgrounds = draft.settings.sidebar_backgrounds.filter((item) => item.id !== id);
      setThemeBackgroundIds(
        draft.settings.current_theme,
        scope,
        themeBackgroundIds(scope, draft.settings.current_theme).filter((item) => item !== id),
      );
    }
  }, "背景图已移除。");
}

async function deleteEntity(entity, id) {
  const labels = {
    character: "角色",
    location: "场景",
    faction: "势力",
    event: "事件",
    chapter: "章节",
  };

  const confirmed = window.confirm(`确定要删除这个${labels[entity] || "条目"}吗？关联引用也会一并清理。`);
  if (!confirmed) return;

  await produce((draft) => {
    if (entity === "character") {
      draft.characters = draft.characters.filter((item) => item.id !== id);
      draft.characters.forEach((character) => {
        character.relationships = character.relationships.filter((item) => item.target_character_id !== id);
      });
      draft.locations.forEach((location) => {
        location.character_ids = location.character_ids.filter((item) => item !== id);
      });
      draft.factions.forEach((faction) => {
        faction.character_ids = faction.character_ids.filter((item) => item !== id);
      });
      draft.events.forEach((event) => {
        event.character_ids = event.character_ids.filter((item) => item !== id);
      });
      draft.overview.chapters.forEach((chapter) => {
        chapter.expected_character_ids = chapter.expected_character_ids.filter((item) => item !== id);
      });
    }

    if (entity === "location") {
      draft.locations = draft.locations.filter((item) => item.id !== id);
      draft.factions.forEach((faction) => {
        faction.territory_location_ids = faction.territory_location_ids.filter((item) => item !== id);
      });
      draft.events.forEach((event) => {
        if (event.location_id === id) event.location_id = null;
      });
    }

    if (entity === "faction") {
      draft.factions = draft.factions.filter((item) => item.id !== id);
      draft.locations.forEach((location) => {
        location.faction_ids = location.faction_ids.filter((item) => item !== id);
      });
      draft.events.forEach((event) => {
        event.faction_ids = event.faction_ids.filter((item) => item !== id);
      });
    }

    if (entity === "event") {
      const removed = draft.events.find((item) => item.id === id);
      draft.events = draft.events.filter((item) => item.id !== id);
      draft.events.forEach((event) => {
        if (event.parent_id === id) {
          event.parent_id = removed?.parent_id || null;
        }
      });
      draft.characters.forEach((character) => {
        character.relationships.forEach((relationship) => {
          relationship.shared_event_ids = relationship.shared_event_ids.filter((item) => item !== id);
        });
      });
      if (state.selectedEventId === id) {
        state.selectedEventId = draft.events[0]?.id || null;
      }
    }

    if (entity === "chapter") {
      draft.overview.chapters = draft.overview.chapters.filter((item) => item.id !== id);
      draft.events.forEach((event) => {
        if (event.chapter_id === id) event.chapter_id = null;
      });
      if (state.selectedChapterId === id) {
        state.selectedChapterId = draft.overview.chapters[0]?.id || null;
      }
    }
  }, `${labels[entity] || "条目"}已删除。`);
}

function upsertById(collection, item) {
  const index = collection.findIndex((entry) => entry.id === item.id);
  if (index >= 0) {
    collection[index] = item;
  } else {
    collection.push(item);
  }
}

function parentEventOptions(currentId) {
  const banned = new Set([currentId, ...getDescendantIds(currentId)]);
  return sortBySequence(state.data.events)
    .filter((item) => !banned.has(item.id))
    .map((item) => ({ value: item.id, label: item.title }));
}

function getDescendantIds(id) {
  const result = [];
  const stack = state.data.events.filter((item) => item.parent_id === id);
  while (stack.length) {
    const current = stack.pop();
    result.push(current.id);
    stack.push(...state.data.events.filter((item) => item.parent_id === current.id));
  }
  return result;
}

function isValidParent(eventId, parentId) {
  if (!parentId) return true;
  if (eventId === parentId) return false;
  const descendants = new Set(getDescendantIds(eventId));
  return !descendants.has(parentId);
}

function getRootEvent(id) {
  let current = getEvent(id);
  while (current?.parent_id) {
    const parent = getEvent(current.parent_id);
    if (!parent) break;
    current = parent;
  }
  return current;
}

function getEventLineage(id) {
  const lineage = [];
  let current = getEvent(id);
  while (current) {
    lineage.unshift(current);
    if (!current.parent_id) break;
    current = getEvent(current.parent_id);
  }
  return lineage;
}

function getEventChildren(id) {
  return sortBySequence(state.data.events.filter((item) => item.parent_id === id));
}

function getChapterCharacters(chapterId) {
  const chapter = getChapter(chapterId);
  if (!chapter) return [];

  const ids = new Set(chapter.expected_character_ids);
  state.data.events
    .filter((event) => event.chapter_id === chapterId)
    .forEach((event) => event.character_ids.forEach((characterId) => ids.add(characterId)));

  return Array.from(ids)
    .map((id) => getCharacter(id))
    .filter(Boolean);
}

function getCharacter(id) {
  return state.data.characters.find((item) => item.id === id);
}

function getLocation(id) {
  return state.data.locations.find((item) => item.id === id);
}

function getFaction(id) {
  return state.data.factions.find((item) => item.id === id);
}

function getEvent(id) {
  return state.data.events.find((item) => item.id === id);
}

function getChapter(id) {
  return state.data.overview.chapters.find((item) => item.id === id);
}

function getActiveProjectSummary() {
  return state.workspace?.projects?.find((item) => item.id === state.workspace.active_project_id) || null;
}

function getActivePreset() {
  return findPresetById(state.data?.settings?.active_style_preset_id) || null;
}

function getBoundPreset() {
  return findPresetById(state.data?.settings?.project_bound_style_preset_id) || null;
}

function findPresetById(id) {
  if (!id) return null;
  return state.data?.settings?.style_presets?.find((item) => item.id === id) || null;
}

function notify(message, kind = "success") {
  setToast(message, kind);
  refreshToast();
}

function toColorValue(value) {
  if (typeof value !== "string") {
    return "#7ce5ff";
  }

  const normalized = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized;
  }

  const shortHex = normalized.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHex) {
    const expanded = shortHex[1].split("").map((part) => `${part}${part}`).join("");
    return `#${expanded}`;
  }


  const rgbMatch = normalized.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return `#${rgbMatch
      .slice(1, 4)
      .map((part) => Number(part).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  return "#7ce5ff";
}

function hexToRgba(hex, alpha) {
  const normalized = toColorValue(hex).replace("#", "");
  const [red, green, blue] = [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function themeColorValue(name, value) {
  const normalized = toColorValue(value);
  return Object.hasOwn(THEME_ALPHA_MAP, name) ? hexToRgba(normalized, THEME_ALPHA_MAP[name]) : normalized;
}

function formatDate(value) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

