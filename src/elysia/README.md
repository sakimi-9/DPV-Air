# Elysia 后端说明（MySQL + Prisma）

## 1. 环境变量
在 `src/elysia/.env` 中配置：

```env
DATABASE_URL="mysql://root:123456@localhost:3306/dpv-air"
```

## 2. 安装依赖
```bash
bun install
```

## 3. Prisma 初始化与建模同步
```bash
bun run prisma:generate
bun run prisma:push
```

## 4. 导入与检查图表数据
```bash
bun run import:air
bun run check:air
```

- `import:air` 已采用“非交互事务 + 分批写入（默认1000条/批）”策略，降低大数据量导入时的事务超时风险。
- 导入日志中的文件路径统一输出为相对路径，便于跨环境排查。

## 5. 启动后端
```bash
bun run dev
```

## 6. 接口说明
- `GET /api/health`：服务和数据健康检查。
- `GET /api/charts/meta`：图表元数据列表。
- `GET /api/charts/:chartKey?size=1000&page=1`：按图表键分页查询。
  - `size` 支持：`1000`、`5000`、`10000`、`all`。
  - `page` 在 `size=all` 时固定为 1。

## 7. 数据来源约定
- 输入：`src/python/data_processed/air_charts_data.json`
- 入库模型：
  - `ChartDataset`：图表级元数据与完整payload。
  - `ChartPoint`：拆分后的明细行数据，用于分页查询。
