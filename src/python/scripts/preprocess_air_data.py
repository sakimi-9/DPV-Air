#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
空气污染数据预处理脚本
功能：
1. 读取 src/python/data 下原始 JSON（容错处理尾部脏字符）
2. 清洗并标准化字段类型
3. 输出到 src/python/data_cleaned
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
CLEANED_DIR = ROOT / "data_cleaned"

DAILY_FILE = DATA_DIR / "空气监测污染物信息20260201.json"
HOURLY_FILE = DATA_DIR / "杭州市富阳区清新空气监测小时数据信息20251231.json"


def to_rel(path: Path) -> str:
    """将路径转换为相对 src/python 根目录的显示形式。"""
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def tolerant_load_json_array(file_path: Path) -> List[Dict[str, Any]]:
    """容错读取 JSON 数组：截取第一个 `[` 到最后一个 `]`，规避尾部脏字符。"""
    raw = file_path.read_text(encoding="utf-8", errors="ignore")
    start = raw.find("[")
    end = raw.rfind("]")
    if start < 0 or end < 0 or end <= start:
        raise ValueError(f"文件格式异常，未找到有效 JSON 数组: {to_rel(file_path)}")

    payload = raw[start : end + 1]
    return json.loads(payload)


def extract_number(value: Any) -> float | None:
    """从类似 `380.0μg/m³` 的文本中提取数值。"""
    if value is None:
        return None
    text = str(value).strip()
    if text in {"", "无", "--", "null", "None"}:
        return None

    match = re.search(r"-?\d+(?:\.\d+)?", text)
    if not match:
        return None
    try:
        return float(match.group(0))
    except ValueError:
        return None


def clip_outliers_iqr(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    """使用 IQR 规则对数值字段做温和截断，避免极端值影响整体分析。"""
    for col in columns:
        if col not in df.columns:
            continue
        series = pd.to_numeric(df[col], errors="coerce")
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        if pd.isna(iqr) or iqr == 0:
            continue
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        df[col] = series.clip(lower=lower, upper=upper)
    return df


def clean_daily(records: List[Dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(records)

    # 去除首行“字段中文说明”伪数据
    df = df[df.get("jcrq", "") != "监测日期"].copy()

    numeric_cols = [
        "aqi",
        "pm25",
        "pm10",
        "so2",
        "no2",
        "co",
        "o3_1h",
        "o3_8h",
        "pm25fzs",
        "pm10fzs",
        "so2fzs",
        "no2fzs",
        "cofzs",
        "o3_1hfzs",
        "o3_8hfzs",
    ]

    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # 时间字段转标准时间，无法解析的行直接过滤
    df["jcrq"] = pd.to_datetime(df["jcrq"], errors="coerce")
    df = df.dropna(subset=["jcrq"]).sort_values("jcrq").reset_index(drop=True)

    # 缺失值处理：线性插值 + 中位数兜底
    for col in numeric_cols:
        if col in df.columns:
            df[col] = df[col].interpolate(method="linear", limit_direction="both")
            df[col] = df[col].fillna(df[col].median())

    df = clip_outliers_iqr(df, [c for c in numeric_cols if c in df.columns])

    # 衍生字段，便于后续分组聚合
    df["date"] = df["jcrq"].dt.date.astype(str)
    df["month"] = df["jcrq"].dt.to_period("M").astype(str)
    df["weekday"] = df["jcrq"].dt.weekday
    df["is_weekend"] = df["weekday"].isin([5, 6])
    df["season"] = df["jcrq"].dt.month.map(
        {
            12: "冬季",
            1: "冬季",
            2: "冬季",
            3: "春季",
            4: "春季",
            5: "春季",
            6: "夏季",
            7: "夏季",
            8: "夏季",
            9: "秋季",
            10: "秋季",
            11: "秋季",
        }
    )

    df["sywrw"] = df.get("sywrw", "--").fillna("--").astype(str)

    # 为 JSON 序列化改为字符串时间
    df["jcrq"] = df["jcrq"].dt.strftime("%Y-%m-%d %H:%M:%S")

    return df


def clean_hourly(records: List[Dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(records)

    # 去除首行“字段中文说明”伪数据
    df = df[df.get("jcsj", "") != "监测时间"].copy()

    # 仅保留有效数据标记
    if "sjbj" in df.columns:
        df = df[df["sjbj"].astype(str) == "有效"].copy()

    # 从字符串监测值提取数值
    df["jcz_value"] = df.get("jcz").map(extract_number)
    if "zdz" in df.columns:
        df["zdz_value"] = df["zdz"].map(extract_number)
    if "zxz" in df.columns:
        df["zxz_value"] = df["zxz"].map(extract_number)

    df["jcsj"] = pd.to_datetime(df["jcsj"], errors="coerce")
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

    df = (
        df.dropna(subset=["jcsj", "jcz_value"])
        .sort_values("jcsj")
        .reset_index(drop=True)
    )

    # 小时维度衍生字段
    df["date"] = df["jcsj"].dt.date.astype(str)
    df["hour"] = df["jcsj"].dt.hour

    # 数值字段异常值温和截断
    num_cols = [
        col for col in ["jcz_value", "zdz_value", "zxz_value"] if col in df.columns
    ]
    df = clip_outliers_iqr(df, num_cols)

    # 为 JSON 序列化改为字符串时间
    df["jcsj"] = pd.to_datetime(df["jcsj"]).dt.strftime("%Y-%m-%d %H:%M:%S")
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.strftime(
            "%Y-%m-%d %H:%M:%S"
        )

    return df


def main() -> None:
    CLEANED_DIR.mkdir(parents=True, exist_ok=True)

    print("[STEP] 开始执行数据预处理")
    print(f"[INFO] 原始目录: {to_rel(DATA_DIR)}")

    daily_records = tolerant_load_json_array(DAILY_FILE)
    hourly_records = tolerant_load_json_array(HOURLY_FILE)

    print(f"[INFO] 日数据原始记录数: {len(daily_records)}")
    print(f"[INFO] 小时数据原始记录数: {len(hourly_records)}")

    daily_df = clean_daily(daily_records)
    hourly_df = clean_hourly(hourly_records)

    daily_removed = len(daily_records) - len(daily_df)
    hourly_removed = len(hourly_records) - len(hourly_df)

    print("[STEP] 数据清洗完成，输出关键统计")
    print(f"[INFO] 日数据清洗后记录数: {len(daily_df)} (移除 {daily_removed})")
    print(f"[INFO] 小时数据清洗后记录数: {len(hourly_df)} (移除 {hourly_removed})")

    if not daily_df.empty:
        print(
            f"[INFO] 日数据时间范围: {daily_df['jcrq'].iloc[0]} ~ {daily_df['jcrq'].iloc[-1]}"
        )
        print(
            "[INFO] 日数据AQI统计: "
            f"min={daily_df['aqi'].min():.3f}, "
            f"median={daily_df['aqi'].median():.3f}, "
            f"max={daily_df['aqi'].max():.3f}"
        )

    if not hourly_df.empty:
        print(
            f"[INFO] 小时数据时间范围: {hourly_df['jcsj'].iloc[0]} ~ {hourly_df['jcsj'].iloc[-1]}"
        )
        station_count = (
            hourly_df["zdbh"].astype(str).nunique()
            if "zdbh" in hourly_df.columns
            else 0
        )
        factor_count = (
            hourly_df["yzbh"].astype(str).nunique()
            if "yzbh" in hourly_df.columns
            else 0
        )
        print(f"[INFO] 小时数据站点数: {station_count}, 因子数: {factor_count}")
        print(
            "[INFO] 小时数据监测值统计: "
            f"min={hourly_df['jcz_value'].min():.3f}, "
            f"median={hourly_df['jcz_value'].median():.3f}, "
            f"max={hourly_df['jcz_value'].max():.3f}"
        )

    daily_out = CLEANED_DIR / "空气监测污染物信息20260201_cleaned.json"
    hourly_out = (
        CLEANED_DIR / "杭州市富阳区清新空气监测小时数据信息20251231_cleaned.json"
    )
    summary_out = CLEANED_DIR / "数据预处理摘要.json"

    # 输出清洗后的标准化数据
    daily_out.write_text(
        daily_df.to_json(orient="records", force_ascii=False, indent=2),
        encoding="utf-8",
    )
    hourly_out.write_text(
        hourly_df.to_json(orient="records", force_ascii=False, indent=2),
        encoding="utf-8",
    )

    summary = {
        "daily": {
            "raw_count": len(daily_records),
            "cleaned_count": int(len(daily_df)),
            "removed_count": int(daily_removed),
            "fields": list(daily_df.columns),
        },
        "hourly": {
            "raw_count": len(hourly_records),
            "cleaned_count": int(len(hourly_df)),
            "removed_count": int(hourly_removed),
            "fields": list(hourly_df.columns),
        },
    }
    summary_out.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"[OK] 预处理完成: {to_rel(daily_out)}")
    print(f"[OK] 预处理完成: {to_rel(hourly_out)}")
    print(f"[OK] 摘要文件: {to_rel(summary_out)}")
    print("[DONE] 数据预处理流程执行完毕")


if __name__ == "__main__":
    main()
