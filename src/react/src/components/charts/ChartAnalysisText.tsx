import { CHART_ANALYSIS_DETAIL_MAP, CHART_ANALYSIS_MAP } from "../../utils/chartMeta";

interface ChartAnalysisTextProps {
    chartKey: string;
    className?: string;
    variant?: "short" | "detail";
}

export function ChartAnalysisText({ chartKey, className = "", variant = "short" }: ChartAnalysisTextProps) {
    const textMap = variant === "detail" ? CHART_ANALYSIS_DETAIL_MAP : CHART_ANALYSIS_MAP;
    const text = textMap[chartKey] ?? "暂无分析文本。";

    return <p className={className}>{text}</p>;
}
