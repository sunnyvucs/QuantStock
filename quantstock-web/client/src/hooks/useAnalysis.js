import { useState, useCallback, useRef, useEffect } from 'react';
import { analyseSymbol, analyseSymbolFast, streamML, analyseCsv, searchStocks } from '../services/api';
import { analyzeTargetFeasibility, buildGoalInsights, calcTradePlan, cagrProjection, calcGoalScore } from '../services/investmentPlan';

const STORAGE_KEY = 'qs_mvp_params';

const DEFAULT_PARAMS = {
  investment: 100000,
  targetPct: 10,
  slPct: 5,
  atrMult: 1.5,
  enableMl: true,
  slManual: false,
};

function loadStoredParams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PARAMS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PARAMS,
      ...parsed,
      investment: Number(parsed.investment) || DEFAULT_PARAMS.investment,
      targetPct: Number(parsed.targetPct) || DEFAULT_PARAMS.targetPct,
      slPct: Number(parsed.slPct) || DEFAULT_PARAMS.slPct,
      atrMult: Number(parsed.atrMult) || DEFAULT_PARAMS.atrMult,
      enableMl: parsed.enableMl !== false,
      slManual: parsed.slManual === true,
    };
  } catch {
    return DEFAULT_PARAMS;
  }
}

function enrichAnalysisData(data, params) {
  if (!data) return data;

  const price = data.price ?? data.lastBar?.close ?? null;
  const history = Array.isArray(data.history) ? data.history : [];
  const closes = history
    .map(bar => Number(bar.close))
    .filter(close => Number.isFinite(close) && close > 0);

  const tradePlan = price != null
    ? calcTradePlan(price, params.investment, params.targetPct, params.slPct)
    : data.tradePlan;

  const targetFeasibility = analyzeTargetFeasibility(history, {
    targetPct: params.targetPct,
    investment: params.investment,
  });

  const computedCagr = closes.length ? cagrProjection(closes, price, [1, 2, 3, 6, 12, 36]) : data.cagrData;
  const goalScoreResult = calcGoalScore(tradePlan, targetFeasibility, computedCagr, params.targetPct);

  return {
    ...data,
    tradePlan,
    cagrData: computedCagr,
    targetFeasibility,
    goalScore: goalScoreResult,
    goalInsights: buildGoalInsights({
      price,
      tradePlan,
      targetFeasibility,
      rangeLevels: data.rangeLevels,
      markov: data.markov,
      ml: data.ml,
    }),
    userGoal: {
      investment: params.investment,
      targetPct: params.targetPct,
      targetProfit: params.investment * (params.targetPct / 100),
      slPct: params.slPct,
      atrMult: params.atrMult,
    },
  };
}

function normalizeMlResult(fullData) {
  if (!fullData?.ml) return null;
  return {
    ...fullData.ml,
    modelsRun: fullData.ml.modelsRun || [fullData.ml.name],
  };
}

function buildMlFromStreamResult(mlResult) {
  if (mlResult?.latestP != null) {
    return {
      name: mlResult.name || 'Built-in Server Model',
      latestP: mlResult.latestP,
      featureImportances: mlResult.featureImportances || [],
      trainN: mlResult.trainN ?? null,
      testN: mlResult.testN ?? null,
      acc: mlResult.acc ?? null,
      prec: mlResult.prec ?? null,
      rec: mlResult.rec ?? null,
      confMatrix: mlResult.confMatrix ?? null,
      modelsRun: mlResult.modelsRun || [mlResult.name || 'server'],
      models: mlResult.models || null,
      modelMetrics: mlResult.modelMetrics || null,
      weights: mlResult.weights || null,
    };
  }

  const em = mlResult?.ensembleMetrics;
  return {
    name: 'Ensemble (RF+XGB+LR+LSTM)',
    latestP: mlResult.ensemble,
    models: mlResult.models,
    modelMetrics: mlResult.modelMetrics,
    weights: mlResult.weights,
    modelsRun: mlResult.modelsRun,
    trainN: mlResult.trainN,
    testN: mlResult.testN,
    acc: em?.acc ?? null,
    prec: em?.prec ?? null,
    rec: em?.rec ?? null,
    confMatrix: em?.cm ?? null,
    featureImportances: mlResult.featureImportances || [],
  };
}

export function useAnalysis() {
  const [params, setParams] = useState(loadStoredParams);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mlStatus, setMlStatus] = useState(null); // null | 'pending' | 'running:...' | 'done' | 'error'
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [paramsChanged, setParamsChanged] = useState(false);

  const lastSymbolRef = useRef(null);
  const lastCsvFileRef = useRef(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const cancelMlRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    } catch {
      // Ignore storage failures in private mode or restricted browsers.
    }
  }, [params]);

  const updateParam = useCallback((key, value) => {
    setParams(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'targetPct' && !prev.slManual) {
        next.slPct = parseFloat((value * 0.5).toFixed(1));
      }
      if (key === 'slPct') next.slManual = true;
      return next;
    });
    setParamsChanged(true);
  }, []);

  const _startMLStream = useCallback((symbol, currentParams, baseData) => {
    if (cancelMlRef.current) cancelMlRef.current();
    if (!currentParams.enableMl) {
      setMlStatus(null);
      return;
    }
    setMlStatus('pending');

    cancelMlRef.current = streamML(symbol, currentParams, {
      onStatus: (msg) => setMlStatus(`running: ${msg}`),
      onResult: (mlResult) => {
        setAnalysisData(prev => {
          if (!prev) return prev;
          const ml = buildMlFromStreamResult(mlResult);
          const { trend, rangeLevels, markov } = prev;
          const newDecision = _recomputeDecision(trend, rangeLevels, markov, ml.latestP);
          const updatedGoalScore = calcGoalScore(prev.tradePlan, prev.targetFeasibility, prev.cagrData, paramsRef.current.targetPct);
          return {
            ...prev,
            ml,
            decision: newDecision,
            goalScore: updatedGoalScore,
            goalInsights: buildGoalInsights({
              price: prev.price,
              tradePlan: prev.tradePlan,
              targetFeasibility: prev.targetFeasibility,
              rangeLevels,
              markov,
              ml,
            }),
          };
        });
        setMlStatus('done');
      },
      onError: (msg) => {
        console.warn('ML stream error:', msg);
        setMlStatus('running: Falling back to built-in server model...');
        analyseSymbol(symbol, { ...currentParams, enableMl: true })
          .then((fullData) => {
            setAnalysisData(prev => {
              const enriched = enrichAnalysisData(fullData, currentParams);
              if (!prev) return enriched;
              return {
                ...prev,
                ml: normalizeMlResult(enriched),
                decision: enriched.decision,
              };
            });
            setMlStatus('done');
          })
          .catch((fallbackErr) => {
            console.warn('Fallback ML analysis failed:', fallbackErr);
            setMlStatus('error');
          });
      },
      onDone: () => {
        setMlStatus(s => s === 'pending' || s?.startsWith('running') ? 'done' : s);
      },
    });
  }, []);

  const _doAnalysisFast = useCallback(async (symbol, currentParams, preserveTab = false) => {
    if (cancelMlRef.current) { cancelMlRef.current(); cancelMlRef.current = null; }
    setLoading(true);
    setError(null);
    setAnalysisData(null);
    setMlStatus(null);
    if (!preserveTab) setActiveTab('overview');
    setParamsChanged(false);

    try {
      const data = await analyseSymbolFast(symbol, currentParams);
      setAnalysisData(enrichAnalysisData(data, currentParams));
      setLoading(false);
      // Phase 2 — fire ML stream in background
      _startMLStream(symbol, currentParams, data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Analysis failed';
      setError(msg);
      setLoading(false);
    }
  }, [_startMLStream]);

  const runAnalysis = useCallback(async (symbol) => {
    lastSymbolRef.current = symbol;
    lastCsvFileRef.current = null;
    await _doAnalysisFast(symbol, paramsRef.current, false);
  }, [_doAnalysisFast]);

  const rerun = useCallback(async () => {
    if (lastCsvFileRef.current) {
      setLoading(true);
      setError(null);
      setAnalysisData(null);
      setMlStatus(null);
      setParamsChanged(false);
      try {
        const data = await analyseCsv(lastCsvFileRef.current, paramsRef.current);
        setAnalysisData(enrichAnalysisData(data, paramsRef.current));
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'CSV analysis failed');
      } finally {
        setLoading(false);
      }
    } else if (lastSymbolRef.current) {
      await _doAnalysisFast(lastSymbolRef.current, paramsRef.current, true);
    }
  }, [_doAnalysisFast]);

  const runCsvAnalysis = useCallback(async (file) => {
    lastCsvFileRef.current = file;
    lastSymbolRef.current = null;
    setLoading(true);
    setError(null);
    setAnalysisData(null);
    setMlStatus(null);
    setActiveTab('overview');
    setParamsChanged(false);
    try {
      const data = await analyseCsv(file, paramsRef.current);
      setAnalysisData(enrichAnalysisData(data, paramsRef.current));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'CSV analysis failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(async (query) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const results = await searchStocks(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => setSearchResults([]), []);

  return {
    params,
    updateParam,
    analysisData,
    loading,
    mlStatus,
    error,
    searchResults,
    searchLoading,
    activeTab,
    setActiveTab,
    runAnalysis,
    runCsvAnalysis,
    rerun,
    paramsChanged,
    hasSymbol: !!lastSymbolRef.current || !!lastCsvFileRef.current,
    search,
    clearSearch,
  };
}

// Pure helper — mirrors server-side finalDecision weight logic
function _recomputeDecision(trend, rangeLevels, markov, mlProb) {
  if (!trend || !rangeLevels || !markov) return null;
  const trendN = (trend.score / 5) * 100;
  const rangeN = rangeLevels.bias === 'Bullish' ? 62 : 38;
  const markovN = markov.bias === 'Bullish' ? 65 : markov.bias === 'Bearish' ? 35 : 50;
  const weights = { trend: 0.3, range: 0.1, markov: 0.2, ml: 0.4 };
  const raw = weights.trend * trendN + weights.range * rangeN + weights.markov * markovN + weights.ml * mlProb * 100;
  const score = Math.min(100, Math.max(0, raw));
  let label, color;
  if (score >= 70) { label = 'Strong Bullish'; color = '#4ade80'; }
  else if (score >= 57) { label = 'Bullish'; color = '#86efac'; }
  else if (score >= 43) { label = 'Neutral'; color = '#fbbf24'; }
  else { label = 'Bearish'; color = '#f87171'; }
  return {
    score, label, color,
    explanations: [
      { label: 'Trend Score', value: trendN.toFixed(1), weight: '30%' },
      { label: 'Range Levels', value: rangeN.toFixed(1), weight: '10%' },
      { label: 'Markov', value: markovN.toFixed(1), weight: '20%' },
      { label: 'ML Model', value: (mlProb * 100).toFixed(1), weight: '40%' },
    ],
  };
}
