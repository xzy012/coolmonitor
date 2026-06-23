# 入门与运行

## 快速启动（开发）

```bash
npm install
npm run dev -- -p 3333
```

- 首次运行会自动生成 Prisma 客户端
- 浏览器访问: http://localhost:3333

## 常用脚本

```bash
# 启动开发（Turbopack）
npm run dev
# 构建生产
npm run build
# 启动生产
npm start
# 运行测试
npm run test
```

## 数据库

- SQLite 文件路径: `data/coolmonitor.db`
- Prisma 模型: `prisma/schema.prisma`
- 常用命令:

```bash
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

## Docker 运行（示例）

```bash
# x86/x64
docker run -d --name coolmonitor --restart always \
  -p 3333:3333 \
  -v ~/coolmonitor_data:/app/data \
  star7th/coolmonitor:latest

# ARM (如树莓派/Apple Silicon)
docker run -d --name coolmonitor --restart always \
  -p 3333:3333 \
  -v ~/coolmonitor_data:/app/data \
  star7th/coolmonitor:arm-latest
```

## 首次初始化

- 启动后访问首页，按引导创建管理员账号
- 系统会在 `data/` 下自动初始化/使用数据库
