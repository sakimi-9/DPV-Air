import type { EChartsOption } from "echarts";

const AQI_LEVEL_COLOR: Record<string, string> = {
    优: "#00E400",
    良: "#FFFF00",
    轻度污染: "#FF7E00",
    中度污染: "#FF0000",
    重度污染: "#99004C",
    严重污染: "#7E0023",
};

const SERIES_COLORS = [
    "#00E400",
    "#FFFF00",
    "#FF7E00",
    "#FF0000",
    "#99004C",
    "#7E0023",
    "#00B7FF",
    "#6EE7B7",
];

function asNumber(value: unknown): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

function asString(value: unknown): string {
    return typeof value === "string" ? value : String(value ?? "");
}

function displayPollutantName(value: unknown): string {
    const name = asString(value).trim();
    if (!name || name === "--") {
        return "无首要污染物";
    }
    return name;
}

function baseOption(): EChartsOption {
    return {
        backgroundColor: "transparent",
        color: SERIES_COLORS,
        grid: { left: 45, right: 18, top: 38, bottom: 40 },
        tooltip: { trigger: "axis" },
        textStyle: {
            color: "#FFFFFF",
            fontFamily: "'Noto Sans SC', 'Microsoft YaHei', sans-serif",
        },
        legend: {
            top: 8,
            textStyle: { color: "#FFFFFF" },
        },
        xAxis: {
            type: "category",
            axisLabel: { color: "#FFFFFF" },
            axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } },
        },
        yAxis: {
            type: "value",
            axisLabel: { color: "#FFFFFF" },
            splitLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
            axisLine: { lineStyle: { color: "rgba(255,255,255,0.25)" } },
        },
    };
}

export function createOption(chartKey: string, rows: Record<string, unknown>[]): EChartsOption {
    const option = baseOption();

    function convertCorrRows(inputRows: Record<string, unknown>[]) {
        // 兼容两种格式：
        // 1) [{aqi:1,pm25:0.5,...}, ...]
        // 2) [{key:'aqi', value:{aqi:1,pm25:0.5,...}}, ...]
        const isKeyValueShape =
            inputRows.length > 0 && "key" in inputRows[0] && "value" in inputRows[0];

        if (!isKeyValueShape) {
            return inputRows;
        }

        return inputRows.map((row) => {
            const rowName = asString(row.key);
            const rowValue = row.value as Record<string, unknown>;
            return {
                rowName,
                ...rowValue,
            };
        });
    }

    if (chartKey === "chart_01_aqi_monthly_trend") {
        return {
            ...option,
            xAxis: { ...(option.xAxis as object), data: rows.map((item) => asString(item.month)) },
            series: [
                {
                    type: "line",
                    smooth: true,
                    name: "AQI",
                    areaStyle: { opacity: 0.2 },
                    data: rows.map((item) => asNumber(item.aqi_mean)),
                },
            ],
        };
    }

    if (chartKey === "chart_02_aqi_monthly_box") {
        return {
            ...option,
            tooltip: { trigger: "item" },
            xAxis: { ...(option.xAxis as object), data: rows.map((item) => asString(item.month)) },
            yAxis: option.yAxis,
            series: [
                {
                    name: "AQI分布",
                    type: "boxplot",
                    data: rows.map((item) => [
                        asNumber(item.min),
                        asNumber(item.q1),
                        asNumber(item.median),
                        asNumber(item.q3),
                        asNumber(item.max),
                    ]),
                },
            ],
        };
    }

    if (chartKey === "chart_03_aqi_by_season") {
        return {
            ...option,
            xAxis: { ...(option.xAxis as object), data: rows.map((item) => asString(item.season)) },
            series: [{ type: "bar", data: rows.map((item) => asNumber(item.aqi_mean)), name: "AQI" }],
        };
    }

    if (chartKey === "chart_04_primary_pollutant_share") {
        return {
            ...option,
            tooltip: { trigger: "item" },
            legend: { top: 8, textStyle: { color: "#FFFFFF" } },
            series: [
                {
                    type: "pie",
                    radius: ["40%", "68%"],
                    center: ["50%", "56%"],
                    label: { color: "#FFFFFF" },
                    data: rows.map((item) => ({
                        name: displayPollutantName(item.sywrw),
                        value: asNumber(item.count),
                    })),
                },
            ],
        };
    }

    if (chartKey === "chart_05_pollutants_monthly_trend") {
        const metrics = ["pm25", "pm10", "so2", "no2", "co", "o3_8h"];
        return {
            ...option,
            xAxis: { ...(option.xAxis as object), data: rows.map((item) => asString(item.month)) },
            series: metrics.map((metric) => ({
                type: "line",
                smooth: true,
                showSymbol: false,
                name: metric.toUpperCase(),
                data: rows.map((item) => asNumber(item[metric])),
            })),
        };
    }

    if (chartKey === "chart_06_pollutants_corr") {
        const corrRows = convertCorrRows(rows);
        const allKeys = Object.keys(corrRows[0] ?? {});
        const keys = allKeys.filter((item) => item !== "rowName");
        const matrix = corrRows.flatMap((row, y) =>
            keys.map((xKey, x) => [x, y, asNumber((row as Record<string, unknown>)[xKey])]),
        );

        const yLabels =
            corrRows.length > 0 && "rowName" in corrRows[0]
                ? corrRows.map((row) => asString((row as Record<string, unknown>).rowName) || "-")
                : keys;

        return {
            ...option,
            grid: { left: 64, right: 20, top: 44, bottom: 86 },
            tooltip: { position: "top" },
            xAxis: { type: "category", data: keys, axisLabel: { color: "#FFFFFF", rotate: 30 } },
            yAxis: { type: "category", data: yLabels, axisLabel: { color: "#FFFFFF" } },
            visualMap: {
                min: -1,
                max: 1,
                calculable: true,
                orient: "horizontal",
                left: "center",
                bottom: 6,
                textStyle: { color: "#FFFFFF" },
            },
            series: [{ type: "heatmap", data: matrix, label: { show: true, color: "#111" } }],
        };
    }

    if (chartKey === "chart_07_aqi_level_monthly") {
        const levels = ["优", "良", "轻度污染", "中度污染", "重度污染", "严重污染"];
        const months = Array.from(new Set(rows.map((item) => asString(item.month))));
        return {
            ...option,
            xAxis: { ...(option.xAxis as object), data: months },
            series: levels.map((level) => ({
                type: "bar",
                stack: "aqi",
                name: level,
                itemStyle: { color: AQI_LEVEL_COLOR[level] },
                data: months.map((month) => {
                    const found = rows.find((item) => asString(item.month) === month && asString(item.aqi_level) === level);
                    return found ? asNumber(found.count) : 0;
                }),
            })),
        };
    }

    if (chartKey === "chart_08_subindex_monthly") {
        const metrics = ["pm25fzs", "pm10fzs", "so2fzs", "no2fzs", "cofzs", "o3_8hfzs"];
        return {
            ...option,
            legend: {
                type: "scroll",
                top: 8,
                textStyle: { color: "#FFFFFF" },
            },
            grid: { left: 52, right: 18, top: 88, bottom: 42 },
            xAxis: { ...(option.xAxis as object), data: rows.map((item) => asString(item.month)) },
            series: metrics.map((metric) => ({
                type: "bar",
                name: metric,
                data: rows.map((item) => asNumber(item[metric])),
            })),
        };
    }

    if (chartKey === "chart_09_weekday_weekend_compare") {
        return {
            ...option,
            xAxis: { ...(option.xAxis as object), data: rows.map((item) => asString(item.day_type)) },
            series: [{ type: "bar", name: "AQI", data: rows.map((item) => asNumber(item.aqi_mean)) }],
        };
    }

    if (chartKey === "chart_10_daily_calendar") {
        return {
            ...option,
            dataZoom: [{ type: "inside", start: 0, end: 25 }, { type: "slider", start: 0, end: 25 }],
            xAxis: { ...(option.xAxis as object), data: rows.map((item) => asString(item.date)) },
            series: [{ type: "line", smooth: true, showSymbol: false, name: "AQI", data: rows.map((item) => asNumber(item.aqi)) }],
        };
    }

    if (chartKey === "chart_11_hourly_pollutant_by_code") {
        const codes = Array.from(new Set(rows.map((item) => asString(item.yzbh))));
        const hours = Array.from({ length: 24 }).map((_, i) => i);
        return {
            ...option,
            xAxis: { ...(option.xAxis as object), data: hours.map((h) => `${h}时`) },
            series: codes.map((code) => ({
                type: "line",
                smooth: true,
                name: code,
                data: hours.map((hour) => {
                    const found = rows.find((item) => asNumber(item.hour) === hour && asString(item.yzbh) === code);
                    return found ? asNumber(found.jcz_value) : 0;
                }),
            })),
        };
    }

    if (chartKey === "chart_12_station_compare") {
        const labels = rows.map((item) => asString(item.zdbh));
        return {
            ...option,
            xAxis: { ...(option.xAxis as object), data: labels },
            series: [
                { type: "bar", name: "均值", data: rows.map((item) => asNumber(item.mean)) },
                { type: "bar", name: "中位数", data: rows.map((item) => asNumber(item.median)) },
                { type: "bar", name: "最大值", data: rows.map((item) => asNumber(item.max)) },
            ],
        };
    }

    if (chartKey === "chart_13_aqi_forecast_14d") {
        return {
            ...option,
            xAxis: { ...(option.xAxis as object), data: rows.map((item) => asString(item.date)) },
            series: [{ type: "line", smooth: true, name: "预测AQI", data: rows.map((item) => asNumber(item.aqi_pred)) }],
        };
    }

    return {
        ...option,
        title: { text: "暂无图表配置", left: "center", textStyle: { color: "#FFFFFF" } },
        series: [],
    };
}
