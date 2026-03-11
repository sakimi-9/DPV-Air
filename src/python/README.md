## Python 快速start
```powershell
cd src\python
py -3.13 -m venv .venv             
.\.venv\Scripts\Activate.ps1       
py -3 -m pip install -r requirements.txt
```

## 数据脚本执行顺序
```powershell
# 1) 预处理：从 data 生成 data_cleaned
py -3 scripts\preprocess_air_data.py

# 2) 数据处理：从 data_cleaned 生成 data_processed 图表数据
py -3 scripts\process_air_chart_data.py
```

## 输出目录说明
- `data_cleaned/空气监测污染物信息20260201_cleaned.json`
- `data_cleaned/杭州市富阳区清新空气监测小时数据信息20251231_cleaned.json`
- `data_cleaned/数据预处理摘要.json`
- `data_processed/air_charts_data.json`

## 日志路径说明
- 预处理脚本与数据处理脚本输出路径已统一为相对 `src/python` 的路径，便于跨环境复用日志。
