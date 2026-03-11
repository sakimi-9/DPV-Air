import { memo, useMemo } from "react";

import type { DashboardChart } from "../../types";
import { createOption } from "../../utils/chartOption";
import { ChartAnalysisText } from "./ChartAnalysisText";
import { ChartCanvas } from "./ChartCanvas";

interface ExportCaptureCardProps {
    chart: DashboardChart;
    cardRef?: (el: HTMLDivElement | null) => void;
}

function ExportCaptureCardComponent({ chart, cardRef }: ExportCaptureCardProps) {
    const chartOption = useMemo(() => createOption(chart.chartKey, chart.data), [chart.chartKey, chart.data]);
    const isMappingTable = chart.chartKey === "chart_14_pollutant_mapping_table";

    return (
        <article ref={cardRef} className="chart-card export-capture-card">
            <header className="chart-card-head">
                <div className="chart-card-title-wrap">
                    <h3>{chart.title}</h3>
                </div>
            </header>

            {/* 导出时统一使用放大尺寸，保证图表细节与可读性 */}
            {isMappingTable ? (
                <div className="mapping-table-wrap mapping-table-modal">
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
                <ChartCanvas option={chartOption} height={620} />
            )}

            <footer className="chart-card-foot modal-analysis-foot">
                <div className="divider" />
                <ChartAnalysisText chartKey={chart.chartKey} className="modal-analysis-text" variant="detail" />
            </footer>
        </article>
    );
}

export const ExportCaptureCard = memo(ExportCaptureCardComponent);
