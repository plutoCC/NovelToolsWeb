# 星图写作台导出格式说明

## 文档目的

这份文档说明导出文件中每个结构、每个字段的含义，方便：

- 在不同设备之间迁移项目
- 做备份
- 把存档数据交给其他 AI / Chat 模型做剧情、人物、设定、逻辑分析

如果你的目标是“分析小说逻辑”，最重要的数据通常是：

- `payload.characters`
- `payload.world`
- `payload.locations`
- `payload.factions`
- `payload.events`
- `payload.overview`

纯视觉相关的数据，例如角色图片、地图图片、背景图 `data_url`，通常可以忽略或替换成占位文本，不影响剧情分析。

---

## 1. 导出文件顶层结构

导出文件是一个 `UTF-8` 编码的 `JSON` 文件，顶层结构如下：

```json
{
  "format": "novel-tools.export.v2",
  "exported_at": "2026-03-17T12:34:56.000000+00:00",
  "project_title": "项目标题",
  "project_id": "project-example",
  "payload": {
    "...": "当前项目完整数据"
  }
}
```

### 顶层字段说明

- `format`
  导出格式版本号。当前固定为 `novel-tools.export.v2`。
- `exported_at`
  本次导出的时间，`ISO 8601` 格式。
- `project_title`
  导出时项目标题，便于肉眼识别。
- `project_id`
  项目的内部唯一 ID。
- `payload`
  项目的完整内容数据，也就是小说分析真正需要读取的主体。

---

## 2. payload 总体结构

`payload.version` 当前为 `novel-tools.state.v2`。

`payload` 对应一个完整的小说项目状态，结构如下：

```json
{
  "version": "novel-tools.state.v2",
  "project_id": "project-example",
  "project_slug": "example-project",
  "project_title": "项目标题",
  "project_description": "项目简介",
  "last_updated": "2026-03-17T12:34:56.000000+00:00",
  "characters": [],
  "world": {},
  "locations": [],
  "factions": [],
  "events": [],
  "overview": {},
  "settings": {}
}
```

### payload 顶层字段说明

- `version`
  项目状态格式版本号。
- `project_id`
  当前项目的唯一内部 ID。适合程序引用，不适合作为展示标题。
- `project_slug`
  项目的可读型短标识，通常用于导出文件名、目录名。
- `project_title`
  当前项目标题，也可以理解为这本书 / 这套设定项目的名称。
- `project_description`
  当前项目的一段说明，用来描述项目方向、风格、目标等。
- `last_updated`
  项目最近一次保存时间。注意：这是“编辑时间”，不是故事内时间。
- `characters`
  全部角色数据列表。
- `world`
  世界观总览对象。
- `locations`
  全部场景 / 地点数据列表。
- `factions`
  全部势力数据列表。
- `events`
  全部故事事件数据列表。
- `overview`
  整体大纲与章节结构。
- `settings`
  网站显示、背景图、风格预设等工具配置。分析小说逻辑时通常不是重点。

---

## 3. Character 角色结构

`payload.characters` 是角色数组，每一项结构如下：

```json
{
  "id": "char-example",
  "name": "角色名",
  "alias": "别名",
  "tagline": "一句话标签",
  "summary": "角色简述",
  "role": "角色作用",
  "status": "角色状态",
  "archetype": "角色原型",
  "voice_style": "说话风格",
  "signature_item": "标志物",
  "arc_stage": "人物弧阶段",
  "accent_color": "#7ce5ff",
  "image": "data:image/...",
  "abilities": [],
  "personality": [],
  "motivations": [],
  "fears": [],
  "secrets": [],
  "theme_keywords": [],
  "background_story": "背景故事",
  "appearance_notes": "外观说明",
  "notes": "补充备注",
  "relationships": []
}
```

### Character 字段说明

- `id`
  角色唯一 ID。其他结构引用角色时使用它。
- `name`
  角色正式名称。
- `alias`
  角色别名、代号、外号、称号。
- `tagline`
  一句话概括这个角色的核心辨识度。
- `summary`
  角色短摘要。适合快速浏览。
- `role`
  角色在故事中的功能定位，例如主角、反派、导师、线索人物。
- `status`
  角色当前状态。例如活跃、失联、死亡、潜伏等。
- `archetype`
  角色原型或戏剧模型，例如创伤型观察者、理性军师、理想主义者。
- `voice_style`
  角色语言风格、说话方式、语气特点。
- `signature_item`
  角色的标志性物件、装备、饰品或象征物。
- `arc_stage`
  当前角色成长弧线所在阶段。适合分析人物成长进度。
- `accent_color`
  角色在 UI 中的强调色。偏展示用途。
- `image`
  角色形象图片，通常是 `data_url`。逻辑分析可忽略。
- `abilities`
  角色能力列表。可以是超能力、技能、专业能力、战斗手段。
- `personality`
  性格关键词列表。
- `motivations`
  驱动角色行动的动机列表。
- `fears`
  角色恐惧点、回避点、心理雷区。
- `secrets`
  角色秘密、隐瞒信息、未揭露真相。
- `theme_keywords`
  角色对应的主题关键词，用于做主题分析。
- `background_story`
  更完整的角色过去经历。
- `appearance_notes`
  外观、穿着、特征描述。
- `notes`
  额外补充说明。
- `relationships`
  与其他角色的关系列表。

### CharacterRelationship 角色关系结构

`characters[].relationships[]` 的每一项结构如下：

```json
{
  "id": "rel-example",
  "target_character_id": "char-target",
  "label": "关系标签",
  "status": "关系状态",
  "notes": "关系备注",
  "shared_event_ids": []
}
```

#### CharacterRelationship 字段说明

- `id`
  这条关系记录本身的唯一 ID。
- `target_character_id`
  关系指向的目标角色 ID。
- `label`
  关系名称，例如师徒、宿敌、亲人、盟友、旧识。
- `status`
  当前关系状态，例如互相试探、破裂、合作中、暗中保护。
- `notes`
  对这段关系的补充说明。
- `shared_event_ids`
  与这段关系高度相关的事件 ID 列表，可用于分析关系变化节点。

---

## 4. WorldOverview 世界观总览结构

`payload.world` 结构如下：

```json
{
  "title": "世界名称",
  "era": "时代",
  "premise": "世界前提",
  "atmosphere": "氛围",
  "central_conflict": "核心冲突",
  "cosmic_rule": "底层规则",
  "technology_level": "技术水平",
  "mystery_system": "神秘体系",
  "travel_system": "交通/移动体系",
  "calendar_system": "历法体系",
  "map_image": "data:image/...",
  "recurring_motifs": []
}
```

### WorldOverview 字段说明

- `title`
  世界观标题或宇宙名称。
- `era`
  故事所处时代、纪年、阶段。
- `premise`
  这个世界最核心的前提设定。
- `atmosphere`
  世界整体气质，例如宇宙未来主义、废土、黑色奇幻。
- `central_conflict`
  世界层面的主要矛盾。
- `cosmic_rule`
  世界底层运行规则、法则、限制。
- `technology_level`
  科技或文明发展水平。
- `mystery_system`
  超自然、修行、魔法、神秘学等系统规则。
- `travel_system`
  交通方式、空间移动逻辑、跨区域方式。
- `calendar_system`
  时间计量方式、历法、月份或节律。
- `map_image`
  世界地图图片或概念图。逻辑分析可忽略图片内容本体。
- `recurring_motifs`
  反复出现的意象、象征、母题关键词。

---

## 5. Location 场景 / 地点结构

`payload.locations` 是地点数组，每一项结构如下：

```json
{
  "id": "loc-example",
  "name": "地点名",
  "type": "地点类型",
  "summary": "简述",
  "purpose": "剧情作用",
  "tone": "场景气质",
  "climate": "环境/气候",
  "danger_level": "危险等级",
  "description": "详细描述",
  "image": "data:image/...",
  "tags": [],
  "landmarks": [],
  "resources": [],
  "character_ids": [],
  "faction_ids": []
}
```

### Location 字段说明

- `id`
  地点唯一 ID。
- `name`
  地点名称。
- `type`
  地点类型，例如主城、遗迹、港口、宗门、实验区。
- `summary`
  地点短摘要。
- `purpose`
  这个地点在故事中的作用，例如决战地、线索地、情绪转折地。
- `tone`
  场景氛围。
- `climate`
  环境特征、天气、生态条件。
- `danger_level`
  危险程度。
- `description`
  更完整的地点描述。
- `image`
  地点图片。逻辑分析时通常可忽略。
- `tags`
  场景标签关键词。
- `landmarks`
  地标、关键设施、标志元素。
- `resources`
  该地点可提供的资源、信息、物资、战略价值。
- `character_ids`
  当前与地点关联的角色 ID 列表，可理解为“常驻 / 关联 / 挂载角色”。
- `faction_ids`
  与地点关联的势力 ID 列表。

---

## 6. Faction 势力结构

`payload.factions` 是势力数组，每一项结构如下：

```json
{
  "id": "fac-example",
  "name": "势力名",
  "summary": "简述",
  "description": "详细描述",
  "identity": "身份定位",
  "goal": "目标",
  "methods": "手段",
  "emblem_color": "#7ce5ff",
  "values": [],
  "resources": [],
  "tension_points": [],
  "territory_location_ids": [],
  "character_ids": []
}
```

### Faction 字段说明

- `id`
  势力唯一 ID。
- `name`
  势力名称。
- `summary`
  势力短摘要。
- `description`
  势力更完整描述。
- `identity`
  势力的社会身份或叙事定位，例如官方机构、地下组织、宗门联盟。
- `goal`
  势力希望达成的目标。
- `methods`
  势力惯用手段。
- `emblem_color`
  UI 中展示该势力的主色。
- `values`
  势力主张、理念、价值观关键词。
- `resources`
  势力掌握的资源。
- `tension_points`
  势力内部矛盾点或外部压力点。
- `territory_location_ids`
  该势力控制、影响或主导的地点 ID 列表。
- `character_ids`
  与该势力关联的角色 ID 列表。

---

## 7. StoryEvent 事件结构

`payload.events` 是事件数组，每一项结构如下：

```json
{
  "id": "evt-example",
  "title": "事件标题",
  "summary": "简述",
  "description": "详细描述",
  "story_time": "故事内时间",
  "sequence": 10,
  "chapter_id": "chap-example",
  "parent_id": "evt-parent",
  "branch_label": "分支标签",
  "purpose": "事件作用",
  "outcome": "结果导向",
  "consequence": "后续影响",
  "stakes": "利害/筹码",
  "mood": "情绪基调",
  "status": "计划中",
  "tags": [],
  "foreshadowing": [],
  "unresolved_threads": [],
  "character_ids": [],
  "faction_ids": [],
  "location_id": "loc-example"
}
```

### StoryEvent 字段说明

- `id`
  事件唯一 ID。
- `title`
  事件标题。
- `summary`
  事件短摘要。
- `description`
  事件详细描述。
- `story_time`
  故事内时间文本。可写纪年、日期、时段，也可写“回忆”“数月后”等。
- `sequence`
  排序号。系统主要按它排序事件，是最稳定的时间线顺序字段。
- `chapter_id`
  事件所属章节 ID。为空表示尚未挂到具体章节。
- `parent_id`
  父事件 ID。用于构建事件树与分支链。
- `branch_label`
  该事件在父事件下的分支说明，例如主线推进、追捕升级、调查支线。
- `purpose`
  这个事件在叙事中的作用。
- `outcome`
  这个事件直接得到的结果。
- `consequence`
  这个事件对后续剧情造成的影响。
- `stakes`
  事件的代价、筹码、风险、利害关系。
- `mood`
  情绪氛围，例如压迫、轻快、悲壮、迷离。
- `status`
  创作状态。通常用于标记计划中、已铺垫、进行中、已完成。
- `tags`
  事件标签关键词。
- `foreshadowing`
  这个事件埋下的伏笔列表。
- `unresolved_threads`
  该事件留下但尚未解决的线头。
- `character_ids`
  参与该事件的角色 ID 列表。
- `faction_ids`
  与该事件关联的势力 ID 列表。
- `location_id`
  该事件发生地点 ID。

### 事件分析建议

对其他模型来说，事件通常是最重要的数据层：

- 用 `sequence` + `story_time` 看主时间线
- 用 `parent_id` 看事件树、支线和因果链
- 用 `character_ids` 看人物出场和关系变化
- 用 `foreshadowing` 看伏笔铺设
- 用 `unresolved_threads` 看悬念与待回收内容

---

## 8. StoryOverview 总览结构

`payload.overview` 结构如下：

```json
{
  "book_title": "书名",
  "pitch": "一句话卖点",
  "synopsis": "全书概述",
  "core_theme": "核心主题",
  "ending_signal": "结局方向",
  "series_scope": "系列范围",
  "narrative_style": "叙事风格",
  "active_promises": [],
  "chapters": []
}
```

### StoryOverview 字段说明

- `book_title`
  作品名 / 书名。
- `pitch`
  一句话卖点、项目简介、对外概括。
- `synopsis`
  故事整体摘要。
- `core_theme`
  故事核心主题。
- `ending_signal`
  结局方向、收束目标、最终应达成的情感或思想结果。
- `series_scope`
  单本 / 多部 / 系列化范围说明。
- `narrative_style`
  叙事风格，例如视觉小说式、群像式、悬疑推进。
- `active_promises`
  当前作品向读者持续承诺的“问题 / 钩子 / 回报点”列表。
- `chapters`
  章节列表。

---

## 9. Chapter 章节结构

`overview.chapters[]` 每一项结构如下：

```json
{
  "id": "chap-example",
  "title": "章节标题",
  "subtitle": "副标题",
  "sequence": 1,
  "summary": "章节摘要",
  "objective": "章节目标",
  "timeline_span": "时间跨度",
  "focus_question": "焦点问题",
  "hook": "悬念钩子",
  "pacing_note": "节奏备注",
  "scene_goals": [],
  "expected_character_ids": []
}
```

### Chapter 字段说明

- `id`
  章节唯一 ID。
- `title`
  章节标题。
- `subtitle`
  章节副标题。
- `sequence`
  章节排序号。
- `summary`
  章节整体摘要。
- `objective`
  这一章的核心叙事目标。
- `timeline_span`
  章节覆盖的故事内时间范围。
- `focus_question`
  这一章重点回答或强化的问题。
- `hook`
  章节中的钩子 / 悬念 / 章节尾诱因。
- `pacing_note`
  节奏提示，例如慢热、爆发、过渡、压缩。
- `scene_goals`
  章节下的场景目标列表。
- `expected_character_ids`
  计划在本章出场的角色 ID 列表。用于安排章节，不一定都已在事件中实现。

### 章节分析建议

分析章节时，可以同时对比：

- `overview.chapters[].expected_character_ids`
- `events[].chapter_id`
- `events[].character_ids`

这样可以看出：

- 计划中的角色是否真的出现
- 某章是否事件过少或过密
- 某章的人物功能是否失衡

---

## 10. Settings 工具设置结构

`payload.settings` 主要是网站配置与风格配置，不直接属于小说正文逻辑，但有时也能反映你的项目组织方式。

```json
{
  "sidebar_backgrounds": [],
  "site_backgrounds": [],
  "background_rotation_seconds": 60,
  "current_theme": {},
  "style_presets": [],
  "active_style_preset_id": "preset-example",
  "project_bound_style_preset_id": "preset-example"
}
```

### Settings 字段说明

- `sidebar_backgrounds`
  侧栏背景图库列表。
- `site_backgrounds`
  站点主背景图库列表。
- `background_rotation_seconds`
  背景轮播间隔，单位秒。
- `current_theme`
  当前正在使用的界面风格对象。
- `style_presets`
  风格预设列表。导出时会把当前工作区可见的全部风格预设同步进来，所以从分析角度看，它代表“当前项目可用的全部风格库”，不只是项目私有风格。
- `active_style_preset_id`
  当前正在启用的风格预设 ID。为空表示正在使用自定义当前风格。
- `project_bound_style_preset_id`
  当前项目绑定的风格预设 ID。切换到该项目时可自动套用。注意：一个项目只能绑定一个预设，但所有项目都可以看到同一套共享预设库。

---

## 11. ImageAsset 图片资源结构

`settings.sidebar_backgrounds[]` 与 `settings.site_backgrounds[]` 使用同一结构：

```json
{
  "id": "bg-example",
  "name": "图片名",
  "data_url": "data:image/...",
  "added_at": "2026-03-17T12:34:56.000000+00:00"
}
```

### ImageAsset 字段说明

- `id`
  图片资源唯一 ID。
- `name`
  图片名称。
- `data_url`
  图片本体，通常是 base64 的 `data:image/...` 字符串。
- `added_at`
  加入图库的时间。

### 给其他模型做剧情分析时的建议

如果只是分析小说逻辑，可以把这些字段替换成：

```json
"data_url": "<omitted>"
```

因为图片本体通常非常大，会浪费上下文。

---

## 12. UiTheme 当前界面风格结构

`settings.current_theme` 和 `style_presets[].theme` 使用同一结构：

```json
{
  "border_color": "#7ce5ff",
  "border_color_strong": "rgba(...)",
  "ui_background": "rgba(...)",
  "ui_background_alt": "rgba(...)",
  "panel_background": "rgba(...)",
  "panel_background_alt": "rgba(...)",
  "soft_panel_background": "rgba(...)",
  "title_color": "#edf6ff",
  "text_color": "#edf6ff",
  "muted_text_color": "rgba(...)",
  "accent_color": "#7ce5ff",
  "accent_secondary_color": "#ffbc88",
  "accent_tertiary_color": "#9f9dff",
  "primary_button_background": "#1b85a1",
  "primary_button_text_color": "#edf6ff",
  "secondary_button_background": "rgba(...)",
  "secondary_button_text_color": "#edf6ff",
  "danger_button_background": "rgba(...)",
  "danger_button_text_color": "#ffd8e3",
  "topbar_background": "rgba(...)",
  "topbar_border_color": "rgba(...)",
  "sidebar_tint": "rgba(...)",
  "site_overlay": "rgba(...)",
  "background_display_mode": "cinematic",
  "preferred_site_background_ids": [],
  "preferred_sidebar_background_ids": [],
  "preferred_site_background_id": null,
  "preferred_sidebar_background_id": null
}
```

### UiTheme 字段说明

- `border_color`
  UI 边框主色。
- `border_color_strong`
  UI 边框强调色。
- `ui_background`
  UI 大面板主背景色。
- `ui_background_alt`
  UI 次级背景色。
- `panel_background`
  卡片背景主色。
- `panel_background_alt`
  卡片背景副色。
- `soft_panel_background`
  柔和半透明面板色。
- `title_color`
  标题文字颜色。
- `text_color`
  正文主颜色。
- `muted_text_color`
  正文辅助颜色。
- `accent_color`
  主强调色。
- `accent_secondary_color`
  副强调色。
- `accent_tertiary_color`
  第三强调色。
- `primary_button_background`
  主按钮背景色。
- `primary_button_text_color`
  主按钮文字色。
- `secondary_button_background`
  次按钮背景色。
- `secondary_button_text_color`
  次按钮文字色。
- `danger_button_background`
  危险按钮背景色。
- `danger_button_text_color`
  危险按钮文字色。
- `topbar_background`
  顶栏背景色。
- `topbar_border_color`
  顶栏底线颜色。
- `sidebar_tint`
  侧栏叠加蒙层颜色。
- `site_overlay`
  全站背景遮罩颜色。
- `background_display_mode`
  背景显示模式。当前常见值：
  - `cinematic`：放大、柔雾、电影感
  - `natural`：正常铺满，不模糊不放大
- `preferred_site_background_ids`
  当前风格绑定的站点背景 ID 列表。背景轮播优先在这组里进行。
- `preferred_sidebar_background_ids`
  当前风格绑定的侧栏背景 ID 列表。
- `preferred_site_background_id`
  为兼容旧数据保留的单值字段，通常等于 `preferred_site_background_ids[0]`。
- `preferred_sidebar_background_id`
  为兼容旧数据保留的单值字段，通常等于 `preferred_sidebar_background_ids[0]`。

### 给其他模型做剧情分析时的建议

这整个结构主要是界面风格信息，不是故事逻辑核心。除非你要分析项目视觉风格，否则通常可以忽略。

---

## 13. ThemePreset 风格预设结构

`settings.style_presets[]` 每一项结构如下：

```json
{
  "id": "preset-example",
  "name": "风格名",
  "description": "风格说明",
  "built_in": false,
  "created_at": "2026-03-17T12:34:56.000000+00:00",
  "theme": {}
}
```

### ThemePreset 字段说明

- `id`
  风格预设唯一 ID。
- `name`
  风格预设名称。
- `description`
  风格预设说明。
- `built_in`
  是否为内置风格。
- `created_at`
  创建时间。
- `theme`
  对应的 `UiTheme` 对象。

### ThemePreset 的存储语义

- 在导出文件里，`settings.style_presets` 会以“当前项目可见的全部风格预设快照”形式出现。
- 在本地持久化时，这批预设还会同步保存在 `storage/workspace.json` 中，属于工作区级共享资源。
- 多个项目通常会看到同一批风格预设。
- `project_bound_style_preset_id` 只是在这些共享预设中选一个绑定到当前项目。
- 如果你把单个项目导出给其他模型，模型看到的 `style_presets` 可以理解为“这个项目当时可切换的全部界面风格”。

---

## 14. 关键引用关系

以下字段构成了项目中最重要的“逻辑连接”：

- 角色与关系：`characters[].relationships[].target_character_id`
- 关系与关键事件：`characters[].relationships[].shared_event_ids`
- 角色与事件：`events[].character_ids`
- 角色与场景：`locations[].character_ids`
- 角色与势力：`factions[].character_ids`
- 势力与场景：`factions[].territory_location_ids`
- 事件与地点：`events[].location_id`
- 事件与势力：`events[].faction_ids`
- 事件所属章节：`events[].chapter_id`
- 事件树：`events[].parent_id`
- 章节预期角色：`overview.chapters[].expected_character_ids`

---

## 15. 排序与清洗规则

系统在保存时会做一些规范化，这对后续分析很重要：

- 列表字段会去重并保留原顺序
- 无效的角色 / 地点 / 势力 / 章节 / 事件引用会被清理
- 事件会按 `sequence`、`story_time`、`title` 排序
- 章节会按 `sequence`、`title` 排序
- `background_rotation_seconds` 最小值会被限制为 `30`
- 风格中的旧单背景字段会自动合并进背景列表字段

这意味着导出的数据通常已经是“相对干净”的分析输入。

---

## 16. 给其他 Chat / 模型的推荐分析方式

如果你要把存档交给其他模型，可以直接说明：

1. 先读取 `overview`，理解整本书的主题、承诺、章节安排。
2. 再读取 `characters`，整理人物动机、恐惧、秘密、关系树。
3. 读取 `events`，按 `sequence` 和 `parent_id` 重建主线与分支。
4. 用 `locations` 和 `factions` 补足空间与阵营结构。
5. 最后对照 `overview.chapters` 与 `events[].chapter_id`，分析章节节奏和人物出场兑现情况。

### 如果你想压缩给模型的上下文

建议保留：

- `overview`
- `characters`
- `events`
- `locations`
- `factions`

建议删除或替换：

- `characters[].image`
- `world.map_image`
- `locations[].image`
- `settings.sidebar_backgrounds[].data_url`
- `settings.site_backgrounds[].data_url`
- 大部分 `settings.current_theme`
- 大部分 `settings.style_presets`

---

## 17. 本地存储目录结构

站点本地数据按“工作区 + 项目目录”存储：

```text
storage/
  workspace.json
  projects/
    <project_id>/
      state.json
```

### 含义

- `workspace.json`
  记录项目列表、当前激活项目、全局风格预设。
- `projects/<project_id>/state.json`
  单个项目的完整状态。

---

## 18. 导入方式

设置页支持两种导入模式：

1. `导入为新项目`
   保留当前项目，把导入文件创建成新的项目目录。
2. `覆盖当前项目`
   只替换当前激活项目的数据。

---

## 19. 容错与兼容说明

- 如果风格记录的背景图不存在，系统会自动回退到可用背景，不会报错。
- 旧版本导出中如果只有单个背景偏好字段，导入时会自动兼容到新版本的背景列表字段。
- 图片以 `data_url` 内嵌保存，所以导出文件可能很大，这是正常现象。
