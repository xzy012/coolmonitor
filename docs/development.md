# 本地开发与约定

## 环境
- Node 18+
- `npm install`

## 脚本
- 开发: `npm run dev`
- 构建: `npm run build`
- 启动: `npm start`
- 测试: `npm run test`

## 代码风格（TypeScript）
- 使用具名清晰的变量与函数名
- 函数早返回、处理边界与错误分支
- 避免深层嵌套，优先 2-3 层
- 注释写“为什么”，非“怎么做”；避免无意义注释
- 匹配既有格式与排版

## 目录与角色
- `src/app`: App Router 页面与 API
- `src/lib`: 业务与工具（监控、通知、设置、数据库等）
- `src/components`: 复用 UI 组件
- `prisma/`: 模型与迁移

## 调试
- API 日志：查看终端输出
- 调试配置：`/api/settings/debug`（仅开发环境）
- 代理测试：`/api/settings/proxy-test`

## 推荐阅读顺序
1) 《architecture.md》
2) 《monitoring-system.md》
3) 《api-reference.md》《data-models.md》
4) 《configuration.md》
