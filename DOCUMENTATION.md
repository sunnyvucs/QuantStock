# QuantStock — Complete Tab Documentation

## Application Overview

**QuantStock Omni-Engine** is a multi-modal Indian stock analysis platform supporting NSE/BSE live data (Yahoo Finance) and custom CSV uploads. It integrates four analytical models into a single composite trading signal.

**Global Sidebar Parameters** (apply to all tabs):

| Parameter | Default | Range | Meaning |
|---|---|---|---|
| Investment Amount (₹) | 1,00,000 | 1K–1Cr | Capital budget to deploy |
| Target Return % | 10% | 1–50% | Profit target level |
| Stop Loss % | 5% (auto = Target÷2) | 0.5–25% | Maximum loss tolerance |
| ATR Multiplier | 1.5 | 0.5–3.0 | Controls how wide the price range bands are |
| Enable ML Training | On | Toggle | Activates the machine learning model |
| Markov Thresholds | −1.5/−0.3/+0.3/+1.5% | Editable | Boundaries that classify daily returns into 5 states |

---

## Tab 1 — Overview

**Purpose:** A high-level snapshot — first thing you see after entering a stock. Combines price history, momentum indicators, and fundamental data to answer "what is this stock doing right now?"

### Metric Cards (top row)

| Card | What it shows | How to read it |
|---|---|---|
| **Price** | Last closing price (₹) + 1-day return % | Green = gained, Red = fell; also shows if price is above/below MA20/50/200 |
| **Volume** | Shares traded (auto-scaled: K/L/Cr) | Higher than usual = strong conviction in the move |
| **RSI (14)** | Relative Strength Index, 0–100 | <30 (green) = oversold/cheap; >70 (red) = overbought/expensive; 30–70 = neutral |
| **ATR (14)** | Average True Range in ₹ | Daily expected price swing — higher = more volatile stock |
| **Trend Score** | 0–5 composite check | 4–5 = Strong Bullish (green); 3 = Moderate (yellow); <2 = Weak (red) |

### RSI Formula
```
RS = Average Gain (14 days) / Average Loss (14 days)
RSI = 100 − (100 / (1 + RS))
```

### Trend Score Formula
```
+1 if Price > MA20
+1 if Price > MA50
+1 if Price > MA200
+1 if RSI < 75
+1 if MACD > Signal Line
Total: 0–5 points
```

### Price Chart (2-Year History)
- Interactive line chart with toggleable overlays
- **Price** (white) — raw closing prices
- **MA20** (indigo) — 20-day average, short-term trend
- **MA50** (yellow) — 50-day average, medium-term trend
- **MA200** (red) — 200-day average, long-term trend

### Returns Card
| Period | Meaning |
|---|---|
| 1D | Yesterday vs today |
| 5D | Last week performance |
| 1M | Last month performance |
| 3M | Last quarter |
| 6M | Half-year |

### Key Levels Card
Shows all important technical price levels at a glance: Current Price, Open/High/Low, MA20/50/200, MACD value, MACD Signal, MACD Histogram.

### Fundamentals (Yahoo Finance mode only)
| Field | Meaning |
|---|---|
| Market Cap | Total company value (₹ Cr) |
| P/E Ratio | Price-to-Earnings — how expensive vs earnings |
| ROE | Return on Equity — how efficiently company uses capital |
| Debt/Equity | Financial leverage — higher = more debt risk |

---

## Tab 2 — Trade Plan

**Purpose:** Turn raw stock data into a concrete, personalized trade plan. Answers "if I invest ₹X in this stock with Y% target, what does my position look like?"

### Capital Allocation Card
| Field | Formula | Meaning |
|---|---|---|
| Shares (full) | floor(Investment ÷ Price) | Whole shares you can buy |
| Invested | Shares × Price | Capital actually deployed |
| Cash Left | Investment − Invested | Undeployed balance |

### Target Card
| Field | Formula | Meaning |
|---|---|---|
| Target Price | Price × (1 + Target%) | Where to book profit |
| Upside ₹/% | Target − Entry | Expected gain per share |
| Gross Profit | Shares × Upside | Total potential profit |

### Stop Loss Card
| Field | Formula | Meaning |
|---|---|---|
| SL Price | Price × (1 − SL%) | Where to exit if wrong |
| Downside ₹/% | Entry − SL | Maximum loss per share |
| Max Risk | Shares × Downside | Total capital at risk |

### Risk/Reward Ratio
```
R:R = Gross Profit / Max Risk
```
| R:R | Interpretation |
|---|---|
| ≥ 2.0 | Excellent — reward well outweighs risk |
| 1.5–2.0 | Good trade setup |
| 1.0–1.5 | Acceptable but marginal |
| < 1.0 | Poor — avoid this setup |

Displayed as a proportional bar: Red (risk) vs Green (reward).

### CAGR Projection
| Field | Meaning |
|---|---|
| Historical CAGR | Compound Annual Growth Rate from historical price |
| Projected Price | Where the stock might be at the chosen horizon |
| Projected Portfolio | Investment value at that horizon |
| Horizons shown | 1M, 3M, 6M, 12M, 36M |

```
CAGR = (Latest Price / Oldest Price)^(1 / years) − 1
Projected = Current Price × (1 + CAGR)^(years)
```

---

## Tab 3 — Range Levels

**Purpose:** Identify key price support/resistance zones for the next trading session using pivot points and ATR bands. Answers "where is the stock likely to go today?"

### Price Levels (sorted high to low)

| Level | Formula | Meaning |
|---|---|---|
| **R1 (Resistance)** | (2 × Pivot) − Low | First ceiling price above pivot |
| **Expected High** | Pivot + (ATR × Multiplier) | Upper volatility band (breakout target) |
| **Pivot Point** | (High + Low + Close) / 3 | Central reference — bullish if price is above, bearish below |
| **Current Price** | Latest close | Reference marker |
| **Expected Low** | Pivot − (ATR × Multiplier) | Lower volatility band (breakdown target) |
| **S1 (Support)** | (2 × Pivot) − High | First floor price below pivot |

### Range Bias Card
| Field | Meaning |
|---|---|
| Bias | Bullish if Price > Pivot; Bearish if Price < Pivot |
| ATR Value | Raw daily volatility in ₹ |
| vs Pivot % | How far current price is from pivot point |

### ATR Band Details
| Field | Meaning |
|---|---|
| ATR × Multiplier | Band width driver (e.g., ₹45 × 1.5 = ₹67.5) |
| Band Width | Expected High − Expected Low |
| Upper Band % | Distance from price to Expected High |
| Lower Band % | Distance from price to Expected Low |

---

## Tab 4 — Markov Chain Model

**Purpose:** Probabilistic forecasting — given the stock's current "state" (today's return category), what state is it most likely to be in tomorrow? Answers "what is the statistical probability of up vs down tomorrow?"

### State Classification

Daily return is classified into one of 5 states:

| State | Condition | Meaning |
|---|---|---|
| Strong Down | Return < −1.5% | Big down day |
| Down | −1.5% ≤ return < −0.3% | Small down day |
| Flat | −0.3% ≤ return < 0.3% | Sideways |
| Up | 0.3% ≤ return < 1.5% | Small up day |
| Strong Up | return ≥ 1.5% | Big up day |

### Summary Cards

| Card | Formula | Meaning |
|---|---|---|
| Current State | Today's return → state label | What the stock did today |
| Most Likely Next | argmax(TransitionMatrix[current]) | Highest probability next state |
| Expected Close | Price × (1 + Expected Return%) | Statistical target for next close |
| Expected Return | Σ(Probability × Avg Return per State) | Probability-weighted next return % |
| Bull Probability | P(Up) + P(Strong Up) | % chance of a positive day |
| Bear Probability | P(Down) + P(Strong Down) | % chance of a negative day |
| Markov Bias | Bull P > Bear P → Bullish | Overall directional lean |

### Probability Distributions
- **Next Session (1-day):** Direct row from transition matrix for current state
- **3-Day Forward:** Matrix raised to the power of 3 (T³) — where are we likely to be in 3 days?

### Historical State Distribution
Shows how often each state occurred in the historical data — gives context to the probabilities.

### Transition Matrix (expandable)
5×5 grid where cell [i][j] = probability of going from state i to state j. Each row sums to 100%.

---

## Tab 5 — Statistical Model (ML)

**Purpose:** Machine learning prediction of next-day direction using 13 technical features. Answers "what does the algorithm think the stock will do tomorrow, based on all technical indicators together?"

### Model Details
| Attribute | Value |
|---|---|
| Algorithm | XGBoost or Random Forest (auto-selected) |
| Target | 1 = next close higher, 0 = lower |
| Train/Test Split | 80% oldest data = train, 20% recent = test |
| Minimum data needed | 60 clean rows |

### 13 Input Features
`MA20, MA50, MA200, RSI, MACD, MACD Signal, MACD Histogram, ATR, 1D Return%, 5D Return%, 1M Return%, Volume, Turnover`

### Performance Metrics

| Metric | Meaning |
|---|---|
| **Accuracy** | What % of test days did the model get right? |
| **Directional Score** | Model's current probability (%) that tomorrow is up |
| **Precision** | When the model predicted "up", how often was it right? |
| **Recall** | Of all actual up days, how many did it catch? |

### Direction Probability Bar
Split bar: Red (down %) vs Green (up %). Labeled Bullish/Bearish/Neutral.

### Feature Importances
Ranked list of which indicators drove the model's decisions — e.g., "RSI contributed 22% to the prediction."

### Confusion Matrix

```
              Predicted Up   Predicted Down
Actual Up         TP              FN
Actual Down       FP              TN
```
- **TP (green):** Correctly called up days
- **TN (green):** Correctly called down days
- **FP (red):** Incorrectly predicted up (false alarm)
- **FN (red):** Missed an actual up day

---

## Tab 6 — Signal Summary (Final Decision)

**Purpose:** Combines all four models into one composite confidence score and final trading recommendation. This is the "verdict" tab.

### Composite Score Formula

**With ML enabled:**
```
Score = Trend% × 30% + Range% × 10% + Markov% × 20% + ML% × 40%
```

**Without ML:**
```
Score = Trend% × 40% + Range% × 20% + Markov% × 40%
```

### Component Sub-Scores

| Model | How sub-score is derived |
|---|---|
| **Trend (30%)** | (Trend Score / 5) × 100 |
| **Range (10%)** | 62 if price above pivot (bullish), 38 if below |
| **Markov (20%)** | 65 if bullish, 50 if neutral, 35 if bearish |
| **ML (40%)** | Model's up-probability × 100 |

### Final Decision Labels

| Score Range | Label | Color |
|---|---|---|
| ≥ 70 | Strong Bullish Signal | Green |
| 57–70 | Moderate Bullish Signal | Light Green |
| 43–57 | Neutral Signal | Yellow |
| < 43 | Bearish Signal | Red |

### Visual Elements
- **Animated Score Ring** — circular progress gauge (0–100), color-coded
- **Big Decision Label** — "Buy" / "Avoid" / "Hold"
- **Signal Pill** — "Strong Bullish / Moderate Bullish / Neutral / Bearish"
- **Score Breakdown Bars** — one bar per model with weight badge
- **Model Signals Table** — each model's raw signal, score, and bias in one row
- **Trend Breakdown (expandable)** — shows which of the 5 trend conditions passed/failed
- **Disclaimer Banner** — "Educational purposes only. Not financial advice."

---

## Tab 7 — Raw Data

**Purpose:** Full transparency — view and download the exact computed dataset used for all analysis.

### Table Columns (16 total)

| Column | Meaning |
|---|---|
| Date | Trading date |
| Open | Opening price |
| High | Day high |
| Low | Day low |
| Close | Closing price |
| Volume | Shares traded |
| MA20 | 20-day moving average |
| MA50 | 50-day moving average |
| MA200 | 200-day moving average |
| RSI | Relative Strength Index |
| MACD | MACD line value |
| MACD Signal | Signal line value |
| ATR | Average True Range |
| Ret 1D% | 1-day return % |
| Ret 5D% | 5-day return % |
| Ret 1M% | 1-month return % |

### Controls
- **Pagination** — 50 rows per page, Prev/Next buttons + page selector
- **Bars Total** — e.g., "487 bars" (how many trading days of data)
- **Download CSV** — exports the full 16-column computed dataset
- Return columns are color-coded: Green (positive), Red (negative)

---

## CSV Upload Mode

If you're not using Yahoo Finance, you can upload your own OHLCV data. The app auto-detects columns using fuzzy name matching:

| Column | Accepted names |
|---|---|
| Date | date, datetime, time, timestamp, day, trade_date |
| Open | open, open_price, o, opening |
| High | high, high_price, h, highest, day_high |
| Low | low, low_price, l, lowest, day_low |
| Close | close, close_price, c, closing, last, ltp, last_price |
| Volume | volume, vol, v, qty, quantity, shares, trd_vol |

---

## Key Formulas Reference

### Technical Indicators
```
RSI = 100 − (100 / (1 + RS))
      where RS = Avg Gain(14) / Avg Loss(14)

MACD = EMA(12) − EMA(26)
Signal = EMA(MACD, 9)
Histogram = MACD − Signal

ATR = EWM(True Range, span=14)
      where TR = max(H−L, |H−prevC|, |L−prevC|)

MA20, MA50, MA200 = SMA(close, period)
```

### Trade Plan
```
Shares (full) = floor(Investment / Price)
Invested = Shares × Price
Cash Left = Investment − Invested

Target Price = Price × (1 + Target% / 100)
SL Price = Price × (1 − SL% / 100)

Profit = Shares × (Target − Price)
Risk = Shares × (Price − SL)
R:R = Profit / Risk

CAGR = (Latest / First)^(1 / years) − 1
Projected = Price × (1 + CAGR)^(years)
```

### Range Levels
```
Pivot = (High + Low + Close) / 3
R1 = (2 × Pivot) − Low
S1 = (2 × Pivot) − High

Expected High = Pivot + (ATR × Multiplier)
Expected Low = Pivot − (ATR × Multiplier)

Bias = "Bullish" if Close > Pivot else "Bearish"
```

### Markov Chain
```
Daily return → classify into 5 states
Build transition matrix T[i][j]
Row-normalize to get probabilities
Next state probabilities = T[current_state]
3-day probabilities = T^3[current_state]

Bull P = P(Up) + P(Strong Up)
Bear P = P(Down) + P(Strong Down)
Bias = Bullish if Bull P > 0.45 else Bearish/Neutral
```

### Final Decision Score
```
If ML enabled:
  Score = Trend% × 0.30 + Range% × 0.10 + Markov% × 0.20 + ML% × 0.40

If ML disabled:
  Score = Trend% × 0.40 + Range% × 0.20 + Markov% × 0.40

Decision thresholds:
  ≥ 70 → Strong Bullish
  57–70 → Moderate Bullish
  43–57 → Neutral
  < 43 → Bearish
```

---

## Design System

| Attribute | Value |
|---|---|
| Style | Revolut-inspired flat dark design |
| Primary font | Inter (UI), Aeonik Pro (display headings) |
| Monospace | System mono (data tables) |
| Bullish color | #4ade80 / #22cc77 (green) |
| Bearish color | #f87171 / #ff4444 (red) |
| Neutral/Accent | #6366f1 (indigo/blue) |
| Warning | #fbbf24 / #ffaa00 (yellow) |
| Background | #191c1f (dark) |
| Base spacing | 8px grid |
| Responsive | Full layout > 1024px; mobile-optimized < 720px |

---

*Educational and informational purposes only. Not financial advice. Consult a SEBI-registered advisor before making investment decisions.*
