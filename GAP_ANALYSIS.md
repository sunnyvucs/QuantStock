# QuantStock — Gap Analysis & Improvement Roadmap

**Date:** 2026-04-19  
**Source:** Comparison of `app.py` vs `Product Plan.txt`

---

## 1. Architecture Gap

| Area | Current `app.py` | Product Plan Target |
|---|---|---|
| Compute model | Per-request, in-memory | Precomputed via CRON jobs |
| Data storage | None — everything discarded | PostgreSQL with predictions table |
| Caching | `@st.cache_data` only | Redis cache layer |
| Framework | Streamlit (single-user tool) | FastAPI backend + React frontend |
| Deployment | Local `streamlit run` | Docker + Nginx + Cloud |
| SEO | Zero | Programmatic pages per stock |
| Monetization | None | AdSense + premium tier |

---

## 2. What's Already Good in app.py (Keep / Reuse)

- **ML logic** — XGBoost/RandomForest with RSI, MACD, MAs, ATR features matches §5.1–5.2 of the plan exactly. Core asset.
- **Indicator engine** — Pure pandas/numpy, no external TA lib. Fully portable as a service.
- **Markov chain model** — Unique differentiator not in the plan. Worth keeping as a premium signal.
- **Trade plan calculator** — Good premium feature material (shares, R/R ratio, CAGR projection).
- **Output format** — `final_decision()` already produces `trend + probability + confidence`, mapping directly to the plan's §5.3 output schema.
- **`session_state` persistence** — Already implemented; proves the data flow works end-to-end.

---

## 3. Improvement Roadmap

### Phase 1 — Extract & Persist Prediction Logic (Highest Value)
1. Pull `compute_technicals`, `run_ml`, `build_markov`, `final_decision` out of `app.py` into a standalone `predictor.py` module with no Streamlit dependency.
2. Write a `pipeline.py` CRON script:
   - Fetch Nifty 500 symbols
   - Run predictor for each
   - Write results to `predictions_cache.json` (SQLite/PostgreSQL later)
3. Modify `app.py` to read from the cache file instead of recomputing on every request → instant page loads.

### Phase 2 — FastAPI Wrapper
4. Wrap `predictor.py` behind a FastAPI endpoint:
   - `GET /api/predict?stock=TCS`
   - Response: `{ "stock", "trend", "probability", "confidence", "timestamp" }`
5. Streamlit becomes a thin UI that calls the API — no ML on the frontend.

### Phase 3 — LSTM Model Addition
6. Add `train_lstm.py` for time-series prediction (plan §5.2 calls for LSTM alongside XGBoost).
7. Train nightly via CRON, save model file, include LSTM signal in ensemble output.

### Phase 4 — Missing Features vs. Plan

| Feature | Plan Reference | Status |
|---|---|---|
| Price alerts | §6.2 `/api/alerts` | Missing |
| Multi-timeframe predictions | DB `timeframe` column §3.3 | Missing |
| Sentiment score input | §5.1 (optional) | Missing |
| Trending stocks widget | §7.1 Home Page | Missing |
| Historical prediction log | §6.2 `/api/history` | Missing |

### Phase 5 — Frontend & Monetization
8. React / Next.js frontend with SSR for SEO.
9. Programmatic stock pages: `/stocks/tcs-prediction`, `/stocks/infy-forecast`.
10. Google AdSense banner placements.
11. Premium tier: alerts, advanced insights, portfolio tracking.

---

## 4. Priority Order

| # | What | Why |
|---|---|---|
| 1 | Extract `predictor.py` standalone module | Unblocks all phases |
| 2 | CRON + JSON/DB persistence | Kills per-request compute problem |
| 3 | FastAPI `/api/predict` endpoint | Makes it a product, not a tool |
| 4 | LSTM model | Fills plan's model gap |
| 5 | Alerts + multi-timeframe | Premium feature seeds |
| 6 | React/Next.js + SEO pages | Traffic and monetization |

---

## 5. Success Metrics (from Plan §1.3)

| Metric | Target |
|---|---|
| API Response Time | < 200 ms |
| Monthly Users | 50K+ |
| Ad Revenue | ₹20K+/month |
| System Uptime | 99% |

---

*This document is for planning purposes. No code changes have been made.*