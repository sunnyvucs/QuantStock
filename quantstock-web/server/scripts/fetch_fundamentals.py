"""
Called by the Node server as a subprocess.
Usage: python fetch_fundamentals.py TATASTEEL.NS
Outputs a single JSON line to stdout.
"""
import sys
import json
import warnings
warnings.filterwarnings("ignore")

def fetch(symbol):
    import yfinance as yf

    t    = yf.Ticker(symbol)
    info = t.info or {}

    name       = info.get("longName") or info.get("shortName") or symbol
    market_cap = info.get("marketCap")          # raw INR
    pe         = info.get("trailingPE")
    currency   = info.get("currency", "INR")

    # D/E from .info is already a ratio (e.g. 99.7 means 99.7%)
    de = info.get("debtToEquity")
    if de is not None:
        de = de / 100.0   # normalise to plain ratio (0.997)

    # ROE: try .info first, then calculate from balance sheet
    roe = info.get("returnOnEquity")   # decimal e.g. 0.082
    if roe is None:
        try:
            bs  = t.balance_sheet
            inc = t.financials
            if bs is not None and inc is not None and not bs.empty and not inc.empty:
                ni_row  = next((r for r in ["Net Income"] if r in inc.index), None)
                eq_row  = next((r for r in ["Common Stock Equity", "Stockholders Equity",
                                             "Total Equity Gross Minority Interest"] if r in bs.index), None)
                if ni_row and eq_row:
                    ni  = inc.loc[ni_row].iloc[0]
                    eq  = bs.loc[eq_row].iloc[0]
                    if eq and eq != 0:
                        roe = float(ni) / float(eq)   # decimal
        except Exception:
            pass

    result = {
        "name":         name,
        "marketCap":    market_cap,        # raw INR — frontend converts to Cr
        "pe":           pe,
        "roe":          roe,               # decimal (0.082 = 8.2%) or null
        "debtToEquity": de,                # plain ratio (0.997) or null
        "currency":     currency,
    }
    print(json.dumps(result))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No symbol provided"}))
        sys.exit(1)
    try:
        fetch(sys.argv[1])
    except Exception as e:
        print(json.dumps({"error": str(e)}))
