# 故障排查

## 登录异常 / 会话丢失
- 未设置 `NEXTAUTH_SECRET` 将使用临时密钥，重启后会话失效；生产环境请设置固定值

## 数据库锁定或损坏
- 停止应用，备份 `data/coolmonitor.db`，使用 `prisma studio`/SQLite 工具检查
- 参考《database-upgrade-safety.md》恢复方案

## 端口占用
- 修改映射或释放 3333 端口

## 代理测试失败
- 检查 `/api/settings` 中 `proxy_enabled/server/port` 是否正确
- 使用 `/api/settings/proxy-test` 验证，阅读返回的 `statusCode/responseBody`

## 状态页 404 / 未公开
- 确认 `StatusPage.isPublic = true`
- 路由为 `/status/[slug]`

## 监控未执行/不触发
- 检查监控 `active=true`、`interval` 是否合理
- 查看服务日志中 `scheduler` 输出
- 使用 `/api/monitors/start|stop|reset` 验证

## 通知未收到
- 检查通知渠道配置是否启用，必要字段是否填写
- 查看服务端日志中 `send...Notification` 输出
- 使用 `/api/settings/notifications/test` 页面（如有）或构造失败场景测试
