import { memo, type ReactNode, useMemo } from "react";
import { FiMaximize2 } from "react-icons/fi";

import type { DashboardChart } from "../../types";
import { createOption } from "../../utils/chartOption";
import { ChartAnalysisText } from "./ChartAnalysisText";
import { ChartCanvas } from "./ChartCanvas";

interface ChartCardProps {
    chart: DashboardChart;
    className: string;
    onExpand: () => void;
    headerExtra?: ReactNode;
    cardRef?: (el: HTMLDivElement | null) => void;
}

function ChartCardComponent({ chart, className, onExpand, headerExtra, cardRef }: ChartCardProps) {
    const chartOption = useMemo(() => createOption(chart.chartKey, chart.data), [chart.chartKey, chart.data]);
    const chartHeight = useMemo(() => {
        if (chart.chartKey === "chart_14_pollutant_mapping_table") {
            return 300;
        }
        if (chart.chartKey === "chart_08_subindex_monthly") {
            return 320;
        }
        return 280;
    }, [chart.chartKey]);

    const isMappingTable = chart.chartKey === "chart_14_pollutant_mapping_table";

    return (
        <article ref={cardRef} className={`chart-card ${className} export-card`}>
            <header className="chart-card-head">
                <div className="chart-card-title-wrap">
                    <h3>{chart.title}</h3>
                    {headerExtra}
                </div>
                <div className="chart-card-actions">
                    <button className="icon-btn" type="button" title="放大图表" onClick={onExpand}>
                        <FiMaximize2 />
                    </button>
                </div>
            </header>

            {/* 关键图表渲染区域 */}
            {isMappingTable ? (
                <div className="mapping-table-wrap">
                    <table className="mapping-table">
                        <thead>
                            <tr>
                                <th>污染物</th>
                                <th>浓度字段</th>
                                <th>分指数字段</th>
                            </tr>
                        </thead>
                        <tbody>
                            {chart.data.map((row, idx) => (
                                <tr key={String(row.pollutant ?? idx)}>
                                    <td>{String(row.pollutant ?? "-")}</td>
                                    <td>{String(row.concentration ?? "-")}</td>
                                    <td>{String(row.subIndex ?? "-")}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <ChartCanvas option={chartOption} height={chartHeight} />
            )}

            <footer className="chart-card-foot">
                <div className="divider" />
                <ChartAnalysisText chartKey={chart.chartKey} />
            </footer>
        </article>
    );
}

export const ChartCard = memo(
    ChartCardComponent,
    (prev, next) =>
        prev.chart === next.chart &&
        prev.className === next.className &&
        prev.headerExtra === next.headerExtra,
);
