# 💠 QuantStock Omni-Engine

A **fully local, zero-storage** stock analysis app built with Python & Streamlit.  
Upload a CSV or fetch live data — every calculation runs in-memory and is discarded when the session ends.

---

## Features

| Module | What it does |
|---|---|
| **Indicator Engine** | MA20/50/200, EMA12/26, RSI-14, MACD, ATR-14, Turnover, 1D/5D/1M/3M/6M returns |
| **Trade Plan** | Shares, invested capital, cash left, target price, stop-loss, reward/risk ratio, CAGR projection |
| **Range Levels** | ATR-based expected high/low + Pivot, R1, S1 for next trading day |
| **Markov Chain** | 5-state regime model — next-day & 3-day state probabilities, expected close |
| **ML Confirmation** | XGBoost (or RandomForest fallback) trained on-the-fly, next-day direction probability |
| **Final Decision** | Weighted confidence score (0–100) → Strong Buy / Buy / Hold / Avoid |
| **Multi-Stock Ranking** | Upload multiple CSVs and rank them by Trend Score |

---

## Requirements

- Python **3.10 or higher**
- Internet connection (only needed for Yahoo Finance mode)

---

## Setup

### 1. Clone or copy the project
```bash
mkdir quantstock && cd quantstock
# copy app.py, requirements.txt here
```

### 2. Create a virtual environment
```bash
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on macOS / Linux
source venv/bin/activate
```

### 3. Install packages
```bash
pip install -r requirements.txt
```

> **Note**: `xgboost` is optional. If not installed, the app automatically uses `RandomForest` from scikit-learn.

---

## Run the App

```bash
streamlit run app.py
```

Open your browser at **http://localhost:8501**

---

## Expected CSV Format

The app accepts any OHLCV CSV. The date column can be unnamed.  
Supported date formats: `DD-MM-YYYY`, `YYYY-MM-DD`, `DD/MM/YYYY`, or any standard format.

**Minimum required columns** (column names are auto-mapped):

| Column | Aliases accepted |
|---|---|
| Date | date, datetime, day, dt, trade_date |
| Open | open, open_price, opening |
| High | high, high_price, day_high |
| Low  | low, low_price, day_low |
| Close | close, close_price, ltp, last |
| Volume | volume, vol, qty, shares |

**Example**:
```
,Open,High,Low,Close,Volume
10-04-2024,160.25,162.07,157.57,158.10,64134758
12-04-2024,159.01,159.01,156.13,156.61,55317636
...
```

---

## Data Source Options

1. **CSV Upload** — upload one or more local CSV files (recommended for Indian stocks)
2. **Yahoo Finance** — search by company name; auto-fetches 2-year daily history using `yfinance`

---

## No Persistent Storage

- ✅ No database
- ✅ No file writes
- ✅ No model saving
- ✅ No cached uploads
- ✅ All DataFrames are in-memory Python objects
- ✅ ML model is trained fresh every session and discarded after

---

## Limitations

- ML accuracy is directional (~55–65% typical); not a price oracle
- Markov chain assumes stationarity; regime shifts can reduce accuracy
- CAGR projection is historical extrapolation, not a forward forecast
- 2-year daily data (~500 rows) works best; fewer than 60 rows will skip ML
- Yahoo Finance fetch requires a live internet connection

---

## Folder Structure

```
quantstock/
├── app.py            ← Single unified app (all logic here)
├── requirements.txt
└── README.md
```

---

## Disclaimer

This tool is for **educational and research purposes only**.  
Nothing here constitutes financial advice. Always consult a SEBI-registered advisor before investing.
