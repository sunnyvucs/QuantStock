import streamlit as st
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings("ignore")

# ── Optional XGBoost (fallback to RandomForest) ────────────────────────────
try:
    from xgboost import XGBClassifier
    USE_XGB = True
except ImportError:
    USE_XGB = False
    

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, confusion_matrix

# ══════════════════════════════════════════════════════════════════════════════
# PAGE CONFIG
# ══════════════════════════════════════════════════════════════════════════════
st.set_page_config(page_title="QuantStock Omni-Engine", layout="wide", page_icon="💠")

st.markdown("""
<style>
[data-testid="stMetricValue"]  { font-size: 1.1rem !important; }
[data-testid="stMetricLabel"]  { font-size: 0.75rem !important; }
.decision-box {
    text-align: center; padding: 28px 20px;
    border-radius: 14px; margin-bottom: 18px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid rgba(255,255,255,0.08);
}
.decision-label  { font-size: 2.4rem; font-weight: 800; letter-spacing: 1px; }
.decision-score  { font-size: 1.2rem; color: #aaa; margin-top: 6px; }
</style>
""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# UTILITIES
# ══════════════════════════════════════════════════════════════════════════════
def fmt(n):
    if pd.isna(n): return "N/A"
    return f"₹{n:,.2f}"

COLUMN_ALIASES = {
    "Date":   ["date","datetime","time","timestamp","day","dt","trade_date","tradedate"],
    "Open":   ["open","open_price","openprice","o","opening","open price"],
    "High":   ["high","high_price","highprice","h","highest","day_high","high price"],
    "Low":    ["low","low_price","lowprice","l","lowest","day_low","low price"],
    "Close":  ["close","close_price","closeprice","c","closing","last","ltp","last_price","close price"],
    "Volume": ["volume","vol","v","qty","quantity","shares","traded_volume","trd_vol"],
}

def auto_map_columns(df):
    rename_map, used = {}, set()
    for standard, aliases in COLUMN_ALIASES.items():
        if standard in df.columns:
            continue
        for col in df.columns:
            if col in used:
                continue
            if col.strip().lower() in aliases:
                rename_map[col] = standard
                used.add(col)
                break
    if rename_map:
        df.rename(columns=rename_map, inplace=True)
    return df

def smart_parse_date(series):
    for kwargs in [
        {"format": "mixed", "dayfirst": True},
        {"dayfirst": True},
        {},
    ]:
        try:
            return pd.to_datetime(series, **kwargs)
        except Exception:
            pass
    return pd.to_datetime(series, errors="coerce")


# ══════════════════════════════════════════════════════════════════════════════
# INDICATOR ENGINE  (pure pandas/numpy – no pandas_ta required)
# ══════════════════════════════════════════════════════════════════════════════
def _rsi(close, period=14):
    delta = close.diff()
    gain  = delta.clip(lower=0)
    loss  = (-delta).clip(lower=0)
    avg_g = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_l = loss.ewm(com=period - 1, min_periods=period).mean()
    rs    = avg_g / avg_l.replace(0, np.nan)
    return 100 - (100 / (1 + rs))

def _atr(high, low, close, period=14):
    hl = high - low
    hc = (high - close.shift(1)).abs()
    lc = (low  - close.shift(1)).abs()
    tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
    return tr.ewm(com=period - 1, min_periods=period).mean()

def _macd(close, fast=12, slow=26, signal=9):
    ema_f = close.ewm(span=fast, adjust=False).mean()
    ema_s = close.ewm(span=slow, adjust=False).mean()
    line  = ema_f - ema_s
    sig   = line.ewm(span=signal, adjust=False).mean()
    hist  = line - sig
    return line, sig, hist

@st.cache_data
def compute_technicals(df):
    df   = df.copy()
    c, h, l = df["Close"], df["High"], df["Low"]

    df["MA20"]         = c.rolling(20).mean()
    df["MA50"]         = c.rolling(50).mean()
    df["MA200"]        = c.rolling(200).mean()
    df["EMA12"]        = c.ewm(span=12, adjust=False).mean()
    df["EMA26"]        = c.ewm(span=26, adjust=False).mean()
    df["RSI"]          = _rsi(c)
    df["ATR"]          = _atr(h, l, c)
    df["Turnover"]     = c * df["Volume"]
    ml, ms, mh         = _macd(c)
    df["MACD"]         = ml
    df["MACD_Signal"]  = ms
    df["MACD_Hist"]    = mh
    df["1D_Return"]    = c.pct_change() * 100
    df["5D_Return"]    = c.pct_change(5)  * 100
    df["1M_Return"]    = c.pct_change(21) * 100
    df["3M_Return"]    = c.pct_change(63) * 100
    df["6M_Return"]    = c.pct_change(126)* 100
    return df


# ══════════════════════════════════════════════════════════════════════════════
# TRADE PLAN
# ══════════════════════════════════════════════════════════════════════════════
def calc_trade_plan(price, investment, target_pct, sl_pct):
    shares_exact  = investment / price if price else 0
    shares_full   = int(shares_exact)
    invested      = shares_full * price
    cash_left     = investment - invested
    target_price  = price * (1 + target_pct / 100)
    sl_price      = price * (1 - sl_pct / 100)
    profit        = (target_price - price) * shares_full
    risk          = (price - sl_price) * shares_full
    rr            = profit / risk if risk > 0 else 0
    return dict(shares_exact=shares_exact, shares_full=shares_full,
                invested=invested, cash_left=cash_left,
                target_price=target_price, sl_price=sl_price,
                profit=profit, risk=risk, rr=rr)


# ══════════════════════════════════════════════════════════════════════════════
# RANGE MODEL  (ATR + Classic Pivot Points)
# ══════════════════════════════════════════════════════════════════════════════
def calc_range(last, atr_mult):
    h, l, c = float(last["High"]), float(last["Low"]), float(last["Close"])
    atr     = float(last.get("ATR") or (h - l))
    pivot   = (h + l + c) / 3
    r1      = 2 * pivot - l
    s1      = 2 * pivot - h
    exp_h   = c + atr * atr_mult
    exp_l   = c - atr * atr_mult
    pct     = lambda v: (v - c) / c * 100
    return dict(pivot=pivot, r1=r1, s1=s1, exp_h=exp_h, exp_l=exp_l,
                pivot_pct=pct(pivot), r1_pct=pct(r1), s1_pct=pct(s1),
                exph_pct=pct(exp_h), expl_pct=pct(exp_l),
                atr=atr, bias="Bullish" if c > pivot else "Bearish")


# ══════════════════════════════════════════════════════════════════════════════
# MARKOV CHAIN MODEL
# ══════════════════════════════════════════════════════════════════════════════
STATES = ["Strong Down", "Down", "Flat", "Up", "Strong Up"]

def _classify(ret, thr=(-1.5, -0.3, 0.3, 1.5)):
    if   ret < thr[0]: return "Strong Down"
    elif ret < thr[1]: return "Down"
    elif ret < thr[2]: return "Flat"
    elif ret < thr[3]: return "Up"
    else:              return "Strong Up"

def build_markov(df, thr=(-1.5, -0.3, 0.3, 1.5)):
    rets   = df["Close"].pct_change().dropna() * 100
    states = rets.apply(lambda r: _classify(r, thr))

    # Build transition count matrix
    trans = pd.DataFrame(0, index=STATES, columns=STATES)
    for i in range(len(states) - 1):
        trans.loc[states.iloc[i], states.iloc[i + 1]] += 1

    # Row-normalise → probability matrix
    row_sums     = trans.sum(axis=1).replace(0, np.nan)
    trans_prob   = trans.div(row_sums, axis=0).fillna(0)

    # Current & next-day
    current      = _classify(float(rets.iloc[-1]), thr)
    next_prob    = trans_prob.loc[current]

    # 3-step via matrix power
    tm3          = np.linalg.matrix_power(trans_prob.values, 3)
    idx          = STATES.index(current)
    step3_prob   = pd.Series(tm3[idx], index=STATES)

    # Average return per state
    avg_ret      = {s: rets[states == s].mean() if (states == s).any() else 0.0 for s in STATES}

    exp_ret      = sum(next_prob[s] * avg_ret[s] for s in STATES)
    exp_close    = float(df["Close"].iloc[-1]) * (1 + exp_ret / 100)
    bull_p       = next_prob["Up"] + next_prob["Strong Up"]
    bear_p       = next_prob["Strong Down"] + next_prob["Down"]

    bias = "Bullish" if bull_p > 0.45 else ("Bearish" if bear_p > 0.45 else "Neutral")

    return dict(
        trans_prob   = trans_prob,
        current      = current,
        last_ret     = float(rets.iloc[-1]),
        next_prob    = next_prob,
        step3_prob   = step3_prob,
        most_likely  = next_prob.idxmax(),
        exp_ret      = exp_ret,
        exp_close    = exp_close,
        bull_p       = bull_p,
        bear_p       = bear_p,
        bias         = bias,
        state_counts = states.value_counts().reindex(STATES, fill_value=0),
    )


# ══════════════════════════════════════════════════════════════════════════════
# ML CONFIRMATION  (XGBoost / RandomForest)
# ══════════════════════════════════════════════════════════════════════════════
_FEATURES = ["MA20","MA50","MA200","RSI","MACD","MACD_Signal","MACD_Hist",
             "ATR","1D_Return","5D_Return","1M_Return","Volume","Turnover"]

def run_ml(df):
    data = df.copy()
    data["Target"] = (data["Close"].shift(-1) > data["Close"]).astype(int)
    avail = [c for c in _FEATURES if c in data.columns]
    data  = data.dropna(subset=avail + ["Target"])
    if len(data) < 60:
        return None, "Need ≥ 60 clean rows after indicators."

    X, y  = data[avail], data["Target"]
    split = int(len(X) * 0.80)
    Xtr, Xte, ytr, yte = X.iloc[:split], X.iloc[split:], y.iloc[:split], y.iloc[split:]

    if USE_XGB:
        model = XGBClassifier(n_estimators=150, max_depth=4, learning_rate=0.05,
                              subsample=0.8, colsample_bytree=0.8,
                              eval_metric="logloss", random_state=42, verbosity=0)
        mname = "XGBoost"
    else:
        model = RandomForestClassifier(n_estimators=150, max_depth=5,
                                       random_state=42, n_jobs=-1)
        mname = "Random Forest"

    model.fit(Xtr, ytr)
    ypred   = model.predict(Xte)
    latest_p = float(model.predict_proba(X.iloc[[-1]])[0][1])

    fi = pd.DataFrame({"Feature": avail,
                       "Importance": model.feature_importances_}
                      ).sort_values("Importance", ascending=False).reset_index(drop=True)

    return dict(
        name      = mname,
        acc       = accuracy_score(yte, ypred),
        prec      = precision_score(yte, ypred, zero_division=0),
        rec       = recall_score(yte, ypred, zero_division=0),
        cm        = confusion_matrix(yte, ypred),
        latest_p  = latest_p,
        fi        = fi,
        train_n   = split,
        test_n    = len(Xte),
    ), None


# ══════════════════════════════════════════════════════════════════════════════
# TREND SCORE  (5-point)
# ══════════════════════════════════════════════════════════════════════════════
def calc_trend(last):
    c     = float(last["Close"])
    score = 0
    reasons = []

    def chk(col, cond, yes, no):
        nonlocal score
        v = last.get(col)
        if v is not None and not pd.isna(v):
            if cond(float(v)):
                score += 1; reasons.append(f"✅ {yes}")
            else:
                reasons.append(f"❌ {no}")
        else:
            reasons.append(f"⚪ {col} unavailable")

    chk("MA20",  lambda v: c > v, f"Price above MA20 ({fmt(last.get('MA20',0))})",
                                   f"Price below MA20 ({fmt(last.get('MA20',0))})")
    chk("MA50",  lambda v: c > v, f"Price above MA50 ({fmt(last.get('MA50',0))})",
                                   f"Price below MA50 ({fmt(last.get('MA50',0))})")
    chk("MA200", lambda v: c > v, f"Price above MA200 ({fmt(last.get('MA200',0))})",
                                   f"Price below MA200 ({fmt(last.get('MA200',0))})")
    chk("RSI",   lambda v: v < 75, f"RSI={last.get('RSI',0):.1f} (not overbought)",
                                    f"RSI={last.get('RSI',0):.1f} (overbought > 75)")

    macd = last.get("MACD"); sig = last.get("MACD_Signal")
    if macd is not None and sig is not None and not pd.isna(macd):
        if float(macd) > float(sig):
            score += 1; reasons.append("✅ MACD above Signal (bullish momentum)")
        else:
            reasons.append("❌ MACD below Signal (bearish momentum)")
    else:
        reasons.append("⚪ MACD unavailable")

    return score, reasons


# ══════════════════════════════════════════════════════════════════════════════
# FINAL DECISION ENGINE
# ══════════════════════════════════════════════════════════════════════════════
def final_decision(trend_score, range_bias, markov_bias, ml_prob=None):
    trend_n  = (trend_score / 5) * 100
    range_n  = 62 if range_bias  == "Bullish" else 38
    markov_n = 65 if markov_bias == "Bullish" else (35 if markov_bias == "Bearish" else 50)

    if ml_prob is not None:
        ml_n = ml_prob * 100
        w    = dict(trend=0.30, range=0.10, markov=0.20, ml=0.40)
        raw  = trend_n*w["trend"] + range_n*w["range"] + markov_n*w["markov"] + ml_n*w["ml"]
        exps = [
            f"**Trend Score**: {trend_score}/5 → {trend_n:.0f} pts (30%)",
            f"**Range Bias**: {range_bias} → {range_n} pts (10%)",
            f"**Markov Bias**: {markov_bias} → {markov_n} pts (20%)",
            f"**ML Up-Prob**: {ml_prob*100:.1f}% → {ml_n:.0f} pts (40%)",
        ]
    else:
        w    = dict(trend=0.40, range=0.20, markov=0.40)
        raw  = trend_n*w["trend"] + range_n*w["range"] + markov_n*w["markov"]
        exps = [
            f"**Trend Score**: {trend_score}/5 → {trend_n:.0f} pts (40%)",
            f"**Range Bias**: {range_bias} → {range_n} pts (20%)",
            f"**Markov Bias**: {markov_bias} → {markov_n} pts (40%)",
        ]

    score = round(min(max(raw, 0), 100), 1)
    if   score >= 70: label, color = "🚀 Strong Buy", "#00ff88"
    elif score >= 57: label, color = "📈 Buy",        "#22cc77"
    elif score >= 43: label, color = "⏸️  Hold",      "#ffaa00"
    else:             label, color = "🚫 Avoid",      "#ff4444"

    return dict(score=score, label=label, color=color, explanations=exps)


# ══════════════════════════════════════════════════════════════════════════════
# CAGR PROJECTION HELPER
# ══════════════════════════════════════════════════════════════════════════════
def cagr_projection(df, price, months):
    n = len(df)
    if n < 50:
        return None, None
    cagr       = (price / float(df["Close"].iloc[0])) ** (252 / n) - 1
    proj_price = price * (1 + cagr * months / 12)
    return cagr, proj_price


# ══════════════════════════════════════════════════════════════════════════════
# MAIN DASHBOARD RENDERER
# ══════════════════════════════════════════════════════════════════════════════
def render_dashboard(name, df, last, info,
                     invest_amt, target_pct, sl_pct, atr_mult, enable_ml):

    price = float(last["Close"])
    st.header(f"📊  {name}")

    # ── Pre-compute all models (no storage) ───────────────────────────────────
    plan    = calc_trade_plan(price, invest_amt, target_pct, sl_pct)
    rng     = calc_range(last, atr_mult)
    markov  = build_markov(df)
    tscore, treasons = calc_trend(last)

    ml_res  = None
    if enable_ml:
        with st.spinner("Training ML model on your data…"):
            ml_res, ml_err = run_ml(df)
        if ml_err:
            st.warning(f"ML skipped: {ml_err}")

    ml_prob  = ml_res["latest_p"] if ml_res else None
    decision = final_decision(tscore, rng["bias"], markov["bias"], ml_prob)

    # ── TABS ──────────────────────────────────────────────────────────────────
    t1, t2, t3, t4, t5, t6, t7 = st.tabs([
        "📈 Overview", "💰 Trade Plan", "📏 Range Levels",
        "🎲 Markov Model", "🤖 ML Confirmation",
        "🏁 Final Decision", "🗃️ Raw Data",
    ])

    # ─────────────────────────────────────────
    # TAB 1 – OVERVIEW
    # ─────────────────────────────────────────
    with t1:
        d1r = last.get("1D_Return", 0) or 0
        c1, c2, c3, c4, c5 = st.columns(5)
        c1.metric("Price",       fmt(price),           f"{d1r:.2f}%")
        c2.metric("Volume",      f"{int(last['Volume']):,}")
        c3.metric("RSI (14D)",   f"{last.get('RSI', 0):.1f}")
        c4.metric("ATR",         fmt(last.get("ATR", 0)))
        c5.metric("Trend Score", f"{tscore}/5")

        st.markdown("##### Close Price with Moving Averages")
        chart_df = df[["Close","MA20","MA50","MA200"]].dropna(how="all")
        st.line_chart(chart_df)

        col_l, col_r = st.columns(2)
        with col_l:
            st.markdown("##### Returns")
            st.dataframe(pd.DataFrame({
                "Period": ["1 Day","5 Day","1 Month","3 Month","6 Month"],
                "Return %": [round(last.get(k, 0) or 0, 2)
                             for k in ["1D_Return","5D_Return","1M_Return","3M_Return","6M_Return"]],
            }), use_container_width=True, hide_index=True)

        with col_r:
            st.markdown("##### Key Levels")
            st.dataframe(pd.DataFrame({
                "Indicator": ["MA20","MA50","MA200","EMA12","EMA26","MACD","Signal"],
                "Value":     [fmt(last.get(k)) for k in ["MA20","MA50","MA200","EMA12","EMA26","MACD","MACD_Signal"]],
            }), use_container_width=True, hide_index=True)

        if info:
            st.markdown("##### Fundamentals")
            f1, f2, f3, f4 = st.columns(4)
            mc = info.get("marketCap", 0)
            f1.metric("Market Cap",  f"₹{mc//10**7:,} Cr" if mc else "N/A")
            f2.metric("P/E",         f"{info.get('trailingPE','N/A')}")
            roe = info.get("returnOnEquity", 0)
            f3.metric("ROE",         f"{roe*100:.2f}%" if roe else "N/A")
            f4.metric("Debt/Equity", f"{info.get('debtToEquity','N/A')}")

        with st.expander("📖 Indicator Glossary"):
            st.markdown("""
| Term | Explanation |
|---|---|
| **RSI** | < 40 oversold · 40–70 healthy · > 70 overbought |
| **ATR** | Average daily price swing in ₹ |
| **MA / EMA** | Price above = bullish; below = bearish |
| **MACD** | MACD > Signal = buying momentum |
| **Trend Score** | 5-pt score: MA20 + MA50 + MA200 + RSI + MACD |
""")

    # ─────────────────────────────────────────
    # TAB 2 – TRADE PLAN
    # ─────────────────────────────────────────
    with t2:
        st.markdown("##### 🎯 Execution Plan")
        a1, a2, a3 = st.columns(3)
        a1.info(
            f"**Capital**\n\n"
            f"Shares (exact): `{plan['shares_exact']:.2f}`\n\n"
            f"Shares (full): **{plan['shares_full']}**\n\n"
            f"Invested: **{fmt(plan['invested'])}**\n\n"
            f"Cash left: **{fmt(plan['cash_left'])}**"
        )
        a2.success(
            f"**Target  +{target_pct}%**\n\n"
            f"Exit price: **{fmt(plan['target_price'])}**\n\n"
            f"Est. profit: **{fmt(plan['profit'])}**"
        )
        a3.error(
            f"**Stop Loss  -{sl_pct}%**\n\n"
            f"Exit price: **{fmt(plan['sl_price'])}**\n\n"
            f"Max risk: **{fmt(plan['risk'])}**"
        )

        rr = plan["rr"]
        colour = "🟢" if rr >= 2 else ("🟡" if rr >= 1 else "🔴")
        st.metric("⚖️  Reward / Risk Ratio", f"{rr:.2f}",
                  f"{colour} {'Good' if rr>=2 else 'Acceptable' if rr>=1 else 'Poor – widen target or tighten SL'}")

        st.markdown("---")
        st.markdown("##### ⏳ Historical CAGR Projection")
        hmap = {"1 Month":1,"3 Months":3,"6 Months":6,"12 Months":12,"3 Years":36}
        sel  = st.select_slider("Time Horizon", list(hmap.keys()), value="12 Months")
        cagr, proj = cagr_projection(df, price, hmap[sel])
        if cagr is not None:
            pp = (proj - price) * plan["shares_full"]
            p1, p2, p3 = st.columns(3)
            p1.metric("Historical CAGR",       f"{cagr*100:.2f}%", "annualised")
            p2.metric(f"Projected Price ({sel})", fmt(proj),         f"{(proj/price-1)*100:.2f}%")
            p3.metric("Projected Portfolio",   fmt(plan["invested"]+pp), f"+{fmt(pp)}")
        else:
            st.warning("Not enough history for CAGR projection (need > 50 rows).")

        with st.expander("📖 Trade Plan Glossary"):
            st.markdown("""
| Term | Explanation |
|---|---|
| **Shares (full)** | Full shares buyable without fractional |
| **Cash left** | Undeployed capital after buying full shares |
| **Target price** | Price to book profit at your target % |
| **Stop loss price** | Exit level to limit downside |
| **R/R ≥ 2** | Good risk-reward: earn ₹2 for every ₹1 risked |
| **CAGR projection** | Historical growth rate extrapolated forward (not a forecast) |
""")

    # ─────────────────────────────────────────
    # TAB 3 – RANGE LEVELS
    # ─────────────────────────────────────────
    with t3:
        st.markdown("##### 📐 Next-Day Technical Range")
        r1c, r2c, r3c, r4c, r5c = st.columns(5)
        r1c.metric("Exp. Low (ATR)",  f"₹{rng['exp_l']:.2f}", f"{rng['expl_pct']:.2f}%")
        r2c.metric("S1 Support",      f"₹{rng['s1']:.2f}",    f"{rng['s1_pct']:.2f}%")
        r3c.metric("Pivot Point",     f"₹{rng['pivot']:.2f}", f"{rng['pivot_pct']:.2f}%")
        r4c.metric("R1 Resistance",   f"₹{rng['r1']:.2f}",    f"{rng['r1_pct']:.2f}%")
        r5c.metric("Exp. High (ATR)", f"₹{rng['exp_h']:.2f}", f"{rng['exph_pct']:.2f}%")

        st.metric("Range Bias", rng["bias"],
                  "📈 Price above Pivot" if rng["bias"]=="Bullish" else "📉 Price below Pivot")
        st.info(f"ATR-14: **{fmt(rng['atr'])}**  |  Multiplier: **{atr_mult}×**  |  "
                f"Expected band: **{fmt(rng['exp_l'])} → {fmt(rng['exp_h'])}**")

        with st.expander("📖 Range Levels Glossary"):
            st.markdown("""
| Term | Explanation |
|---|---|
| **Pivot** | (H+L+C)/3 — neutral reference for tomorrow |
| **R1** | First resistance above pivot |
| **S1** | First support below pivot |
| **Exp. High / Low** | ATR × multiplier added/subtracted from last close |
| **Bias** | Bullish when Close > Pivot |
""")

    # ─────────────────────────────────────────
    # TAB 4 – MARKOV CHAIN
    # ─────────────────────────────────────────
    with t4:
        st.markdown("##### 🎲 Markov Chain Regime Model")
        st.warning("⚠️ Probabilistic model — directional guidance only, not a price guarantee.")

        m1, m2, m3 = st.columns(3)
        m1.metric("Current State",    markov["current"])
        m2.metric("Most Likely Next", markov["most_likely"])
        m3.metric("Exp. Next Close",  fmt(markov["exp_close"]),
                  f"{markov['exp_ret']:+.2f}%")

        b1, b2, b3 = st.columns(3)
        b1.metric("Bull Probability", f"{markov['bull_p']*100:.1f}%")
        b2.metric("Bear Probability", f"{markov['bear_p']*100:.1f}%")
        b3.metric("Regime Bias",      markov["bias"])

        st.markdown("##### Next-Day State Probabilities")
        np_df = markov["next_prob"].reset_index()
        np_df.columns = ["State","Probability"]
        np_df["% Chance"] = (np_df["Probability"] * 100).round(1)
        np_df["Visual"]   = np_df["% Chance"].apply(lambda x: "█" * int(x / 4))
        st.dataframe(np_df[["State","% Chance","Visual"]],
                     use_container_width=True, hide_index=True)

        st.markdown("##### 3-Day State Probabilities")
        s3 = markov["step3_prob"].reset_index()
        s3.columns = ["State","Probability"]
        s3["% Chance"] = (s3["Probability"] * 100).round(1)
        st.dataframe(s3[["State","% Chance"]], use_container_width=True, hide_index=True)

        with st.expander("📊 Full Transition Matrix"):
            st.dataframe(markov["trans_prob"].round(3), use_container_width=True)

        with st.expander("📊 Historical State Distribution"):
            sc = markov["state_counts"].reset_index()
            sc.columns = ["State","Count"]
            sc["%"] = (sc["Count"] / sc["Count"].sum() * 100).round(1)
            st.dataframe(sc, use_container_width=True, hide_index=True)

        with st.expander("📖 How the Markov Model Works"):
            st.markdown("""
1. Daily returns are bucketed into 5 states (Strong Down → Strong Up).
2. A transition matrix records how often each state leads to the next.
3. From today's state, the row in the matrix gives tomorrow's probabilities.
4. Raising the matrix to the 3rd power gives 3-day probabilities.
5. Bias is Bullish when P(Up) + P(Strong Up) > 45%.
""")

    # ─────────────────────────────────────────
    # TAB 5 – ML CONFIRMATION
    # ─────────────────────────────────────────
    with t5:
        st.markdown("##### 🤖 ML Confirmation — Next-Day Direction")
        if not enable_ml:
            st.info("ML training is disabled. Toggle it on in the sidebar.")
        elif ml_res is None:
            st.error("ML could not run. Check data quality (need ≥ 60 clean rows).")
        else:
            st.success(f"Model: **{ml_res['name']}**  |  "
                       f"Train: {ml_res['train_n']} rows  |  Test: {ml_res['test_n']} rows")

            mc1, mc2, mc3, mc4 = st.columns(4)
            mc1.metric("Accuracy",        f"{ml_res['acc']*100:.1f}%")
            mc2.metric("Precision",       f"{ml_res['prec']*100:.1f}%")
            mc3.metric("Recall",          f"{ml_res['rec']*100:.1f}%")
            mc4.metric("Next-Day Up Prob",f"{ml_res['latest_p']*100:.1f}%",
                       "📈 Bullish" if ml_res["latest_p"] > 0.5 else "📉 Bearish")

            st.markdown("##### Feature Importance")
            fi = ml_res["fi"].copy()
            fi["Bar"] = fi["Importance"].apply(lambda x: "█" * int(x * 50))
            st.dataframe(fi, use_container_width=True, hide_index=True)

            with st.expander("📊 Confusion Matrix"):
                cm_df = pd.DataFrame(
                    ml_res["cm"],
                    index=["Actual ↓","Actual ↑"],
                    columns=["Predicted ↓","Predicted ↑"],
                )
                st.dataframe(cm_df, use_container_width=True)

            with st.expander("📖 How ML Works Here"):
                st.markdown("""
- **Target**: 1 if next-day close > today's close, else 0
- **Features**: MAs, RSI, MACD, ATR, returns, volume, turnover
- **Time-order preserved**: no data leakage — test set is always the most recent 20%
- **No model saving**: trained fresh from your CSV every session
- Accuracy > 55% useful; > 60% is strong for directional signals
""")

    # ─────────────────────────────────────────
    # TAB 6 – FINAL DECISION
    # ─────────────────────────────────────────
    with t6:
        st.markdown("##### 🏁 Final Decision Engine")
        d = decision
        st.markdown(
            f"<div class='decision-box'>"
            f"<div class='decision-label' style='color:{d['color']};'>{d['label']}</div>"
            f"<div class='decision-score'>Confidence Score: "
            f"<b style='color:{d['color']};'>{d['score']} / 100</b></div>"
            f"</div>",
            unsafe_allow_html=True,
        )

        st.markdown("##### Score Breakdown")
        for e in d["explanations"]:
            st.markdown(f"- {e}")

        st.markdown("##### Model Contributions")
        weights_ml = dict(Trend="30%", Range="10%", Markov="20%", ML="40%")
        weights_no = dict(Trend="40%", Range="20%", Markov="40%", ML="—")
        w = weights_ml if ml_prob is not None else weights_no
        contrib = pd.DataFrame({
            "Model":  ["Trend Score","Range Bias","Markov Model","ML Model"],
            "Signal": [f"{tscore}/5", rng["bias"], markov["bias"],
                       f"{ml_prob*100:.1f}% up" if ml_prob else "Disabled"],
            "Weight": [w["Trend"], w["Range"], w["Markov"], w["ML"]],
        })
        st.dataframe(contrib, use_container_width=True, hide_index=True)

        st.markdown("##### Trend Signal Details")
        for r in treasons:
            st.markdown(f"  {r}")

        st.markdown("---")
        st.caption("⚠️ Not financial advice. Predictions are probabilistic. "
                   "Always do your own research before investing.")

    # ─────────────────────────────────────────
    # TAB 7 – RAW DATA
    # ─────────────────────────────────────────
    with t7:
        st.markdown("##### 🗃️ Computed Dataset")
        disp = df.sort_index(ascending=False)
        st.dataframe(disp, use_container_width=True)
        st.download_button(
            "📥 Download Computed CSV",
            disp.to_csv().encode("utf-8"),
            file_name=f"{name}_computed.csv",
            mime="text/csv",
        )


# ══════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ══════════════════════════════════════════════════════════════════════════════
st.sidebar.title("⚙️ QuantStock Controls")
data_mode = st.sidebar.radio("Data Source", ["🌐 Yahoo Finance", "📁 CSV Upload"])

st.sidebar.markdown("---")
st.sidebar.subheader("🎯 Trade Parameters")
invest_amt    = st.sidebar.number_input("Investment (₹)", value=100000, step=10000, min_value=1000)
target_pct    = st.sidebar.slider("Target Return %", 1, 50, 10)
sl_pct        = st.sidebar.slider("Stop Loss %", 1, 20, 5)
atr_mult      = st.sidebar.slider("ATR Multiplier", 0.5, 3.0, 1.5, step=0.1)

st.sidebar.markdown("---")
st.sidebar.subheader("🤖 ML Settings")
enable_ml     = st.sidebar.checkbox("Enable ML Training", value=True,
                                     help="Trains on upload — no data saved")

st.sidebar.markdown("---")
st.sidebar.subheader("🎲 Markov Thresholds (%)")
thr_sd = st.sidebar.number_input("Strong Down below", value=-1.5, step=0.1, format="%.1f")
thr_d  = st.sidebar.number_input("Down below",        value=-0.3, step=0.1, format="%.1f")
thr_u  = st.sidebar.number_input("Up above",          value= 0.3, step=0.1, format="%.1f")
thr_su = st.sidebar.number_input("Strong Up above",   value= 1.5, step=0.1, format="%.1f")
markov_thresholds = (thr_sd, thr_d, thr_u, thr_su)

st.sidebar.caption("No data is saved. All analysis is in-memory only.")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
st.title("💠 QuantStock Omni-Engine")
st.caption("ATR Range · Markov Chain · XGBoost / RF · Final Decision — all in-memory, no storage")

# ─────────────────────────────────────────────
# YAHOO FINANCE MODE
# ─────────────────────────────────────────────
if data_mode == "🌐 Yahoo Finance":
    query = st.text_input("Search Indian Company:", placeholder="e.g. Tata Steel, Infosys")
    if query:
        try:
            search  = yf.Search(query, max_results=8)
            quotes  = [q for q in search.quotes
                       if ".NS" in q.get("symbol","") or ".BO" in q.get("symbol","")]
            choices = {f"{q.get('longname', q['symbol'])} ({q['symbol']})": q["symbol"]
                       for q in quotes}
            if choices:
                sel_label = st.selectbox("Select result:", list(choices.keys()))
                if st.button("🚀 Analyse"):
                    sym = choices[sel_label]
                    with st.spinner("Fetching 2-year history…"):
                        tkr = yf.Ticker(sym)
                        raw = tkr.history(period="2y")
                    if not raw.empty:
                        raw.index = pd.to_datetime(raw.index).date
                        raw = raw[["Open","High","Low","Close","Volume"]].copy()
                        raw = compute_technicals(raw)
                        st.session_state["yf_df"]   = raw
                        st.session_state["yf_name"] = sel_label
                        st.session_state["yf_info"] = tkr.info
                    else:
                        st.error("No historical data returned.")

                if "yf_df" in st.session_state:
                    render_dashboard(
                        st.session_state["yf_name"],
                        st.session_state["yf_df"],
                        st.session_state["yf_df"].iloc[-1],
                        st.session_state["yf_info"],
                        invest_amt, target_pct, sl_pct, atr_mult, enable_ml,
                    )
            else:
                st.warning("No NSE/BSE matches found. Try appending .NS (e.g. TATASTEEL.NS).")
        except Exception as ex:
            st.error(f"Search error: {ex}")

# ─────────────────────────────────────────────
# CSV UPLOAD MODE
# ─────────────────────────────────────────────
else:
    uploaded = st.file_uploader("Upload OHLCV CSV(s)", type="csv", accept_multiple_files=True)
    if uploaded:
        stocks, ranking = {}, []

        for f in uploaded:
            try:
                df = pd.read_csv(f)
                df = auto_map_columns(df)
                if "Date" not in df.columns:
                    df.rename(columns={df.columns[0]: "Date"}, inplace=True)
                df["Date"] = smart_parse_date(df["Date"]).dt.date
                df.set_index("Date", inplace=True)
                df.sort_index(inplace=True)

                req     = ["Open","High","Low","Close","Volume"]
                missing = [c for c in req if c not in df.columns]
                if missing:
                    st.error(f"{f.name}: missing columns {missing}"); continue

                df = df[req].copy()
                for col in req:
                    df[col] = pd.to_numeric(df[col], errors="coerce")
                df.dropna(subset=["Close","High","Low","Volume"], inplace=True)

                df   = compute_technicals(df)
                last = df.iloc[-1]
                stocks[f.name] = {"df": df, "last": last}

                ts, _ = calc_trend(last)
                ranking.append({
                    "Stock":       f.name.replace(".csv",""),
                    "Price":       fmt(last["Close"]),
                    "Trend /5":    f"{ts}/5",
                    "RSI":         round(float(last.get("RSI") or 0), 1),
                    "1M Ret %":    round(float(last.get("1M_Return") or 0), 2),
                    "1D Ret %":    round(float(last.get("1D_Return") or 0), 2),
                    "ATR":         fmt(last.get("ATR")),
                })
            except Exception as ex:
                st.error(f"Error reading {f.name}: {ex}")

        if stocks:
            st.subheader("🏆 Multi-Stock Ranking")
            rank_df = pd.DataFrame(ranking).sort_values("Trend /5", ascending=False)
            st.dataframe(rank_df, use_container_width=True, hide_index=True)

            st.markdown("---")
            sel = st.selectbox("Select stock for detailed analysis:", list(stocks.keys()))
            d   = stocks[sel]
            render_dashboard(
                sel, d["df"], d["last"], None,
                invest_amt, target_pct, sl_pct, atr_mult, enable_ml,
            )
