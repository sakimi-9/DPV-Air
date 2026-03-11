import { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import { toPng } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { ChartCard } from "./components/charts/ChartCard";
import { ExportCaptureCard } from "./components/charts/ExportCaptureCard.tsx";
import { ChartModal } from "./components/charts/ChartModal";
import { fetchChartByKey, fetchChartMeta } from "./services/api";
import type { DashboardChart, PageSizeOption } from "./types";
import { CHART_LAYOUT_ORDER, getCardSpanClass } from "./utils/chartMeta";
import "./App.css";

const POLLUTANT_MAPPING_ROWS: Record<string, unknown>[] = [
  {
    pollutant: "PM2.5（细颗粒物）",
    concentration: "pm25",
    subIndex: "pm25fzs",
  },
  {
    pollutant: "PM10（可吸入颗粒物）",
    concentration: "pm10",
    subIndex: "pm10fzs",
  },
  {
    pollutant: "SO2（二氧化硫）",
    concentration: "so2",
    subIndex: "so2fzs",
  },
  {
    pollutant: "NO2（二氧化氮）",
    concentration: "no2",
    subIndex: "no2fzs",
  },
  {
    pollutant: "CO（一氧化碳）",
    concentration: "co",
    subIndex: "cofzs",
  },
  {
    pollutant: "O3（臭氧）",
    concentration: "o3_1h / o3_8h",
    subIndex: "o3_1hfzs / o3_8hfzs",
  },
  {
    pollutant: "AQI（空气质量指数）",
    concentration: "aqi",
    subIndex: "-",
  },
  {
    pollutant: "首要污染物",
    concentration: "sywrw",
    subIndex: "-",
  },
];

function App() {
  const [charts, setCharts] = useState<DashboardChart[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportFailed, setExportFailed] = useState(false);
  const [exportFailReason, setExportFailReason] = useState("");
  const [error, setError] = useState("");
  const [calendarPageSize, setCalendarPageSize] = useState<PageSizeOption>("1000");
  const [calendarPage, setCalendarPage] = useState(1);
  const [calendarTotalPages, setCalendarTotalPages] = useState(1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const exportCaptureRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function sampleChart10Rows(rows: Record<string, unknown>[], maxPoints = 1200) {
    if (rows.length <= maxPoints) {
      return { data: rows, sampled: false };
    }

    // 抽样策略：等步长抽样并保留最后一个点，减少渲染压力
    const step = Math.ceil(rows.length / maxPoints);
    const sampledRows: Record<string, unknown>[] = [];
    for (let i = 0; i < rows.length; i += step) {
      sampledRows.push(rows[i]);
    }
    const last = rows[rows.length - 1];
    if (sampledRows[sampledRows.length - 1] !== last) {
      sampledRows.push(last);
    }
    return { data: sampledRows, sampled: true };
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const meta = await fetchChartMeta();

      const sortedMeta = [...meta].sort((a, b) => a.chartKey.localeCompare(b.chartKey));
      const chartResp = await Promise.all(
        sortedMeta.map((item) =>
          item.chartKey === "chart_10_daily_calendar"
            ? fetchChartByKey(item.chartKey, calendarPageSize, calendarPage)
            : fetchChartByKey(item.chartKey, "1000", 1),
        ),
      );

      const nextCharts = chartResp.map((item) => {
        const rawRows = item.data.length;
        const optimized =
          item.chart.chartKey === "chart_10_daily_calendar"
            ? sampleChart10Rows(item.data)
            : { data: item.data, sampled: false };

        if (item.chart.chartKey === "chart_10_daily_calendar") {
          setCalendarTotalPages(item.pagination.totalPages);
        }

        return {
          chartKey: item.chart.chartKey,
          title: item.chart.title,
          totalRows: item.pagination.totalRows,
          data: optimized.data,
          rawRows,
          sampled: optimized.sampled,
        };
      });

      const mappingChart: DashboardChart = {
        chartKey: "chart_14_pollutant_mapping_table",
        title: "污染物字段映射表",
        totalRows: POLLUTANT_MAPPING_ROWS.length,
        data: POLLUTANT_MAPPING_ROWS,
        rawRows: POLLUTANT_MAPPING_ROWS.length,
        sampled: false,
      };

      setCharts([...nextCharts, mappingChart]);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "未知错误";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    async function refreshCalendarChartOnly() {
      if (charts.length === 0) {
        return;
      }
      try {
        const resp = await fetchChartByKey(
          "chart_10_daily_calendar",
          calendarPageSize,
          calendarPage,
        );
        const optimized = sampleChart10Rows(resp.data);

        setCalendarTotalPages(resp.pagination.totalPages);

        setCharts((prev) =>
          prev.map((item) =>
            item.chartKey === "chart_10_daily_calendar"
              ? {
                ...item,
                totalRows: resp.pagination.totalRows,
                data: optimized.data,
                rawRows: resp.data.length,
                sampled: optimized.sampled,
              }
              : item,
          ),
        );
      } catch (refreshError) {
        const message = refreshError instanceof Error ? refreshError.message : "日历热力图加载失败";
        setError(message);
      }
    }

    void refreshCalendarChartOnly();
  }, [calendarPageSize, calendarPage, charts.length]);

  const orderedCharts = useMemo(() => {
    const rank = new Map(CHART_LAYOUT_ORDER.map((key, index) => [key, index]));
    return [...charts].sort((a, b) => {
      const aRank = rank.get(a.chartKey) ?? 999;
      const bRank = rank.get(b.chartKey) ?? 999;
      return aRank - bRank;
    });
  }, [charts]);

  const activeChart = useMemo(() => {
    if (activeIndex === null) {
      return null;
    }
    return orderedCharts[activeIndex] ?? null;
  }, [activeIndex, orderedCharts]);

  async function exportChartsZip() {
    setExportFailed(false);
    setExportFailReason("");
    setExportProgress(0);
    setExporting(true);
    try {
      const zip = new JSZip();
      const exportable = orderedCharts.filter((chart) => exportCaptureRefs.current[chart.chartKey]);
      if (exportable.length === 0) {
        throw new Error("没有可导出的图表节点，请先等待页面渲染完成");
      }

      // 等待离屏放大导出节点完成一次渲染，避免抓取空白图
      await new Promise((resolve) => setTimeout(resolve, 180));

      let done = 0;
      // 导出结构：放大态标题 + 放大图表 + 分割线 + 详细分析文本
      for (const chart of exportable) {
        const card = exportCaptureRefs.current[chart.chartKey];
        if (!card) {
          continue;
        }

        // 导出图片时保留卡片标题、图表、分割线、分析文本
        const imageData = await toPng(card, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#becced",
        });

        const base64 = imageData.replace(/^data:image\/png;base64,/, "");
        zip.file(`${chart.title}.png`, base64, { base64: true });

        done += 1;
        setExportProgress(Math.round((done / exportable.length) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `空气污染分析图表_${Date.now()}.zip`);
      setExportProgress(100);
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : "导出失败";
      setExportFailed(true);
      setExportFailReason(message);
    } finally {
      setExporting(false);
    }
  }

  function turnPrev() {
    setActiveIndex((current) => {
      if (current === null || orderedCharts.length === 0) {
        return null;
      }
      return current === 0 ? orderedCharts.length - 1 : current - 1;
    });
  }

  function turnNext() {
    setActiveIndex((current) => {
      if (current === null || orderedCharts.length === 0) {
        return null;
      }
      return current === orderedCharts.length - 1 ? 0 : current + 1;
    });
  }

  const renderCalendarPager = (isInModal = false) => (
    <div className={`calendar-toolbar ${isInModal ? "calendar-toolbar-modal" : ""}`} onClick={(event) => event.stopPropagation()}>
      <label>
        {/* 请求条数 */}
        <select
          value={calendarPageSize}
          onChange={(event) => {
            setCalendarPageSize(event.target.value as PageSizeOption);
            setCalendarPage(1);
          }}
        >
          <option value="1000">1000</option>
          <option value="5000">5000</option>
          <option value="10000">1W</option>
          <option value="all">全部</option>
        </select>
      </label>
      <div className="calendar-page-switch">
        <span>
          页码 {calendarPage} / {calendarTotalPages}
        </span>
        <button
          className="icon-btn"
          type="button"
          title="上一页"
          onClick={() => setCalendarPage((prev) => Math.max(1, prev - 1))}
          disabled={calendarPage <= 1 || calendarPageSize === "all"}
        >
          <FiChevronLeft />
        </button>
        <button
          className="icon-btn"
          type="button"
          title="下一页"
          onClick={() => setCalendarPage((prev) => Math.min(calendarTotalPages || 1, prev + 1))}
          disabled={calendarPage >= calendarTotalPages || calendarPageSize === "all"}
        >
          <FiChevronRight />
        </button>
      </div>
      {/* <span className="calendar-total">总条数 {calendarTotalRows}</span> */}
    </div>
  );

  return (
    <div className="screen-wrap">
      <header className="screen-head">
        <div>
          <h1>空气污染数据分析可视化大屏[杭州市]</h1>
        </div>

        <div className="toolbar">
          <button className="export-btn" type="button" onClick={exportChartsZip} disabled={exporting || loading}>
            <span>{exporting ? `导出中... ${exportProgress}%` : "导出分析结果ZIP"}</span>
            {exporting && (
              <span className="export-inline-progress">
                <span className="export-inline-progress-bar" style={{ width: `${exportProgress}%` }} />
              </span>
            )}
          </button>

          {exportFailed && (
            <button className="retry-btn" type="button" onClick={exportChartsZip}>
              导出失败，点击重试
            </button>
          )}
        </div>
      </header>

      {exportFailed && <div className="state-box error">导出失败原因：{exportFailReason}</div>}

      {loading && <div className="state-box">正在加载图表数据...</div>}
      {error && (
        <div className="state-box error">
          <p>前端请求报错：{error}</p>
          <button className="retry-btn" type="button" onClick={() => void loadDashboard()}>
            重新加载
          </button>
        </div>
      )}

      <section className="chart-grid">
        {orderedCharts.map((chart, index) => (
          <div key={chart.chartKey} className={`reveal-card ${getCardSpanClass(chart.chartKey)}`} style={{ animationDelay: `${index * 40}ms` }}>
            <ChartCard
              chart={chart}
              className=""
              onExpand={() => setActiveIndex(index)}
              headerExtra={
                chart.chartKey === "chart_10_daily_calendar" ? (
                  renderCalendarPager(false)
                ) : null
              }
              cardRef={(el) => {
                chartRefs.current[chart.chartKey] = el;
              }}
            />
          </div>
        ))}
      </section>

      {/* 离屏放大导出容器：用于生成高分辨率图表+详细文本图片 */}
      <section className="export-capture-stage" aria-hidden="true">
        {orderedCharts.map((chart) => (
          <ExportCaptureCard
            key={`export-${chart.chartKey}`}
            chart={chart}
            cardRef={(el: HTMLDivElement | null) => {
              exportCaptureRefs.current[chart.chartKey] = el;
            }}
          />
        ))}
      </section>

      {activeChart && (
        <ChartModal
          chart={activeChart}
          onClose={() => setActiveIndex(null)}
          onPrev={turnPrev}
          onNext={turnNext}
          headerExtra={
            activeChart.chartKey === "chart_10_daily_calendar" ? renderCalendarPager(true) : null
          }
        />
      )}
    </div>
  );
}

export default App;
