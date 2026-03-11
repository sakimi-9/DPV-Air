import "dotenv/config";

import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { prisma } from "./lib/prisma";

const PAGE_SIZE_MAP: Record<string, number> = {
  "1000": 1000,
  "5000": 5000,
  "10000": 10000,
};

const app = new Elysia()
  // 允许前端开发服务器跨域访问后端接口
  .use(
    cors({
      origin: "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  .get("/", () => ({
    message: "Air Charts API is running",
    service: "elysia",
  }))
  .get("/api/health", async () => {
    const datasetCount = await prisma.chartDataset.count();
    const pointCount = await prisma.chartPoint.count();
    return {
      ok: true,
      datasetCount,
      pointCount,
      now: new Date().toISOString(),
    };
  })
  .get("/api/charts/meta", async () => {
    const rows = await prisma.chartDataset.findMany({
      orderBy: { chartKey: "asc" },
      select: {
        chartKey: true,
        title: true,
        rowCount: true,
        importedAt: true,
      },
    });
    return {
      total: rows.length,
      data: rows,
    };
  })
  .get("/api/charts/:chartKey", async ({ params, query }) => {
    const { chartKey } = params;

    const sizeRaw = String(query.size ?? "1000");
    const pageRaw = Number(query.page ?? 1);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

    const dataset = await prisma.chartDataset.findUnique({
      where: { chartKey },
      select: {
        chartKey: true,
        title: true,
        rowCount: true,
        importedAt: true,
        payload: true,
      },
    });

    if (!dataset) {
      return {
        ok: false,
        message: `未找到图表: ${chartKey}`,
      };
    }

    // 支持 1000、5000、1W、全部 四种拉取方式
    if (sizeRaw === "all") {
      const points = await prisma.chartPoint.findMany({
        where: { chartKey },
        orderBy: { indexNo: "asc" },
      });

      return {
        ok: true,
        chart: dataset,
        pagination: {
          size: "all",
          page: 1,
          totalRows: dataset.rowCount,
          totalPages: 1,
        },
        data: points.map((item) => item.data),
      };
    }

    const pageSize = PAGE_SIZE_MAP[sizeRaw] ?? 1000;
    const totalPages = Math.max(1, Math.ceil(dataset.rowCount / pageSize));
    const safePage = Math.min(page, totalPages);

    const points = await prisma.chartPoint.findMany({
      where: { chartKey },
      orderBy: { indexNo: "asc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return {
      ok: true,
      chart: dataset,
      pagination: {
        size: pageSize,
        page: safePage,
        totalRows: dataset.rowCount,
        totalPages,
      },
      data: points.map((item) => item.data),
    };
  })
  .listen(3000);

console.log(`Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
