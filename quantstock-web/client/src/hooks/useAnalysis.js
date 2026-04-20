import { useState, useCallback, useRef } from 'react';
import { analyseSymbol, analyseCsv, searchStocks } from '../services/api';

const DEFAULT_PARAMS = {
  investment: 100000,
  targetPct: 10,
  slPct: 5,       // always kept at targetPct*0.5 unless user manually overrides
  atrMult: 1.5,
  enableMl: true,
  slManual: false, // true once user explicitly edits SL
};

export function useAnalysis() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [paramsChanged, setParamsChanged] = useState(false);

  // Keep a ref to the last symbol so rerun always has access
  const lastSymbolRef = useRef(null);
  const lastCsvFileRef = useRef(null);
  // Keep a ref to latest params so runAnalysis/rerun always use current values
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const updateParam = useCallback((key, value) => {
    setParams(prev => {
      const next = { ...prev, [key]: value };
      // Auto-derive SL from targetPct unless user has manually set SL
      if (key === 'targetPct' && !prev.slManual) {
        next.slPct = parseFloat((value * 0.5).toFixed(1));
      }
      if (key === 'slPct') {
        next.slManual = true;
      }
      return next;
    });
    setParamsChanged(true);
  }, []);

  const _doAnalysis = useCallback(async (symbol, currentParams, preserveTab = false) => {
    setLoading(true);
    setError(null);
    setAnalysisData(null);
    if (!preserveTab) setActiveTab('overview');
    setParamsChanged(false);
    try {
      const data = await analyseSymbol(symbol, currentParams);
      setAnalysisData(data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Analysis failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const runAnalysis = useCallback(async (symbol) => {
    lastSymbolRef.current = symbol;
    lastCsvFileRef.current = null;
    await _doAnalysis(symbol, paramsRef.current, false);
  }, [_doAnalysis]);

  // Re-run with current params (called from Re-analyse button)
  const rerun = useCallback(async () => {
    if (lastCsvFileRef.current) {
      setLoading(true);
      setError(null);
      setAnalysisData(null);
      setParamsChanged(false);
      try {
        const data = await analyseCsv(lastCsvFileRef.current, paramsRef.current);
        setAnalysisData(data);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'CSV analysis failed');
      } finally {
        setLoading(false);
      }
    } else if (lastSymbolRef.current) {
      await _doAnalysis(lastSymbolRef.current, paramsRef.current, true);
    }
  }, [_doAnalysis]);

  const runCsvAnalysis = useCallback(async (file) => {
    lastCsvFileRef.current = file;
    lastSymbolRef.current = null;
    setLoading(true);
    setError(null);
    setAnalysisData(null);
    setActiveTab('overview');
    setParamsChanged(false);
    try {
      const data = await analyseCsv(file, paramsRef.current);
      setAnalysisData(data);
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
