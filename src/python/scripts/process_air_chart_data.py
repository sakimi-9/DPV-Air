#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
空气污染图表数据处理脚本
功能：
1. 读取 data_cleaned 下清洗后的数据
2. 聚合得到 13 个图表可直接消费的数据结构
3. 输出到 data_processed/air_charts_data.json
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
CLEANED_DIR = ROOT / "data_cleaned"
PROCESSED_DIR = ROOT / "data_processed"

DAILY_CLEANED = CLEANED_DIR / "空气监测污染物信息20260201_cleaned.json"
HOURLY_CLEANED = (
    CLEANED_DIR / "杭州市富阳区清新空气监测小时数据信息20251231_cleaned.json"
)


def to_rel(path: Path) -> str:
    """将路径转换为相对 src/python 根目录的显示形式。"""
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def load_cleaned_json(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"未找到清洗后文件: {to_rel(path)}")
    data = json.loads(path.read_text(encoding="utf-8"))
    return pd.DataFrame(data)


def aqi_level(value: float) -> str:
    # AQI 分级规则，用于等级分布图
    if value <= 50:
        return "优"
    if value <= 100:
        return "良"
    if value <= 150:
        return "轻度污染"
    if value <= 200:
        return "中度污染"
    if value <= 300:
        return "重度污染"
    return "严重污染"


def build_chart_data(daily_df: pd.DataFrame, hourly_df: pd.DataFrame) -> Dict[str, Any]:
    daily_df = daily_df.copy()
    hourly_df = hourly_df.copy()

    daily_df["jcrq"] = pd.to_datetime(daily_df["jcrq"], errors="coerce")
    daily_df = daily_df.dropna(subset=["jcrq", "aqi"]).sort_values("jcrq")
    daily_df["month"] = daily_df["jcrq"].dt.to_period("M").astype(str)

    hourly_df["jcsj"] = pd.to_datetime(hourly_df["jcsj"], errors="coerce")
    hourly_df = hourly_df.dropna(subset=["jcsj", "jcz_value"]).sort_values("jcsj")
    hourly_df["hour"] = hourly_df["jcsj"].dt.hour

    pollutant_cols = ["pm25", "pm10", "so2", "no2", "co", "o3_1h", "o3_8h"]
    fzs_cols = [
        "pm25fzs",
        "pm10fzs",
        "so2fzs",
        "no2fzs",
        "cofzs",
        "o3_1hfzs",
        "o3_8hfzs",
    ]

    chart_01 = (
        daily_df.groupby("month", as_index=False)["aqi"]
        .mean()
        .rename(columns={"aqi": "aqi_mean"})
    )

    chart_02 = []
    for month, grp in daily_df.groupby("month"):
        row = {
            "month": month,
            "min": float(grp["aqi"].min()),
            "q1": float(grp["aqi"].quantile(0.25)),
            "median": float(grp["aqi"].median()),
            "q3": float(grp["aqi"].quantile(0.75)),
            "max": float(grp["aqi"].max()),
        }
        chart_02.append(row)

    chart_03 = (
        daily_df.groupby("season", as_index=False)["aqi"]
        .mean()
        .rename(columns={"aqi": "aqi_mean"})
        if "season" in daily_df.columns
        else pd.DataFrame(columns=["season", "aqi_mean"])
    )

    chart_04 = (
        daily_df["sywrw"]
        .fillna("--")
        .astype(str)
        .replace("", "--")
        .value_counts()
        .reset_index()
    )
    chart_04.columns = ["sywrw", "count"]

    chart_05 = daily_df.groupby("month", as_index=False)[pollutant_cols].mean()

    corr_cols = ["aqi"] + pollutant_cols
    chart_06 = daily_df[corr_cols].corr(method="pearson").round(4)

    level_order = ["优", "良", "轻度污染", "中度污染", "重度污染", "严重污染"]
    daily_df["aqi_level"] = daily_df["aqi"].map(aqi_level)
    chart_07 = daily_df.groupby(["month", "aqi_level"]).size().reset_index(name="count")
    chart_07["aqi_level"] = pd.Categorical(
        chart_07["aqi_level"], categories=level_order, ordered=True
    )
    chart_07 = chart_07.sort_values(["month", "aqi_level"])

    chart_08 = daily_df.groupby("month", as_index=False)[fzs_cols].mean()

    daily_df["is_weekend"] = daily_df["jcrq"].dt.weekday.isin([5, 6])
    chart_09 = (
        daily_df.groupby("is_weekend", as_index=False)["aqi"]
        .mean()
        .rename(columns={"aqi": "aqi_mean"})
    )
    chart_09["day_type"] = chart_09["is_weekend"].map({True: "周末", False: "工作日"})

    chart_10 = daily_df[["jcrq", "aqi"]].copy()
    chart_10["date"] = chart_10["jcrq"].dt.strftime("%Y-%m-%d")
    chart_10 = chart_10[["date", "aqi"]]

    # 小时图：取样本量较大的前6个因子，避免前端曲线过密
    top_codes = (
        hourly_df["yzbh"].astype(str).value_counts().head(6).index.tolist()
        if "yzbh" in hourly_df.columns
        else []
    )
    chart_11 = (
        hourly_df[hourly_df["yzbh"].isin(top_codes)]
        .groupby(["hour", "yzbh"], as_index=False)["jcz_value"]
        .mean()
    )

    chart_12 = (
        hourly_df.groupby("zdbh")["jcz_value"]
        .agg(mean="mean", median="median", max="max")
        .reset_index()
    )

    # 线性外推未来 14 天 AQI（轻量预测）
    daily_series = (
        daily_df.set_index("jcrq")["aqi"]
        .resample("D")
        .mean()
        .interpolate(limit_direction="both")
    )
    x = np.arange(len(daily_series), dtype=float)
    y = daily_series.values.astype(float)
    if len(x) >= 2:
        k, b = np.polyfit(x, y, deg=1)
        future_x = np.arange(len(x), len(x) + 14, dtype=float)
        future_y = k * future_x + b
        future_dates = pd.date_range(
            daily_series.index.max() + pd.Timedelta(days=1), periods=14, freq="D"
        )
    else:
        future_dates = pd.date_range(
            pd.Timestamp.today().normalize(), periods=14, freq="D"
        )
        future_y = np.repeat(float(y[-1]) if len(y) else 0.0, 14)

    chart_13 = pd.DataFrame(
        {
            "date": [d.strftime("%Y-%m-%d") for d in future_dates],
            "aqi_pred": [float(v) for v in future_y],
        }
    )

    result = {
        "meta": {
            "chart_count": 13,
            "source": [DAILY_CLEANED.name, HOURLY_CLEANED.name],
            "generated_at": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
        },
        "chart_01_aqi_monthly_trend": chart_01.to_dict(orient="records"),
        "chart_02_aqi_monthly_box": chart_02,
        "chart_03_aqi_by_season": chart_03.to_dict(orient="records"),
        "chart_04_primary_pollutant_share": chart_04.to_dict(orient="records"),
        "chart_05_pollutants_monthly_trend": chart_05.to_dict(orient="records"),
        "chart_06_pollutants_corr": chart_06.to_dict(orient="index"),
        "chart_07_aqi_level_monthly": chart_07.to_dict(orient="records"),
        "chart_08_subindex_monthly": chart_08.to_dict(orient="records"),
        "chart_09_weekday_weekend_compare": chart_09[["day_type", "aqi_mean"]].to_dict(
            orient="records"
        ),
        "chart_10_daily_calendar": chart_10.to_dict(orient="records"),
        "chart_11_hourly_pollutant_by_code": chart_11.to_dict(orient="records"),
        "chart_12_station_compare": chart_12.to_dict(orient="records"),
        "chart_13_aqi_forecast_14d": chart_13.to_dict(orient="records"),
    }
    return result


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    print("[STEP] 开始执行图表数据处理")
    print(f"[INFO] 清洗数据目录: {to_rel(CLEANED_DIR)}")

    daily_df = load_cleaned_json(DAILY_CLEANED)
    hourly_df = load_cleaned_json(HOURLY_CLEANED)

    print(f"[INFO] 读取日数据记录数: {len(daily_df)}")
    print(f"[INFO] 读取小时数据记录数: {len(hourly_df)}")

    chart_data = build_chart_data(daily_df, hourly_df)

    chart_keys = [k for k in chart_data.keys() if k.startswith("chart_")]
    print(f"[INFO] 图表主题数量: {len(chart_keys)}")

    for key in chart_keys:
        payload = chart_data[key]
        length = len(payload) if isinstance(payload, list) else len(payload.keys())
        print(f"[INFO] {key} 数据量: {length}")

    out_file = PROCESSED_DIR / "air_charts_data.json"
    out_file.write_text(
        json.dumps(chart_data, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"[OK] 图表数据处理完成: {to_rel(out_file)}")
    print("[DONE] 图表数据处理流程执行完毕")


if __name__ == "__main__":
    main()
