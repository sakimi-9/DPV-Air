import type {
    ChartDataResponse,
    ChartMeta,
    HealthResponse,
    PageSizeOption,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

async function requestJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
}

export async function fetchHealth(): Promise<HealthResponse> {
    return requestJson<HealthResponse>(`${API_BASE}/api/health`);
}

export async function fetchChartMeta(): Promise<ChartMeta[]> {
    const payload = await requestJson<{ total: number; data: ChartMeta[] }>(
        `${API_BASE}/api/charts/meta`,
    );
    return payload.data;
}

export async function fetchChartByKey(
    chartKey: string,
    size: PageSizeOption,
    page: number,
): Promise<ChartDataResponse> {
    const query = new URLSearchParams();
    query.set("size", size);
    query.set("page", String(page));

    return requestJson<ChartDataResponse>(
        `${API_BASE}/api/charts/${chartKey}?${query.toString()}`,
    );
}
