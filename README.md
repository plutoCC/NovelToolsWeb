# 星图写作台

一个本地优先的小说创作辅助网站，用来管理角色、世界观、事件树、章节总览和多项目写作数据。

## License

本项目基于 [MIT License](LICENSE) 开源。

## 功能概览

- 角色页：角色设定、关系树、事件关联
- 世界观页：世界总览、场景、势力、角色挂载
- 事件页：时间排序、父子事件树、分支事件
- 总览页：全书大纲、章节拆分、章节时间线
- 设置页：项目切换、背景图库、风格预设、导入导出
- 导出格式文档：见 [docs/export-format.md](docs/export-format.md)

## 技术栈

- 后端：FastAPI
- 前端：HTML / CSS / JavaScript（ES Modules）
- 数据存储：本地 JSON 文件

## 环境要求

安装并确保以下环境可用：

- Python 3.11 或更高版本

## 安装

在项目根目录执行：

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

如果你的环境没有 `py` 命令，也可以把第一条改成：

```powershell
python -m venv .venv
```

## 启动

### 方式一：双击启动

先执行一次：

- [Setup-Novel-Tools.cmd](Setup-Novel-Tools.cmd)

之后双击以下任一文件即可启动：

- [Launch-Novel-Tools.vbs](Launch-Novel-Tools.vbs)
- [Launch-Novel-Tools.cmd](Launch-Novel-Tools.cmd)

### 方式二：命令行启动

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

启动后打开：

```text
http://127.0.0.1:8000/
```

## 首次运行

首次运行时，程序会自动创建本地数据目录，并生成默认示例项目与测试项目。

## 常用数据操作

- 在设置页中可以导出当前项目
- 可以导入为新项目或覆盖当前项目
- 可以在多个小说项目之间切换

## 项目结构

```text
app/                  FastAPI 后端与数据模型
static/               前端页面、样式、脚本
docs/                 文档
tools/                辅助脚本
storage/              本地项目数据
```

## 主要接口

- `GET /` 前端页面
- `GET /api/health` 健康检查
- `GET /api/bootstrap` 加载工作区与当前项目
- `PUT /api/state` 保存当前项目
- `POST /api/projects/create` 创建项目
- `POST /api/projects/switch` 切换项目
- `GET /api/export` 导出当前项目
- `POST /api/import` 导入项目
