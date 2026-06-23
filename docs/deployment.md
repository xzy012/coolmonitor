# 部署与运维

## Docker（推荐）

```bash
# x86/x64
docker run -d --name coolmonitor --restart always \
  -p 3333:3333 \
  -v ~/coolmonitor_data:/app/data \
  star7th/coolmonitor:latest

# ARM
docker run -d --name coolmonitor --restart always \
  -p 3333:3333 \
  -v ~/coolmonitor_data:/app/data \
  star7th/coolmonitor:arm-latest
```

- 映射卷 `~/coolmonitor_data:/app/data` 用于持久化数据库
- 端口默认 3333，可按需映射

## 环境变量
- `NEXTAUTH_SECRET`：建议生产明确设置

## 备份与升级
- 数据库文件位于 `data/coolmonitor.db`
- 升级流程与安全说明见《database-upgrade-safety.md》

## 监控与日志
- 查看容器日志：`docker logs -f coolmonitor`
- 出错时先检查数据库与系统设置
