# 星图写作台

一个本地优先的小说创作辅助网站，面向长篇小说、系列设定集、世界观工程和多项目写作管理。

它提供视觉小说式交互界面，用来整理角色、世界观、事件树和章节总览；数据默认保存在本机，同时支持导入、导出和一键迁移。

## 许可说明

本仓库是公开仓库，但默认 **不允许他人在未获作者许可前进行商用**。

- 许可文件见 [LICENSE](LICENSE)
- 允许学习、研究、个人使用、非商业修改与非商业分享
- 商业使用、售卖、托管收费服务、接入商业产品等行为，必须先获得作者书面许可

这不是 OSI 定义下的开源许可证，而是公开可见的非商业许可仓库。

## 主要功能

- 角色页：角色卡片折叠查看、关系树、事件关联、人物设定维护
- 世界观页：世界总览、场景、势力、角色挂载
- 事件页：时间排序列表、父子事件树、分支事件管理
- 总览页：全书大纲、章节拆分、章节时间线、章节预期人物
- 设置页：项目切换、背景图库、风格预设、颜色主题、导入导出
- 本地项目存储：适合同时写多本小说
- 导出格式文档：适合把存档交给其他 AI 分析剧情逻辑

## 技术栈

- 后端：FastAPI
- 前端：原生 HTML / CSS / JavaScript（ES Modules）
- 数据存储：本地 JSON 文件
- 运行方式：本机浏览器 + 本地 Python 服务

## 适合谁

- 想在本地管理小说设定的作者
- 不想依赖云端数据库的个人创作者
- 想把角色、事件、世界观整理成结构化数据，再交给 AI 分析的人

## 仓库内包含什么

仓库只包含运行项目所必需的源码和文档，不包含你的个人存档与自定义图片。

未提交到仓库的内容包括：

- `storage/` 内的本地项目数据
- 你自己导入的背景图、角色图、地图图
- 本地日志与运行缓存
- 本地虚拟环境
- 已构建的 `.exe` 产物

这样做的目的是避免把你的私人创作数据和图片素材公开出去。

## 首次安装（Windows，推荐）

如果你完全没有代码基础，按下面做即可。

### 1. 先安装 Python

请安装：

- Python 3.11 或更高版本

建议从 Python 官网下载安装，并在安装时勾选：

- `Add Python to PATH`

安装完成后，双击仓库根目录下的：

- [Setup-Novel-Tools.cmd](Setup-Novel-Tools.cmd)

这个脚本会自动：

- 创建本地虚拟环境 `.venv`
- 升级 `pip`
- 安装项目依赖

### 2. 启动网站

初始化完成后，双击以下任一文件即可：

- [Launch-Novel-Tools.vbs](Launch-Novel-Tools.vbs)
- [Launch-Novel-Tools.cmd](Launch-Novel-Tools.cmd)

推荐使用：

- `Launch-Novel-Tools.vbs`

因为它会隐藏命令行窗口，体验更接近普通桌面程序。

启动后会自动：

- 检查本地服务是否已经运行
- 如果没运行就自动启动
- 打开默认浏览器进入网站

默认地址：

```text
http://127.0.0.1:8000/
```

## 手动安装与启动（适合会用命令行的人）

### 1. 创建虚拟环境

```powershell
py -3 -m venv .venv
```

如果你的电脑没有 `py` 命令，也可以用：

```powershell
python -m venv .venv
```

### 2. 安装依赖

```powershell
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 3. 运行服务

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

然后打开：

```text
http://127.0.0.1:8000/
```

## 第一次运行会发生什么

如果本地没有 `storage/` 数据目录，程序会自动创建初始数据，并生成示例项目：

- 默认示例项目：`灰穹回响`
- 测试项目：`赛博武侠与废土修仙`

所以公开仓库本身不需要携带你的个人项目数据，也能正常启动。

## 本地数据保存位置

运行后，数据默认保存到：

```text
storage/
  workspace.json
  projects/
    <project_id>/
      state.json
```

说明：

- `workspace.json` 保存项目列表、当前激活项目、共享风格预设
- `projects/<project_id>/state.json` 保存单个项目的完整数据

这些文件默认不会进入 git 仓库。

## 如何备份和迁移

在网页的设置页中可以：

- 导出当前项目
- 导入为新项目
- 覆盖当前项目
- 切换不同小说项目

导出格式说明文档见：

- [docs/export-format.md](docs/export-format.md)

这个文档已经细化到每个字段的含义，适合把存档交给其他 Chat / AI 模型分析剧情结构、人物逻辑和章节节奏。

## 给完全没有代码基础的使用建议

推荐按这个顺序：

1. 安装 Python
2. 双击 `Setup-Novel-Tools.cmd`
3. 双击 `Launch-Novel-Tools.vbs`
4. 在浏览器里开始使用
5. 定期在设置页导出项目做备份

如果以后换电脑：

1. 先把仓库拷过去
2. 再导入你之前导出的项目 JSON
3. 背景图、风格、项目数据都会随导出文件一起迁移

## 常见问题

### 1. 双击启动器没有反应

先确认：

- 你已经运行过 `Setup-Novel-Tools.cmd`
- 电脑里已经安装 Python

如果依旧不行，可以手动运行：

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### 2. 浏览器打不开页面

请确认本地地址是否可访问：

```text
http://127.0.0.1:8000/
```

如果端口被占用，先关闭已有服务，再重新启动。

### 3. 我担心自己的小说数据被公开

不用担心，仓库默认不提交：

- `storage/`
- 你自己的图片素材
- 本地导出的个人项目数据

## 面向开发者

### 目录结构

```text
app/                  FastAPI 后端与数据模型
static/               前端页面、样式、脚本
docs/                 文档
tools/                辅助脚本
storage/              本地项目数据（默认不提交）
```

### 主要接口

- `GET /` 前端页面
- `GET /api/health` 健康检查
- `GET /api/bootstrap` 启动时加载工作区与当前项目
- `PUT /api/state` 保存当前项目
- `POST /api/projects/create` 创建项目
- `POST /api/projects/switch` 切换项目
- `GET /api/export` 导出当前项目
- `POST /api/import` 导入项目

## 发布与分享建议

如果你要把这个项目分享给朋友，推荐告诉对方：

- 先安装 Python
- 再运行 `Setup-Novel-Tools.cmd`
- 最后双击 `Launch-Novel-Tools.vbs`

如果对方只是普通使用者，不需要懂 FastAPI、命令行或前端代码。
