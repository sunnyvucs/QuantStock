import React from 'react';

function SkeletonBlock({ h = 20, w = '100%', style }) {
  return (
    <div
      className="skeleton"
      style={{ height: h, width: w, borderRadius: 8, ...style }}
    />
  );
}

export default function LoadingOverlay({ message = 'Analysing stock...' }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      {/* Spinner */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid var(--surface-3)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {message}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 4 }}>
          Fetching data, computing indicators & running models
        </div>
      </div>
      {/* Skeleton preview */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          padding: '0 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <SkeletonBlock h={60} w="25%" />
          <SkeletonBlock h={60} w="25%" />
          <SkeletonBlock h={60} w="25%" />
          <SkeletonBlock h={60} w="25%" />
        </div>
        <SkeletonBlock h={180} />
        <SkeletonBlock h={40} />
        <SkeletonBlock h={40} w="70%" />
      </div>
    </div>
  );
}
