import { useEffect, useRef } from "react";

import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

interface ChartCanvasProps {
    option: EChartsOption;
    height?: number;
}

export function ChartCanvas({ option, height = 280 }: ChartCanvasProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }

        chartRef.current = echarts.init(containerRef.current);

        const onResize = () => chartRef.current?.resize();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
            chartRef.current?.dispose();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!chartRef.current) {
            return;
        }
        chartRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
    }, [option]);

    useEffect(() => {
        chartRef.current?.resize();
    }, [height]);

    return <div ref={containerRef} style={{ width: "100%", height }} />;
}
