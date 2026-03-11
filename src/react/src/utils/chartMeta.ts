export const CHART_ANALYSIS_MAP: Record<string, string> = {
    chart_14_pollutant_mapping_table: "字段映射表用于快速对照污染物中文名与数据字段。",
    chart_01_aqi_monthly_trend: "月度AQI变化可用于识别季节性污染高峰与低谷。",
    chart_02_aqi_monthly_box: "箱线图揭示月份内波动区间，便于发现稳定性差的月份。",
    chart_03_aqi_by_season: "季节对比可用于评估冬夏差异及防控策略窗口期。",
    chart_04_primary_pollutant_share: "首要污染物占比反映治理重点与污染结构。",
    chart_05_pollutants_monthly_trend: "多污染物趋势联动可用于分析协同变化关系。",
    chart_06_pollutants_corr: "相关性矩阵可快速定位与AQI关联度高的指标。",
    chart_07_aqi_level_monthly: "等级堆叠分布直观反映空气质量等级结构变化。",
    chart_08_subindex_monthly: "分指数对比可识别AQI抬升的主导贡献项。",
    chart_09_weekday_weekend_compare: "工作日与周末差异可用于判断活动排放影响。",
    chart_10_daily_calendar: "高频日历趋势适合快速定位连续污染时段。",
    chart_11_hourly_pollutant_by_code: "小时维度可用于识别日内峰值与时段规律。",
    chart_12_station_compare: "站点对比用于定位高污染站点与重点治理区域。",
    chart_13_aqi_forecast_14d: "短期外推可支持风险预警与展示型决策参考。",
};

export const CHART_ANALYSIS_DETAIL_MAP: Record<string, string> = {
    chart_14_pollutant_mapping_table: "该表明确六项污染物的浓度字段与分指数字段对应关系，如PM2.5对应pm25和pm25fzs。有助于统一数据处理流程，为后续多维度分析提供标准化支撑。",
    chart_05_pollutants_monthly_trend: "PM2.5、PM10、SO2、NO2、CO、O3等污染物浓度长期稳定在较低水平，未出现显著波动，表明区域空气质量总体控制良好，污染源排放持续受控。",
    chart_04_primary_pollutant_share: "首要污染物中PM10占比最高，其次为O3，无首要污染物比例也较大。说明颗粒物污染仍是主要问题，臭氧污染逐步显现，需加强协同治理。",
    chart_09_weekday_weekend_compare: "工作日与周末AQI值相近，差异不显著，表明交通活动对空气质量影响有限，可能与区域整体减排措施有效或非机动车排放主导有关。",
    chart_07_aqi_level_monthly: "空气质量以“优”和“良”为主，轻度污染偶发，中重度及以上污染极少。结构稳定，反映区域环境治理成效显著，但需警惕季节性波动风险。",
    chart_12_station_compare: "站点H330183014最大值远高于58449，且均值、中位数亦偏高，提示其为高污染热点区域，应列为优先管控对象，开展溯源与治理。",
    chart_03_aqi_by_season: "四季AQI均值相近，冬季略高，表明冷季污染略有加重，可能与取暖排放和扩散条件差有关。其余季节差异小，整体空气质量稳定，季节性影响不显著。",
    chart_10_daily_calendar: "AQI日变化呈现明显波动，部分时段出现短时峰值，反映局地排放或气象扰动影响。整体处于“良”水平，无持续重污染过程，显示空气质量控制成效较好。",
    chart_02_aqi_monthly_box: "各月AQI箱线图中位数稳定在50左右，上下四分位间距较小，说明空气质量波动不大，多数月份维持“良”级，极值较少，治理效果平稳。",
    chart_01_aqi_monthly_trend: "2021-2023年AQI月度均值基本持平，偶有小幅上升，未见明显恶化趋势。整体呈稳中有降态势，反映长期空气质量改善政策持续有效。",
    chart_06_pollutants_corr: "PM2.5、PM10与NO2、SO2存在弱正相关，O3与CO呈负相关，提示颗粒物与交通源关联较强，臭氧受光化学反应主导，建议分区施策。",
    chart_08_subindex_monthly: "PM2.5和PM10分指数贡献占比最高且稳定，O3次之，SO2与CO贡献较低。表明颗粒物为首要污染来源，需重点加强扬尘与工业排放管控。",
    chart_11_hourly_pollutant_by_code: "COL4（推测为PM2.5）在午间达峰，COL3（可能为NO2）呈双峰型，COL1（如O3）午后升高，体现典型日变化规律，交通与光化学作用共同影响。",
    chart_13_aqi_forecast_14d: "未来一周预测AQI稳定在50左右，维持“良”等级，无污染风险预警。模型表现稳健，可支持环境管理决策与公众健康提示。",
};

const LEVEL_3_KEYS = new Set([
    "chart_05_pollutants_monthly_trend",
    "chart_07_aqi_level_monthly",
    "chart_10_daily_calendar",
]);

const LEVEL_2_KEYS = new Set([
    "chart_01_aqi_monthly_trend",
    "chart_06_pollutants_corr",
    "chart_11_hourly_pollutant_by_code",
]);

// 固定排序：从上到下、从左到右，对应
// 1 3 1
// 1 3 1
// 1 3 1
// 2 2 1
// 2
export const CHART_LAYOUT_ORDER = [
    "chart_14_pollutant_mapping_table",  // 1
    "chart_05_pollutants_monthly_trend", // 3
    "chart_04_primary_pollutant_share",  // 1
    "chart_09_weekday_weekend_compare",  // 1
    "chart_07_aqi_level_monthly",        // 3
    "chart_12_station_compare",          // 1
    "chart_03_aqi_by_season",            // 1
    "chart_10_daily_calendar",           // 3
    "chart_02_aqi_monthly_box",          // 1
    "chart_01_aqi_monthly_trend",        // 2
    "chart_06_pollutants_corr",          // 2
    "chart_08_subindex_monthly",         // 1
    "chart_11_hourly_pollutant_by_code", // 2
    "chart_13_aqi_forecast_14d",         // 1
];

export function getCardSpanClass(chartKey: string): string {
    if (LEVEL_3_KEYS.has(chartKey)) {
        return "card-level-3";
    }
    if (LEVEL_2_KEYS.has(chartKey)) {
        return "card-level-2";
    }
    return "card-level-1";
}
