export type PageSizeOption = "1000" | "5000" | "10000" | "all";

export interface ChartMeta {
    chartKey: string;
    title: string;
    rowCount: number;
    importedAt: string;
}

export interface ChartDataResponse {
    ok: boolean;
    chart: ChartMeta;
    pagination: {
        size: number | "all";
        page: number;
        totalRows: number;
        totalPages: number;
    };
    data: Record<string, unknown>[];
}

export interface HealthResponse {
    ok: boolean;
    datasetCount: number;
    pointCount: number;
    now: string;
}

export interface DashboardChart {
    chartKey: string;
    title: string;
    totalRows: number;
    data: Record<string, unknown>[];
    rawRows: number;
    sampled: boolean;
}
