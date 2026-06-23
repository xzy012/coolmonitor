# 配置与环境

## 端口与 Next.js
- 默认端口: 3333（`next.config.js` → `env.PORT`）

## 系统设置（保存在 `SystemConfig` 表）
来源: `src/lib/settings.ts`

- `timezone`（默认 `Asia/Shanghai`）
- `data_retention_days`（默认 `90`）
- 代理相关：
  - `proxy_enabled`（`true`/`false` 字符串）
  - `proxy_server`
  - `proxy_port`
  - `proxy_username`
  - `proxy_password`

读取批量函数：`getAllGeneralSettings`、`getAllProxySettings`
更新：`updateSettings`（会将值归一化为字符串）

## 认证密钥
- `NEXTAUTH_SECRET`：若未设置，系统将生成临时密钥（重启后会话失效），函数 `getOrCreateJwtSecret()`

## 其它
- Tailwind 变量与 safelist: 见 `tailwind.config.ts`
- 主题色通过 CSS 变量注入，详见《design-system.md》
