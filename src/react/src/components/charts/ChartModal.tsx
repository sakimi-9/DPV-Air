import { type ReactNode, useMemo } from "react";
import { FiChevronLeft, FiChevronRight, FiX } from "react-icons/fi";

import type { DashboardChart } from "../../types";
import { createOption } from "../../utils/chartOption";
import { ChartAnalysisText } from "./ChartAnalysisText";
import { ChartCanvas } from "./ChartCanvas";

interface ChartModalProps {
    chart: DashboardChart;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
    headerExtra?: ReactNode;
}

export function ChartModal({ chart, onClose, onPrev, onNext, headerExtra }: ChartModalProps) {
    const chartOption = useMemo(() => createOption(chart.chartKey, chart.data), [chart.chartKey, chart.data]);
    const isMappingTable = chart.chartKey === "chart_14_pollutant_mapping_table";

    return (
        <div className="chart-modal-mask" role="dialog" aria-modal="true">
            <div className="chart-modal-panel">
                <header className="chart-modal-head">
                    <div className="chart-card-title-wrap">
                        <h3>{chart.title}</h3>
                        {headerExtra}
                    </div>
                    <div className="modal-actions">
                        <button className="icon-btn" type="button" title="上一张" onClick={onPrev}>
                            <FiChevronLeft />
                        </button>
                        <button className="icon-btn" type="button" title="下一张" onClick={onNext}>
                            <FiChevronRight />
                        </button>
                        <button className="icon-btn" type="button" title="关闭" onClick={onClose}>
                            <FiX />
                        </button>
                    </div>
                </header>
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
            </div>
        </div>
    );
}
