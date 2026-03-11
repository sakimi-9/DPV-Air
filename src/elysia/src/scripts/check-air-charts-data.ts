import "dotenv/config";

import { prisma } from "../lib/prisma";

async function main() {
    console.log("[STEP] 开始检查图表导入结果");

    const datasets = await prisma.chartDataset.findMany({
        orderBy: { chartKey: "asc" },
        select: {
            chartKey: true,
            title: true,
            rowCount: true,
            importedAt: true,
        },
    });

    if (datasets.length === 0) {
        console.log("[WARN] 当前数据库中没有图表数据，请先执行 bun run import:air");
        return;
    }

    let mismatchCount = 0;
    for (const ds of datasets) {
        const realCount = await prisma.chartPoint.count({ where: { chartKey: ds.chartKey } });
        const isMatch = realCount === ds.rowCount;
        if (!isMatch) {
            mismatchCount += 1;
        }

        console.log(
            `[CHECK] ${ds.chartKey} | title=${ds.title} | datasetRowCount=${ds.rowCount} | pointCount=${realCount} | match=${isMatch}`,
        );
    }

    const totalDataset = await prisma.chartDataset.count();
    const totalPoints = await prisma.chartPoint.count();

    console.log(`[INFO] 数据集总数: ${totalDataset}`);
    console.log(`[INFO] 明细点总数: ${totalPoints}`);
    console.log(`[INFO] 行数不一致图表数: ${mismatchCount}`);
    console.log("[DONE] 数据检查完成");
}

main()
    .catch((error) => {
        console.error("[ERROR] 检查失败:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
