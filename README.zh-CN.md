# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Hermes Manager 截图](./docs/images/ss-agents-1.png)

Hermes Manager 是一个基于 Next.js 的控制平面，用于在单台主机上集中运营多个 Hermes Agent。
与官方 Hermes dashboard 作为管理单个 Hermes 安装的 UI 不同，Hermes Manager 并不是一个追求功能对等的替代品，而是定位于受信网络 / 内网环境下的多 Agent 运维。它更强调 agent 的 provisioning、templates / partials 的应用、按 agent 分层的环境变量管理、本地服务控制，以及对配置、日志和聊天历史的跨 agent 统一管理。

本应用的另一项核心差异化能力，是通过“partial prompt”来维护多个 agent 的 SOUL。每个 agent 一方面保留与 runtime 兼容的已部署 `SOUL.md`，另一方面又可以在用于编辑的 `SOUL.src.md` 中通过 `embed/include` 引入共享 partial。这样一来，你就可以在一个地方更新跨多个 agent 的通用策略和运维规则，同时仅为各 agent 单独保留其差异部分。

## 本应用的特点

- 在单台主机上集中运营多个 agent 的控制平面
- 提供 agent 之间 managed delegation / dispatch 的子代理运维基础设施
- 通过 per-agent delegation policy 控制委派目标、防止循环并限制最大 hop 数
- 允许 operator 自由设计 domain agent / specialist agent 等角色分工模型
- 通过 templates / partials / memory assets 实现可复用的 provisioning
- 支持将共享 partial prompt 嵌入多个 agent 的 `SOUL.md`，实现 SOUL composability
- 在保持 Hermes runtime 兼容性的同时，自动重新生成组装后的 `SOUL.md`
- 将各 agent 的差异与整个 fleet 的共享规范分离维护的运维模型
- 与 launchd / systemd 集成的本地服务控制

### Managed Subagent Delegation

![Managed subagent delegation 架构图](./docs/images/hermes-managed-subagent-delegation-org.png)

通过 Hermes Manager 的子代理功能，你可以构建一种按角色分工、协同工作的运维模型，而不是让每个 agent 独自完成所有事情。图中展示的是：按业务域划分的 agent（如 Project A / Project B / Client C）作为用户请求的入口，再将所需工作委派给 Python Developer、Marketing Analyzer、Web Designer、Flutter Developer 等 specialist agent。

在这种模式下，Hermes Manager 不只是提供 agent 之间通信的入口。它更像一个控制平面，允许 operator 管理“哪个 agent 可以使用哪些 specialist”以及“最多允许委派多少层”。因此，即使增加了更多按业务域划分的 agent，也可以把专业能力作为 shared resource 复用，同时保持整个 fleet 行为的一致性。

这一能力的价值在于，operator 设计好的角色分工，可以通过 managed delegation 与策略控制被安全地运行起来。即使前台入口 agent 的数量增加，specialist agent 依然容易被复用，委派规则也能集中管理，从而使由多个 agent 组合而成的实际工作流更容易长期维护。

### Shared Partial Prompt / SOUL Composability

![Partial prompt 架构图](./docs/images/hermes-partial-prompts.png)

在这一结构中，共享 partial prompt 作为 shared asset 被统一管理，并从多个 agent 的 `SOUL.src.md` 中通过 `embed/include` 引入，最终组装出 `SOUL.md`。operator 可以把所有 agent 共享的规则、安全方针和主机运维规范集中放在 partial 侧，而每个 agent 只需要编写其角色特有的差异部分。结果就是，它能减少共享指令不同步的问题，并让整个 fleet 的 SOUL 维护更加一致。

## 文档地图

- 需求定义: [`docs/requirements.md`](./docs/requirements.md)
- 架构 / API 设计: [`docs/design.md`](./docs/design.md)
- 英文版 README: [`README.md`](./README.md)
- 贡献指南: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- 安全报告: [`SECURITY.md`](./SECURITY.md)
- 面向使用者的说明: [`SUPPORT.md`](./SUPPORT.md)

## 概要

在 Hermes Manager 中，你可以通过浏览器 UI 执行以下操作。

- 在单台主机上集中运营多个 agent
- 对 agent 进行 provisioning、复制和删除
- 通过 launchd（macOS）/ systemd（Linux）执行启动、停止和重启
- 编辑 `SOUL.md`、`SOUL.src.md`、`memories/MEMORY.md`、`memories/USER.md`、`config.yaml` 和 `.env`
- 管理带有 visibility 元数据的 global / agent 环境变量分层
- 复用 templates / partials，并从本地技能目录中为 agent equip 技能
- 查看本地服务控制、日志、Cron 作业和聊天会话

## 安全性 / 信任边界

该项目假定运行在 trusted-network / intranet 环境中。
默认不包含面向公共互联网的身份验证、面向多人使用的权限隔离，或对外公开所需的内建防护。
如果要在内网之外运行，请务必在前面加上你自己的身份验证和访问控制层。

## 截图

### Agents 列表

![Hermes Manager 截图](./docs/images/ss-agents-1.png)

### 内存管理

![Hermes Manager 内存管理界面](./docs/images/ss-agent_memory-1.png)

## 贡献方式

关于提案流程、质量门禁和实现前提，请参阅 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

## 许可证

MIT。请参阅 [`LICENSE`](./LICENSE)。
