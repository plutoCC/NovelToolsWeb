from __future__ import annotations

from urllib.parse import quote

from .models import (
    Chapter,
    Character,
    CharacterRelationship,
    Faction,
    ImageAsset,
    Location,
    NovelState,
    Settings,
    StoryEvent,
    StoryOverview,
    ThemePreset,
    UiTheme,
    WorldOverview,
    now_iso,
)


def svg_data_url(title: str, subtitle: str, color_a: str, color_b: str, color_c: str) -> str:
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="{color_a}"/>
          <stop offset="55%" stop-color="{color_b}"/>
          <stop offset="100%" stop-color="{color_c}"/>
        </linearGradient>
      </defs>
      <rect width="960" height="640" fill="url(#bg)"/>
      <circle cx="786" cy="194" r="78" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.48)"/>
      <rect x="72" y="88" width="816" height="464" rx="28" fill="rgba(7,11,22,0.24)" stroke="rgba(255,255,255,0.18)"/>
      <text x="96" y="186" fill="#eaf8ff" font-family="Segoe UI Variable Display, Bahnschrift, sans-serif" font-size="58" font-weight="700">{title}</text>
      <text x="98" y="238" fill="rgba(234,248,255,0.82)" font-family="Aptos, Segoe UI, sans-serif" font-size="24">{subtitle}</text>
    </svg>
    """.strip()
    return f"data:image/svg+xml;charset=utf-8,{quote(svg)}"


def background_theme_selection(site_bg_ids: list[str] | None, sidebar_bg_ids: list[str] | None) -> dict:
    site_ids = [item for item in site_bg_ids or [] if item]
    sidebar_ids = [item for item in sidebar_bg_ids or [] if item]
    return {
        "preferred_site_background_ids": site_ids,
        "preferred_sidebar_background_ids": sidebar_ids,
        "preferred_site_background_id": site_ids[0] if site_ids else None,
        "preferred_sidebar_background_id": sidebar_ids[0] if sidebar_ids else None,
    }


def default_theme(site_bg_ids: list[str] | None, sidebar_bg_ids: list[str] | None) -> UiTheme:
    return UiTheme(
        **background_theme_selection(site_bg_ids, sidebar_bg_ids),
    )


def eye_care_theme(site_bg_ids: list[str] | None, sidebar_bg_ids: list[str] | None) -> UiTheme:
    return UiTheme(
        border_color="#92c79f",
        border_color_strong="rgba(146,199,159,0.34)",
        ui_background="rgba(18, 26, 21, 0.86)",
        ui_background_alt="rgba(26, 34, 29, 0.92)",
        panel_background="rgba(18, 28, 23, 0.90)",
        panel_background_alt="rgba(24, 36, 29, 0.82)",
        soft_panel_background="rgba(227,243,224,0.04)",
        title_color="#e7f1df",
        text_color="#dfebd8",
        muted_text_color="rgba(208,224,201,0.72)",
        accent_color="#9ecf8b",
        accent_secondary_color="#d0b77a",
        accent_tertiary_color="#7fb2a4",
        primary_button_background="#567d56",
        secondary_button_background="rgba(57,75,58,0.86)",
        topbar_background="rgba(18,26,21,0.96)",
        topbar_border_color="rgba(158,207,139,0.28)",
        sidebar_tint="rgba(21,28,22,0.92)",
        site_overlay="rgba(17,22,18,0.48)",
        background_display_mode="natural",
        **background_theme_selection(site_bg_ids, sidebar_bg_ids),
    )


def cyber_wuxia_theme(site_bg_ids: list[str] | None, sidebar_bg_ids: list[str] | None) -> UiTheme:
    return UiTheme(
        border_color="#f7a85e",
        border_color_strong="rgba(247,168,94,0.36)",
        ui_background="rgba(19,12,18,0.84)",
        ui_background_alt="rgba(31,16,26,0.92)",
        panel_background="rgba(24,12,18,0.90)",
        panel_background_alt="rgba(16,23,33,0.82)",
        soft_panel_background="rgba(255,214,164,0.05)",
        title_color="#ffe5c8",
        text_color="#f6eee5",
        muted_text_color="rgba(240,224,208,0.72)",
        accent_color="#ffb76b",
        accent_secondary_color="#68f5ff",
        accent_tertiary_color="#d884ff",
        primary_button_background="#a44f26",
        secondary_button_background="rgba(40,24,32,0.88)",
        topbar_background="rgba(23,12,18,0.95)",
        topbar_border_color="rgba(255,183,107,0.34)",
        sidebar_tint="rgba(19,12,18,0.94)",
        site_overlay="rgba(17,11,16,0.38)",
        background_display_mode="natural",
        **background_theme_selection(site_bg_ids, sidebar_bg_ids),
    )


def presets_for(site_bg_ids: list[str], sidebar_bg_ids: list[str], variant: str = "default") -> tuple[list[ThemePreset], UiTheme, str]:
    if variant == "cyber_wuxia":
        main_theme = cyber_wuxia_theme(site_bg_ids, sidebar_bg_ids)
        return (
            [
                ThemePreset(id="preset-cyber-wuxia", name="霓火荒尘", built_in=True, theme=main_theme),
                ThemePreset(id="preset-eye-care", name="夜航护眼", built_in=True, theme=eye_care_theme(site_bg_ids, sidebar_bg_ids)),
            ],
            main_theme,
            "preset-cyber-wuxia",
        )
    main_theme = default_theme(site_bg_ids, sidebar_bg_ids)
    return (
        [
            ThemePreset(id="preset-default", name="星图默认", built_in=True, theme=main_theme),
            ThemePreset(id="preset-eye-care", name="夜航护眼", built_in=True, theme=eye_care_theme(site_bg_ids, sidebar_bg_ids)),
        ],
        main_theme,
        "preset-default",
    )


def make_settings(sidebar_backgrounds: list[ImageAsset], site_backgrounds: list[ImageAsset], variant: str = "default") -> Settings:
    style_presets, current_theme, active_id = presets_for(
        [item.id for item in site_backgrounds],
        [item.id for item in sidebar_backgrounds],
        variant,
    )
    return Settings(
        sidebar_backgrounds=sidebar_backgrounds,
        site_backgrounds=site_backgrounds,
        background_rotation_seconds=60,
        current_theme=current_theme,
        style_presets=style_presets,
        active_style_preset_id=active_id,
        project_bound_style_preset_id=active_id,
    )


def create_blank_state(project_id: str, project_title: str, project_description: str = "") -> NovelState:
    now = now_iso()
    sidebar_backgrounds = [
        ImageAsset(id="sb-default", name="侧栏极光幕", data_url=svg_data_url("Sidebar", "Aurora Grid", "#07121f", "#102d47", "#1c6372"), added_at=now)
    ]
    site_backgrounds = [
        ImageAsset(id="site-default", name="站点光环", data_url=svg_data_url("Cosmic Hall", "Future Writing Interface", "#040611", "#0d203b", "#1d6d74"), added_at=now)
    ]
    return NovelState(
        project_id=project_id,
        project_slug=project_id,
        project_title=project_title,
        project_description=project_description,
        world=WorldOverview(title=project_title, premise="在这里开始搭建新的小说世界。"),
        overview=StoryOverview(book_title=project_title, pitch="在这里写下这个项目的一句话介绍。"),
        settings=make_settings(sidebar_backgrounds, site_backgrounds),
    )


def create_default_state(project_id: str = "project-gray-echo") -> NovelState:
    now = now_iso()
    sidebar_backgrounds = [
        ImageAsset(id="sb-aurora", name="侧栏极光幕", data_url=svg_data_url("Sidebar", "Aurora Grid", "#07121f", "#102d47", "#1c6372"), added_at=now),
        ImageAsset(id="sb-ring", name="侧栏轨道纹", data_url=svg_data_url("Sidebar", "Orbit Pulse", "#140d26", "#2c2957", "#0d5660"), added_at=now),
    ]
    site_backgrounds = [
        ImageAsset(id="site-halo", name="站点光环", data_url=svg_data_url("Cosmic Hall", "Future Writing Interface", "#040611", "#0d203b", "#1d6d74"), added_at=now),
        ImageAsset(id="site-vault", name="站点星穹", data_url=svg_data_url("Nebula Vault", "Visual Novel Workspace", "#170618", "#13264f", "#7d5a22"), added_at=now),
    ]
    return NovelState(
        project_id=project_id,
        project_slug="gray-echo",
        project_title="灰穹回响",
        project_description="默认示例项目。围绕记忆工程、轨道都市和视觉小说式叙事展开。",
        characters=[
            Character(
                id="char-linhu",
                name="林弧",
                alias="第七回声",
                tagline="能够听见城市记忆的轨道修补师",
                summary="维修轨道井时听见姐姐留下的回响，因此被卷入一场改写历史的战争。",
                role="主视角 / 真相触发者",
                archetype="创伤型观察者",
                voice_style="克制、带机械比喻。",
                signature_item="可折叠记忆锚钉",
                arc_stage="从旁观者走向主动改写规则",
                accent_color="#76ecff",
                image=svg_data_url("林弧", "第七回声", "#111a2d", "#15637e", "#4fe0ff"),
                abilities=["城市回响感知", "轨道维修", "短时记忆回放"],
                personality=["冷静", "共情过强", "犹豫后会变得执拗"],
                motivations=["找出姐姐失踪真相", "阻止主城删改记忆"],
                fears=["回响是伪造层", "亲近之人被系统标记"],
                secrets=["小时候启动过一次记忆封存协议"],
                theme_keywords=["记忆", "倾听", "选择代价"],
                background_story="永昼环城下层维护区出身，坠井事故后开始听见金属残响。",
                appearance_notes="银灰短发，虹膜边缘有青色裂纹。",
                relationships=[
                    CharacterRelationship(id="rel-linhu-yunmian", target_character_id="char-yunmian", label="姐姐 / 真相入口", status="血缘与误解纠缠", shared_event_ids=["evt-signal", "evt-memory-raid"]),
                    CharacterRelationship(id="rel-linhu-keshen", target_character_id="char-keshen", label="危险盟友", status="互相试探", shared_event_ids=["evt-archive-break"]),
                ],
            ),
            Character(
                id="char-yunmian",
                name="云眠",
                alias="静默航标",
                tagline="失踪多年却一直在暗处导航的人",
                summary="前档案局记忆译员，因为发现战争记录被篡改而叛逃。",
                role="关键真相持有者",
                status="失联",
                archetype="幽灵导师",
                voice_style="温柔、短句、刻意保留关键信息。",
                signature_item="航标戒指",
                arc_stage="从隐藏到现身",
                accent_color="#ffba86",
                image=svg_data_url("云眠", "静默航标", "#1d1124", "#684867", "#ffb57f"),
                abilities=["记忆译码", "档案加密", "人群隐身"],
                personality=["温柔", "极端谨慎", "自我牺牲"],
                motivations=["保护林弧", "公开战争原档"],
                fears=["妹妹知道真相后恨她"],
                secrets=["参与过一次幸存者记忆删改"],
                theme_keywords=["愧疚", "守望", "坦白"],
                background_story="她知道一个城市可以如何在制度层面失忆，也知道如何把真相藏进噪点里。",
                appearance_notes="浅色长风衣，耳后有导航芯片留下的疤痕。",
            ),
            Character(
                id="char-keshen",
                name="克深",
                alias="裂隙领航员",
                tagline="用谎言为别人争取真相的走私舰长",
                summary="经营非法航线，在黑市和档案局之间兜售情报。",
                role="行动推进者",
                archetype="不可信的救援者",
                voice_style="看起来散漫，重要的话只说一半。",
                signature_item="裂缝纹路航图片",
                arc_stage="从利益交换到承担站队代价",
                accent_color="#9f9dff",
                image=svg_data_url("克深", "裂隙领航员", "#0d0d22", "#2f2d61", "#a5a3ff"),
                abilities=["灰域航线规划", "应急撤离", "势力斡旋"],
                personality=["松弛", "敏锐", "嘴硬", "会察言观色"],
                motivations=["保住撤离线", "让被抹掉的人重获身份"],
                fears=["航线被利用成猎杀通道"],
                secrets=["曾把一整船证人送进失踪名单"],
                theme_keywords=["灰度", "生存", "正义迟疑"],
                background_story="他学会了把道德藏在玩笑里。",
                appearance_notes="深色卷发，外套内衬有星图投影层。",
            ),
        ],
        world=WorldOverview(
            title="灰穹回响",
            era="天幕历 214 年",
            premise="一座依靠记忆基础设施维持秩序的环形都市，正在用删改过去延长现在。",
            atmosphere="宇宙未来主义、潮湿金属、霓光雾层",
            central_conflict="主城执政层删改历史维持稳定，地下网络想把被删掉的人和事放回历史。",
            cosmic_rule="完整记录过的集体记忆会在某类金属里留下回响层。",
            technology_level="高密度轨道城市、义体接口普及、记忆工程发达",
            mystery_system="记忆回响会被情绪和删改污染。",
            travel_system="主城靠轨道井与环城列带，灰域靠黑市舰船穿梭。",
            calendar_system="每月都有一次城市光幕校准夜。",
            map_image=svg_data_url("灰穹回响", "主城总览", "#060816", "#18304f", "#2c8890"),
            recurring_motifs=["回声", "航标", "雾化霓光", "旧档案"],
        ),
        locations=[
            Location(id="loc-ring-city", name="永昼环城", type="主城中枢", summary="官方叙事的展示面。", purpose="制度与秩序表层", tone="洁净明亮", climate="恒温控湿", danger_level="高监控", description="越靠近轴心，真实生活越像被剧本精修过。", image=svg_data_url("永昼环城", "主城中枢", "#09111a", "#1f4e68", "#8cd4ff"), tags=["主城", "监控"], landmarks=["天幕校准塔", "中环列带"], resources=["公民档案"], character_ids=["char-linhu"], faction_ids=["fac-archive"]),
            Location(id="loc-orbit-port", name="残光轨道港", type="灰域港口", summary="黑市与走私港。", purpose="情报与逃离的交界地", tone="杂乱热闹", climate="昼夜温差极大", danger_level="中高", description="不想被系统看见的人都会在这里留下痕迹。", image=svg_data_url("残光轨道港", "灰域港口", "#150b1a", "#563062", "#ffab88"), tags=["黑市", "航线"], landmarks=["裂缝泊位", "旧航图墙"], resources=["匿名身份壳"], character_ids=["char-keshen"], faction_ids=["fac-smugglers"]),
            Location(id="loc-archive-vault", name="棱镜档案井", type="封锁设施", summary="战争原档封存井。", purpose="真相核心", tone="冷而锐利", climate="低温干燥", danger_level="极高", description="越往下，历史版本越危险。", image=svg_data_url("棱镜档案井", "战争原档封存", "#090612", "#273f76", "#6fe9ff"), tags=["档案核心", "封锁区"], landmarks=["回响壁", "零层舱门"], resources=["战争原档"], character_ids=["char-yunmian"], faction_ids=["fac-archive"]),
        ],
        factions=[
            Faction(id="fac-archive", name="星穹档案局", summary="维持主城秩序与历史版本的官方机构。", description="它不只记录历史，也决定哪些历史可以继续成为公共记忆。", identity="历史解释权拥有者", goal="确保主城稳定", methods="记忆筛分、版本管理、通行权控制", emblem_color="#7ce5ff", values=["秩序优先", "真相需要配额"], resources=["档案井权限", "监控网络"], tension_points=["内部并非铁板一块"], territory_location_ids=["loc-ring-city", "loc-archive-vault"], character_ids=["char-yunmian"]),
            Faction(id="fac-smugglers", name="裂隙自由线", summary="游走于官方秩序外的灰域联络网。", description="帮助被系统遗漏或刻意抹除的人迁移与重建身份。", identity="地下协作网络", goal="保留离开主城与回到真相的可能性", methods="伪装航线、匿名护送、黑市交易", emblem_color="#ffb67c", values=["先活下来，再谈真相"], resources=["灰域舰船", "走私情报链"], tension_points=["内部利益不完全一致"], territory_location_ids=["loc-orbit-port"], character_ids=["char-keshen", "char-linhu"]),
        ],
        events=[
            StoryEvent(id="evt-signal", title="航标信号重现", summary="林弧在维修轨道井时听见姐姐留下的回响。", description="信号带着坐标与警告，让她意识到云眠并非单纯失踪。", story_time="天幕历 214.03 / 校准夜前夕", sequence=10, chapter_id="chap-01", purpose="抛出主谜题", outcome="林弧决定私下追查", consequence="她被系统列入异常监听名单", stakes="继续追查会失去正常身份", mood="异样与不安", status="已完成", tags=["引子", "谜题"], foreshadowing=["零层舱门"], unresolved_threads=["云眠是否仍活着"], character_ids=["char-linhu", "char-yunmian"], faction_ids=["fac-archive"], location_id="loc-ring-city"),
            StoryEvent(id="evt-archive-break", title="潜入棱镜档案井", summary="林弧与克深进入封锁区寻找原始记录。", description="他们第一次亲眼看见战争记录被人为分层。", story_time="天幕历 214.03 / 第一轨段月 26 日", sequence=20, chapter_id="chap-02", parent_id="evt-signal", branch_label="主线推进", purpose="展示制度级造假证据", outcome="带出无法直接解码的原始碎片", consequence="档案局开始排查灰域航线", stakes="撤离网络可能暴露", mood="紧绷压迫", status="已完成", tags=["潜入", "证据"], foreshadowing=["撤离名单编号"], unresolved_threads=["碎片记录了谁"], character_ids=["char-linhu", "char-keshen"], faction_ids=["fac-archive", "fac-smugglers"], location_id="loc-archive-vault"),
            StoryEvent(id="evt-memory-raid", title="记忆围剿令", summary="档案局对灰域展开追捕。", description="云眠主动暴露一个伪造据点，替林弧争取时间。", story_time="天幕历 214.04 / 第二轨段月初", sequence=30, chapter_id="chap-03", parent_id="evt-archive-break", branch_label="追捕升级", purpose="抬高代价", outcome="云眠的存在被确认", consequence="林弧意识到自己一直被保护", stakes="地下网络随时可能被清扫", mood="压迫心痛", status="已铺垫", tags=["围剿", "姐姐线"], foreshadowing=["完整战争撤离名单"], unresolved_threads=["档案局内鬼是谁"], character_ids=["char-linhu", "char-yunmian", "char-keshen"], faction_ids=["fac-archive", "fac-smugglers"], location_id="loc-orbit-port"),
        ],
        overview=StoryOverview(
            book_title="灰穹回响",
            pitch="能听见城市记忆的女孩在寻找失踪姐姐时，发现文明稳定建立在被删改的历史之上。",
            synopsis="故事从一次异常回响开始，沿着姐姐留下的残片，走入档案局与地下网络之间的灰色战争。",
            core_theme="记忆决定我们是谁，而选择决定我们是否配得上知道真相。",
            ending_signal="结局应让真相被保留，但不是简单曝光，而是建立新的记忆公共机制。",
            series_scope="单本可闭环，后续可扩展为系列。",
            narrative_style="视觉小说式强氛围、角色情绪与世界设定并重。",
            active_promises=["云眠为何失踪", "战争撤离线的真实历史", "林弧会不会成为新的记忆管理者"],
            chapters=[
                Chapter(id="chap-01", title="回声落入井口", subtitle="主谜题开启", sequence=1, summary="林弧收到来自姐姐的异常回响。", objective="建立世界规则和主角能力。", timeline_span="天幕历 214.03", focus_question="这段信号为什么会在此时重现？", hook="被覆盖掉的人名是谁？", pacing_note="要轻快但不泄密。", scene_goals=["展示记忆回响能力"], expected_character_ids=["char-linhu", "char-yunmian"]),
                Chapter(id="chap-02", title="裂隙与原档", subtitle="行动与伦理并进", sequence=2, summary="潜入档案井并接触幸存者证言。", objective="扩大世界尺度。", timeline_span="天幕历 214.03 至 214.04 初", focus_question="真相什么时候公开才不会再伤害一次幸存者？", hook="克深隐瞒了哪一段航线历史？", pacing_note="行动和伦理冲突交替推进。", scene_goals=["建立信任拉扯"], expected_character_ids=["char-linhu", "char-keshen", "char-yunmian"]),
                Chapter(id="chap-03", title="围剿中的航标", subtitle="姐姐线显影", sequence=3, summary="档案局全面收网，云眠不得不暴露存在。", objective="抬高情感代价和主线风险。", timeline_span="天幕历 214.04", focus_question="林弧要继续追着姐姐跑，还是开始自己做决定？", hook="完整名单到底会改变什么？", pacing_note="情绪必须陡起来。", scene_goals=["让姐姐线从谜题转为情感冲突"], expected_character_ids=["char-linhu", "char-yunmian", "char-keshen"]),
            ],
        ),
        settings=make_settings(sidebar_backgrounds, site_backgrounds),
    )


def create_cyber_wuxia_test_state(project_id: str = "project-cyber-wuxia") -> NovelState:
    now = now_iso()
    sidebar_backgrounds = [
        ImageAsset(id="sb-dust-gate", name="风沙关门", data_url=svg_data_url("Dust Gate", "Cyber Wuxia Sidebar", "#130a11", "#4a1f1a", "#9b6430"), added_at=now),
        ImageAsset(id="sb-ruin-neon", name="残城霓幕", data_url=svg_data_url("Ruin Neon", "Sidebar", "#0b1020", "#2e1955", "#0b7380"), added_at=now),
    ]
    site_backgrounds = [
        ImageAsset(id="site-ash-cultivation", name="荒尘剑域", data_url=svg_data_url("Ash Sword", "Wasteland Cultivation", "#130a11", "#5e241f", "#de9251"), added_at=now),
        ImageAsset(id="site-neon-dantian", name="霓灯丹田", data_url=svg_data_url("Neon Dantian", "Cyber Xianxia", "#08111e", "#16355f", "#40d7dc"), added_at=now),
    ]
    return NovelState(
        project_id=project_id,
        project_slug="cyber-wuxia-wasteland-xianxia",
        project_title="霓火荒尘录",
        project_description="测试项目。主题为赛博武侠与废土修仙。",
        characters=[
            Character(id="char-suye", name="苏夜衡", alias="残剑载体", tagline="把飞剑炼成神经外设的流亡剑修。", summary="背着寄生在脊柱接口里的古剑芯。", role="主角 / 冲突中心", archetype="流亡者", voice_style="冷、短句。", signature_item="脊柱飞剑芯", arc_stage="从独行求存到重建秩序", accent_color="#ffb76b", image=svg_data_url("苏夜衡", "残剑载体", "#140a10", "#56201d", "#ffb76b"), abilities=["飞剑神经接驳", "废城潜行"], personality=["克制", "警惕", "护短"], motivations=["查清师门灭门真相"], fears=["自己最终会沦为失控兵器"], secrets=["体内封着被篡改的祖师剑意"], theme_keywords=["剑与义体", "秩序重建"], background_story="衰败剑宗幸存者，被财团改造成飞剑载体。"),
            Character(id="char-luojin", name="洛尽棠", alias="灵机算命师", tagline="用量子卦盘替人演命的黑市修士。", summary="能从城市基站残波里推演命数。", role="副主角 / 命数线核心", archetype="狡黠军师", voice_style="慵懒但判断锋利。", signature_item="量子卦盘", arc_stage="从自保到押上全部筹码", accent_color="#68f5ff", image=svg_data_url("洛尽棠", "灵机算命师", "#0a1224", "#144461", "#68f5ff"), abilities=["命数演算", "霓网监听"], personality=["轻佻", "细腻", "会观人"], motivations=["找回失踪师尊"], fears=["未来都是被设计好的"], secrets=["替主角隐瞒过一次未来"], theme_keywords=["命数", "谎言", "选择自由"], background_story="废土算坊长大，后来成了各方都想拉拢的命数师。"),
            Character(id="char-guhan", name="顾寒炉", alias="焚城真君", tagline="把丹炉改成聚变熔炉的旧派修士。", summary="赤炉盟现任执炉者，主张以极端手段复苏灵脉。", role="对手 / 强秩序派", archetype="极端改革者", voice_style="庄严、像在布道。", signature_item="聚变丹炉", arc_stage="从理念对手到暴露执念", accent_color="#d884ff", image=svg_data_url("顾寒炉", "焚城真君", "#1b0916", "#5f1f5f", "#d884ff"), abilities=["聚变炼丹", "焚城阵"], personality=["强势", "自洽", "压迫感强"], motivations=["重启灵脉"], fears=["承认自己只是换名复活旧世界"], secrets=["参与过主角师门清算旧案"], theme_keywords=["极端正义", "文明灰烬"], background_story="他相信只有更强势的秩序才能结束废土混乱。"),
        ],
        world=WorldOverview(title="霓火荒尘", era="灵历 403 年", premise="灵脉枯竭后，修士把义体、基站、飞剑芯和聚变丹炉拼成新的修行体系。", atmosphere="赛博武侠、废土修仙、飞剑与霓虹并存", central_conflict="财团要把残存灵脉彻底资本化，流亡门派与黑市修士则想重建另一套修行秩序。", cosmic_rule="灵气不足时就必须拿寿命、记忆、机体负荷或城市能源来补。", technology_level="义体普及、飞剑芯量产、量子演算介入卜算", mystery_system="真正的古法藏在废城最深处的离线残卷中。", travel_system="飞剑列带、磁悬浮沙舟和临时灵阵驿路穿行。", calendar_system="每月都有一次返潮夜。", map_image=svg_data_url("霓火荒尘", "赛博武侠与废土修仙", "#130a11", "#5e241f", "#de9251"), recurring_motifs=["飞剑芯", "风沙霓虹", "破败山门", "聚变丹炉"]),
        locations=[
            Location(id="loc-ruin-city", name="碎虹旧城", type="废土主城", summary="霓虹广告牌和残破道观并排存在。", purpose="主舞台", tone="繁闹危险", climate="风沙夹杂酸雨", danger_level="高", description="修士与义体客在同一条街上讨生活。", image=svg_data_url("碎虹旧城", "废土主城", "#0d101d", "#203764", "#ffb76b"), tags=["主城", "黑市"], landmarks=["命数街"], resources=["义体改装"], character_ids=["char-suye", "char-luojin"], faction_ids=["fac-night-market"]),
            Location(id="loc-bone-desert", name="龙骨荒漠", type="灵脉禁区", summary="埋着巨型古兽骨骸和断裂灵脉。", purpose="宝藏与真相核心", tone="苍凉神圣", climate="昼夜温差极大", danger_level="极高", description="最后一条完整灵脉可能睡在这里。", image=svg_data_url("龙骨荒漠", "灵脉禁区", "#20120d", "#734225", "#f1c27b"), tags=["禁区", "灵脉"], landmarks=["断脊龙门"], resources=["古法残卷"], character_ids=["char-suye", "char-guhan"], faction_ids=["fac-red-furnace"]),
            Location(id="loc-ghost-monastery", name="无相旧山门", type="遗迹宗门", summary="主角师门的废弃山门。", purpose="情感根源 / 翻案点", tone="安静哀伤", climate="常年薄雾", danger_level="中高", description="埋着旧案证据和离线剑谱。", image=svg_data_url("无相旧山门", "遗迹宗门", "#100d18", "#3b2b6d", "#68f5ff"), tags=["宗门遗迹", "旧案"], landmarks=["断剑碑"], resources=["离线剑谱"], character_ids=["char-suye"], faction_ids=[]),
        ],
        factions=[
            Faction(id="fac-night-market", name="命数夜市", summary="黑市修士、情报贩和流亡门派维系的灰色网络。", description="他们也保护那些不愿向财团纳税的修士。", identity="地下网络 / 民间生存体系", goal="保留独立修行空间", methods="情报交换、匿名护送", emblem_color="#68f5ff", values=["先活下来", "规矩比身份重要"], resources=["黑市据点", "非官方飞剑列带"], tension_points=["随时可能被清剿"], territory_location_ids=["loc-ruin-city"], character_ids=["char-luojin", "char-suye"]),
            Faction(id="fac-red-furnace", name="赤炉盟", summary="主张用高压秩序和牺牲换取灵脉复苏的门派联盟。", description="他们把丹炉、阵法和聚变能源结合起来。", identity="强秩序派", goal="重启灵脉，建立新的修真统治", methods="资源垄断、阵法封锁", emblem_color="#ffb76b", values=["秩序先于自由"], resources=["聚变丹炉", "战斗修士"], tension_points=["年轻修士开始怀疑盟主路线"], territory_location_ids=["loc-bone-desert"], character_ids=["char-guhan"]),
        ],
        events=[
            StoryEvent(id="evt-sand-signal", title="风沙中的断剑信号", summary="主角的飞剑芯接收到来自旧山门的离线剑讯。", description="早该损毁的祖师剑讯在返潮夜被重新激活。", story_time="灵历 403.06 / 返潮夜", sequence=10, chapter_id="chap-cw-01", purpose="抛出主线谜团", outcome="主角决定回到废弃师门", consequence="赤炉盟开始重新追踪他", stakes="旧案一旦证实，废土格局会被改写", mood="压抑锋利", status="已完成", tags=["引子", "旧案"], foreshadowing=["祖师剑意被切片改写"], unresolved_threads=["谁重启了信号"], character_ids=["char-suye", "char-luojin"], faction_ids=["fac-night-market"], location_id="loc-ruin-city"),
            StoryEvent(id="evt-monastery-return", title="重返无相旧山门", summary="主角与洛尽棠回到旧宗门遗址，找到翻案证据。", description="他们发现师门并非死于时代淘汰，而是被人为清算。", story_time="灵历 403.06 / 返潮夜后第三日", sequence=20, chapter_id="chap-cw-02", parent_id="evt-sand-signal", branch_label="旧案推进", purpose="把私人复仇抬升为文明秩序冲突", outcome="带走离线剑谱和旧案影像", consequence="龙骨荒漠入口被提前封锁", stakes="证据若被抢回，旧案会再次被埋掉", mood="肃杀静默", status="已铺垫", tags=["调查", "旧山门"], foreshadowing=["顾寒炉和旧案有关"], unresolved_threads=["洛尽棠隐瞒了什么未来"], character_ids=["char-suye", "char-luojin"], faction_ids=["fac-night-market", "fac-red-furnace"], location_id="loc-ghost-monastery"),
            StoryEvent(id="evt-bone-desert-war", title="龙骨荒漠夺脉战", summary="各方势力围绕最后灵脉展开争夺。", description="主角必须决定是毁掉灵脉，还是找到新的共享方式。", story_time="灵历 403.07 / 沙暴季初", sequence=30, chapter_id="chap-cw-03", parent_id="evt-monastery-return", branch_label="高潮主线", purpose="让理念冲突与人物旧账在同一处引爆", outcome="保留为测试项目后续扩写空间", consequence="这里可以继续长出多结局支线", stakes="灵脉归属会决定未来十年的秩序", mood="宏大危险", status="计划中", tags=["高潮", "灵脉"], foreshadowing=["祖师剑意并非单纯武学"], unresolved_threads=["主角最终站哪一边"], character_ids=["char-suye", "char-luojin", "char-guhan"], faction_ids=["fac-night-market", "fac-red-furnace"], location_id="loc-bone-desert"),
        ],
        overview=StoryOverview(
            book_title="霓火荒尘录",
            pitch="当飞剑变成神经外设、丹炉变成聚变熔炉，修仙文明在废土与财团统治之间重新长出牙齿。",
            synopsis="灵脉将尽，宗门衰亡，财团把传统修行拆成专利和税表。流亡剑修苏夜衡背着飞剑芯，在旧山门遗迹、黑市夜城和龙骨荒漠之间奔走，逐步发现师门覆灭是一场被设计的资源清算。",
            core_theme="当传承被资本化，修行究竟是在飞升，还是在为另一种统治续命。",
            ending_signal="结局应让主角提出一种不同于财团和旧门派的共享修行方案。",
            series_scope="单本可闭环，也可扩展为不同城邦与古法体系的系列。",
            narrative_style="赛博武侠、废土修仙、强氛围角色驱动。",
            active_promises=["主角师门旧案真相", "最后灵脉归属", "命数能否被改写"],
            chapters=[
                Chapter(id="chap-cw-01", title="断剑入网", subtitle="飞剑芯苏醒", sequence=1, summary="主角在返潮夜收到失效多年的离线剑讯。", objective="建立世界规则和主角旧案。", timeline_span="灵历 403.06", focus_question="是谁重新点亮了剑讯？", hook="缺失的祖师剑意去哪了？", pacing_note="前半卷要快。", scene_goals=["展示废土修仙世界观"], expected_character_ids=["char-suye", "char-luojin"]),
                Chapter(id="chap-cw-02", title="旧山门回响", subtitle="翻案与追捕", sequence=2, summary="主角和洛尽棠找到翻案证据。", objective="把私人复仇抬升为文明秩序冲突。", timeline_span="灵历 403.06", focus_question="主角想复仇，还是想终结制造复仇的体制？", hook="顾寒炉在旧案里扮演了什么角色？", pacing_note="调查、追捕和信任拉扯同步升温。", scene_goals=["建立双人组默契"], expected_character_ids=["char-suye", "char-luojin", "char-guhan"]),
                Chapter(id="chap-cw-03", title="龙骨争脉", subtitle="赛博修真决战", sequence=3, summary="各方势力为最后灵脉全面开战。", objective="完成理念冲突与人物弧线爆发。", timeline_span="灵历 403.07", focus_question="毁掉灵脉，还是重新定义它的归属？", hook="祖师剑意真正的用途是什么？", pacing_note="大战与人物选择都要有重量。", scene_goals=["完成主角站队"], expected_character_ids=["char-suye", "char-luojin", "char-guhan"]),
            ],
        ),
        settings=make_settings(sidebar_backgrounds, site_backgrounds, "cyber_wuxia"),
    )
