# 监控导入功能说明（Excel 批量创建）

本篇文档专门介绍“导入监控项”功能的端到端流程，包括前端入口、Excel 模板格式、后台实现以及性能与错误处理要点。

## 功能概览

- 通过 Excel 文件一次性批量创建多个监控项
- 支持以下监控类型：`http`、`https-cert`、`keyword`、`port`、`mysql`、`redis`、`icmp`、`push`
- 支持按“分组名称”自动归类监控，分组不存在时会自动创建
- 导入完成后会**统一调度**新建监控项，避免逐条调度导致导入变慢

## 前端入口与交互

- 入口位置：监控列表页面 `src/app/dashboard/monitors` 中的“导入监控项”弹窗
- 组件实现：`src/app/dashboard/monitors/components/import-dialog.tsx`
- 主要交互：
  - 支持下载导入模板：`GET /api/monitors/template`
  - 选择本地 Excel 文件（`.xlsx` / `.xls`）
  - 提交后通过 `fetch('/api/monitors/import', { method: 'POST', body: FormData })` 上传
  - 前端展示：
    - 成功条数 / 失败条数
    - 每一条失败记录的 Excel 行号与错误原因

## 后端接口与实现

### 路由

- API 路径：`POST /api/monitors/import`
- 实现文件：`src/app/api/monitors/import/route.ts`

主要流程：

1. **认证校验**
   - 使用 `getServerSession(authOptions)` 校验当前登录用户
2. **接收文件**
   - 从 `request.formData()` 中读取 `file` 字段
   - 限制文件后缀为 `.xlsx` / `.xls`
3. **解析 Excel**
   - 使用 `xlsx` 库：
     - 读取第一个工作表
     - 通过 `XLSX.utils.sheet_to_json` 转为行数组
4. **预加载分组**
   - 根据当前用户 `createdById` 预先读取已有 `MonitorGroup`
   - 使用 `Map(name → id)` 来快速匹配，避免重复查询
5. **逐行校验与创建监控**
   - 对每一行数据：
     - 校验必填字段（监控名称 / 类型 / 具体类型的必填字段）
     - 构建 `config` 对象（HTTP、端口、数据库、ICMP 等类型各有不同）
     - 处理“分组名称”：不存在则创建 `MonitorGroup`，并加入缓存 Map
     - 组装 `monitorData` 并调用 `monitorOperations.createMonitor`
     - 成功则：
       - `results.success++`
       - 把 `monitor.id` 记录到 `createdMonitorIds` 数组
     - 失败则：
       - `results.failed++`
       - 记录 `rowNumber`（Excel 行号，从 2 开始）与错误信息
6. **统一调度新监控**
   - 导入循环结束后，如果存在成功创建的监控：
     - 使用 `setImmediate` 异步导入 `scheduleMonitor`，对 `createdMonitorIds` 逐个调度
     - 避免在导入循环中频繁调度，提升批量导入性能
7. **返回结果**
   - 返回结构：
     - `message: "导入完成：成功 X 条，失败 Y 条"`
     - `results: { success, failed, errors: [{ row, error }] }`

## Excel 模板与字段说明

### 通用字段

所有类型通用字段（列名可以使用中文或英文）：

- `监控名称` / `name`（必填）
- `监控类型` / `type`（必填，见“支持类型”一节）
- `检查间隔(秒)` / `interval`（可选，默认 60）
- `重试次数` / `retries`（可选，默认 0）
- `重试间隔(秒)` / `retryInterval`（可选，默认 60）
- `重发间隔(秒)` / `resendInterval`（可选，默认 0）
- `反向监控` / `upsideDown`（可选，`true` / `false`，默认 `false`）
- `描述` / `description`（可选）
- `是否启用` / `active`（可选，默认 `true`）
- `分组名称` / `groupName`（可选，不存在则自动创建分组）

### HTTP / Keyword / HTTPS-Cert

额外字段：

- `URL` / `url`（必填）
- `HTTP方法` / `httpMethod`（可选，默认 `GET`）
- `状态码范围` / `statusCodes`（可选，默认 `200-299`）
- `最大重定向次数` / `maxRedirects`（可选，默认 10）
- `连接超时(秒)` / `connectTimeout`（可选，默认 10）
- `忽略TLS错误` / `ignoreTls`（可选，`true` / `false`，默认 `false`）
- `通知证书到期` / `notifyCertExpiry`（仅 http，可选，默认 `false`）
- `关键字` / `keyword`（仅 keyword，必填）
- `请求体` / `requestBody`（可选）
- `请求头` / `requestHeaders`（可选）

特别校验：

- `https-cert` 类型要求 `URL` 以 `https://` 开头，否则会报错。

### 端口 / MySQL / Redis

额外字段：

- `主机名` / `hostname`（必填）
- `端口` / `port`（必填，需为数字）

当类型为 `mysql` / `redis` 时：

- `用户名` / `username`（可选）
- `密码` / `password`（可选）
- `查询语句` / `query`（可选）
- `数据库名` / `database`（仅 mysql，可选）

### ICMP

额外字段：

- `主机名` / `hostname`（必填）

（ICMP 的包数与丢包配置在导入时使用固定默认值：`packetCount = 4`，`maxPacketLoss = 0`，后续如有需要可以扩展模板字段。）

### Push

当前导入侧对 Push 类型只要求基本字段（名称、类型等），Token 与推送逻辑由后续配置/调用管理；如需扩展为“批量生成 Token 并导出”，建议另开专门导出/导入设计。

## 性能与错误处理

### 性能设计

- Excel 解析：一次性读取第一个工作表并转为 JSON 数组
- 数据库操作：
  - 监控创建：逐条调用 `monitorOperations.createMonitor`，单条事务，便于错误隔离
  - 分组：使用 `groupMap` 缓存，分组名首次出现才会 `INSERT`
- 调度策略：
  - 导入循环期间**不立刻调度**
  - 全部成功创建后，使用 `setImmediate` 异步统一调度新建监控
  - 逐个顺序调用 `scheduleMonitor(id)`，避免一次性高并发导致 CPU 抖动

整体效果：在几十~上百条监控的导入场景下，响应时间相对稳定，避免“导入接口等待很久”的体验。

### 错误处理

- 每一行独立 `try/catch`：
  - 任意一条失败不会影响其他行
  - 失败行会记录：
    - `row`: Excel 行号（从 2 开始）
    - `error`: 具体错误文本（包括类型非法、字段缺失、数据库异常等）
- 全局异常：
  - 外层 `try/catch` 捕获解析或系统级错误
  - 返回 `500` 与通用错误信息：`导入监控项失败，请稍后重试`

## 扩展与修改建议

- 如需支持新的监控类型：
  - 在导入逻辑中扩展 `validTypes`
  - 按类型构建对应 `config` 字段
  - 确保在监控系统中已有对应类型的检查器与 API 校验逻辑
- 如需进一步提升吞吐：
  - 可以考虑增加“后台任务队列”：导入接口只负责校验 + 写入一张临时任务表，由后台 worker 批量创建监控并调度
  - 当前版本由于使用 SQLite，采用“逐条事务 + 统一调度”的方式在复杂度与性能之间做了折中

如果你在修改导入逻辑（例如新增字段、类型或调度策略），建议同时更新本文件与前端模板提示文案，保持行为与文档一致。


