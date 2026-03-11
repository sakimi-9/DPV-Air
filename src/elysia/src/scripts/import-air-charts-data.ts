import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../lib/prisma";

type AirChartsData = {
    meta?: Record<string, unknown>;
    [key: string]: unknown;
};

const CHART_TITLE_MAP: Record<string, string> = {
    chart_01_aqi_monthly_trend: "AQI月度趋势",
    chart_02_aqi_monthly_box: "AQI月度分布",
    chart_03_aqi_by_season: "季节AQI对比",
    chart_04_primary_pollutant_share: "首要污染物占比",
    chart_05_pollutants_monthly_trend: "六项污染物月均趋势",
    chart_06_pollutants_corr: "污染物相关性热力图",
    chart_07_aqi_level_monthly: "AQI等级月度分布",
    chart_08_subindex_monthly: "分指数贡献对比",
    chart_09_weekday_weekend_compare: "工作日与周末AQI对比",
    chart_10_daily_calendar: "日历热力图",
    chart_11_hourly_pollutant_by_code: "小时尺度污染物变化",
    chart_12_station_compare: "站点污染水平对比",
    chart_13_aqi_forecast_14d: "AQI短期趋势外推",
};

const BATCH_SIZE = 1000;

function getInputFilePath(): string {
    // 从 elysia/src/scripts 定位到 python/data_processed
    return path.resolve(import.meta.dir, "../../../python/data_processed/air_charts_data.json");
}

function toRelativePath(targetPath: string): string {
    // 统一按当前执行目录输出相对路径，避免日志出现绝对路径
    const rel = path.relative(process.cwd(), targetPath);
    return rel || ".";
}

function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        chunks.push(items.slice(i, i + batchSize));
    }
    return chunks;
}

async function main() {
    const inputFile = getInputFilePath();
    console.log("[STEP] 开始导入 air_charts_data.json 到 MySQL");
    console.log(`[INFO] 输入文件: ${toRelativePath(inputFile)}`);

    const raw = await readFile(inputFile, "utf-8");
    const payload = JSON.parse(raw) as AirChartsData;

    const chartKeys = Object.keys(payload).filter((key) => key.startsWith("chart_"));
    console.log(`[INFO] 识别图表数量: ${chartKeys.length}`);

    for (const chartKey of chartKeys) {
        const chartPayload = payload[chartKey];

        // 统一展开为行数据，便于后续分页查询
        const pointRows = Array.isArray(chartPayload)
            ? chartPayload
            : Object.entries((chartPayload ?? {}) as Record<string, unknown>).map(([k, v]) => ({
                key: k,
                value: v,
            }));

        const title = CHART_TITLE_MAP[chartKey] ?? chartKey;

        // 非交互事务方案：先清空旧明细，再分批写入，避免大批量 createMany 导致事务超时。
        await prisma.chartPoint.deleteMany({ where: { chartKey } });

        await prisma.chartDataset.upsert({
            where: { chartKey },
            create: {
                chartKey,
                title,
                payload: chartPayload as any,
                rowCount: 0,
            },
            update: {
                title,
                payload: chartPayload as any,
                rowCount: 0,
            },
        });

        const batches = splitIntoBatches(pointRows, BATCH_SIZE);
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
            const batch = batches[batchIndex];
            const indexOffset = batchIndex * BATCH_SIZE;

            await prisma.chartPoint.createMany({
                data: batch.map((row, offset) => ({
                    chartKey,
                    indexNo: indexOffset + offset,
                    data: row as any,
                })),
            });
        }

        await prisma.chartDataset.update({
            where: { chartKey },
            data: { rowCount: pointRows.length },
        });

        console.log(
            `[OK] ${chartKey} 导入完成: rowCount=${pointRows.length}, batches=${Math.max(batches.length, 1)}`,
        );
    }

    const datasetCount = await prisma.chartDataset.count();
    const pointCount = await prisma.chartPoint.count();

    console.log(`[DONE] 导入完成: datasets=${datasetCount}, points=${pointCount}`);
}

main()
    .catch((error) => {
        console.error("[ERROR] 导入失败:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
