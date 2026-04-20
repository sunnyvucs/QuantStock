# QuantStock Omni-Engine

A **fully local, zero-storage** Indian stock analysis platform with two independent implementations:

- **Python + Streamlit** — original single-file app, runs in the browser via Streamlit
- **Node.js + React** — modern web app with Express backend and Vite/React frontend

Both versions support live NSE/BSE data via Yahoo Finance and custom CSV uploads. All calculations run in-memory — no database, no file writes, no data stored.

---

## Features

| Module | What it does |
|---|---|
| **Indicator Engine** | MA20/50/200, EMA12/26, RSI-14, MACD, ATR-14, 1D/5D/1M/3M/6M returns |
| **Trade Plan** | Position sizing, target price, stop-loss, risk/reward ratio, CAGR projection |
| **Range Levels** | ATR-based expected high/low + Pivot, R1, S1 for next trading session |
| **Markov Chain** | 5-state regime model — next-day & 3-day state probabilities, expected close |
| **ML Confirmation** | XGBoost / RandomForest trained on-the-fly, next-day direction probability |
| **Final Decision** | Weighted confidence score (0–100) → Strong Bullish / Moderate / Neutral / Bearish |

---

## Project Structure

```
QuantStock/
├── app.py                      ← Python/Streamlit app (all-in-one)
├── requirements.txt            ← Python dependencies
│
└── quantstock-web/             ← Node.js + React app
    ├── package.json
    ├── server/                 ← Express API backend
    │   ├── index.js            ← Server entry point (port 3001)
    │   ├── routes/
    │   │   └── api.js          ← REST API routes
    │   ├── services/
    │   │   ├── stockFetcher.js      ← Yahoo Finance integration
    │   │   ├── indicators.js        ← MA, RSI, MACD, ATR
    │   │   ├── trendScore.js        ← 5-point trend score
    │   │   ├── rangeLevels.js       ← Pivot, R1, S1, ATR bands
    │   │   ├── markov.js            ← Markov chain model
    │   │   ├── mlModel.js           ← Random Forest ML model
    │   │   ├── tradePlan.js         ← Position sizing & risk/reward
    │   │   ├── cagrProjection.js    ← CAGR & projections
    │   │   └── finalDecision.js     ← Composite signal score
    │   └── scripts/
    │       └── fetch_fundamentals.py ← Python helper for fundamentals
    └── client/                 ← Vite + React frontend
        ├── index.html
        ├── vite.config.js
        └── src/
            ├── App.jsx
            ├── main.jsx
            ├── index.css
            ├── hooks/
            │   └── useAnalysis.js
            ├── services/
            │   └── api.js
            └── components/
                ├── SearchBar.jsx
                ├── TabNav.jsx
                ├── MetricsRow.jsx
                ├── PriceChart.jsx
                ├── ControlPanel.jsx
                ├── AnimatedBackground.jsx
                ├── tabs/
                │   ├── OverviewTab.jsx
                │   ├── TradePlanTab.jsx
                │   ├── RangeLevelsTab.jsx
                │   ├── MarkovTab.jsx
                │   ├── MLTab.jsx
                │   ├── DecisionTab.jsx
                │   └── RawDataTab.jsx
                └── ui/
                    ├── MetricCard.jsx
                    ├── Badge.jsx
                    ├── Toggle.jsx
                    ├── Slider.jsx
                    ├── InfoTooltip.jsx
                    └── LoadingOverlay.jsx
```

---

## Option A — Python + Streamlit

### Requirements
- Python 3.10 or higher
- Internet connection for Yahoo Finance mode

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/sunnyvucs/QuantStock.git
cd QuantStock

# 2. Create virtual environment
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

> `xgboost` is optional. If not installed, the app falls back to `RandomForest` from scikit-learn automatically.

### Run

```bash
streamlit run app.py
```

Open **http://localhost:8501** in your browser.

---

## Option B — Node.js + React

### Requirements
- Node.js 18 or higher
- Python 3.10+ (used by the fundamentals helper script)
- Internet connection for Yahoo Finance mode

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/sunnyvucs/QuantStock.git
cd QuantStock/quantstock-web

# 2. Install all dependencies (server + client)
npm install
cd client && npm install && cd ..
```

### Run (Development)

**Terminal 1 — Start the Express API server (port 3001):**
```bash
cd quantstock-web/server
npm run dev
```

**Terminal 2 — Start the React frontend (port 5173):**
```bash
cd quantstock-web/client
npm run dev
```

Open **http://localhost:5173** in your browser.

### Run (Production Build)

```bash
# Build the React app
cd quantstock-web/client
npm run build

# Serve via Express
cd ../server
npm start
```

### Environment Variables

Copy `quantstock-web/server/.env.example` to `quantstock-web/server/.env` and adjust if needed:

```env
PORT=3001
```

---

## CSV Upload Format

The app accepts any OHLCV CSV. Column names are auto-detected (case-insensitive):

| Column | Accepted aliases |
|---|---|
| Date | date, datetime, day, dt, trade_date, timestamp |
| Open | open, open_price, opening, o |
| High | high, high_price, day_high, h |
| Low | low, low_price, day_low, l |
| Close | close, close_price, ltp, last, closing, c |
| Volume | volume, vol, qty, shares, trd_vol, v |

**Example:**
```
Date,Open,High,Low,Close,Volume
10-04-2024,160.25,162.07,157.57,158.10,64134758
12-04-2024,159.01,159.01,156.13,156.61,55317636
```

Supported date formats: `DD-MM-YYYY`, `YYYY-MM-DD`, `DD/MM/YYYY`, or any standard format.

---

## How the Final Decision Score Works

```
With ML enabled:
  Score = Trend(30%) + Range(10%) + Markov(20%) + ML(40%)

Without ML:
  Score = Trend(40%) + Range(20%) + Markov(40%)

Decision:
  ≥ 70  →  Strong Bullish
  57–70 →  Moderate Bullish
  43–57 →  Neutral
  < 43  →  Bearish
```

---

## Tech Stack

| Layer | Python App | Node/React App |
|---|---|---|
| Frontend | Streamlit | React 18 + Vite |
| Backend | Python (in-process) | Express.js (Node 18) |
| Charts | Streamlit native | Recharts |
| ML | XGBoost / scikit-learn | ml-random-forest |
| Data | yfinance | yahoo-finance2 |
| Styling | Streamlit theme | Custom CSS (Revolut-inspired dark) |

---

## Limitations

- ML accuracy is directional (~55–65% typical) — not a price oracle
- Markov chain assumes stationarity; regime shifts can reduce accuracy
- CAGR projection is historical extrapolation, not a forward forecast
- Minimum 60 clean rows required for ML training
- Yahoo Finance fetch requires a live internet connection

---

## Disclaimer

This tool is for **educational and research purposes only**.  
Nothing here constitutes financial advice. Always consult a SEBI-registered advisor before making investment decisions.
