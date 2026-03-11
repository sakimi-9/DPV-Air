# React 前端说明

## 功能概览
- 可视化大屏采用组件化结构：`components/charts`。
- 默认按每图 `1000` 条请求后端，可切换 `5000`、`10000`、`all`。
- `chart_10_daily_calendar` 在前端启用抽样显示（大数据量时自动降采样），提升渲染速度。
- `chart_10_daily_calendar` 的“请求条数 + 页码”已改为图表专属控件，且在放大弹窗中同样可用。
- 支持单图弹窗放大、左右切换。
- 支持导出图表压缩包（图片内容为放大态：图表标题 + 放大图表 + 分割线 + 详细分析文本）。
- 导出包含实时进度条，失败后可一键重试。

## 运行命令
```bash
bun install
bun run dev
```

## 构建命令
```bash
bun run build
```

## 目录结构
- `src/components/charts/ChartCanvas.tsx`：ECharts渲染组件。
- `src/components/charts/ChartCard.tsx`：图表卡片组件。
- `src/components/charts/ChartModal.tsx`：图表弹窗组件。
- `src/components/charts/ExportCaptureCard.tsx`：离屏放大导出组件。
- `src/services/api.ts`：后端接口请求。
- `src/utils/chartOption.ts`：图表配置映射。
- `src/utils/chartMeta.ts`：图表分析文案与卡片布局映射。

## 接口依赖
默认请求地址：`http://localhost:3000`

可通过环境变量覆盖：
```env
VITE_API_BASE=http://localhost:3000
```
