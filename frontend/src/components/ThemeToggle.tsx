'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme, isDark, mounted } = useTheme();

  // Prevent hydration mismatch by rendering a stable placeholder state before mount
  if (!mounted) {
    return (
      <div
        style={{
          width: '78px',
          height: '34px',
          borderRadius: '20px',
          background: 'var(--bg-subtle, #F1F5F9)',
          border: '1px solid var(--border-subtle, #E2E8F0)',
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Current: ${isDark ? 'Dark (Obsidian)' : 'Light (Ceramic)'}. Click to switch to ${isDark ? 'Light' : 'Dark'} mode`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px 4px 6px',
        borderRadius: '20px',
        border: `1px solid ${isDark ? 'rgba(217, 155, 39, 0.45)' : 'var(--border-subtle)'}`,
        background: isDark
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))'
          : '#FFFFFF',
        cursor: 'pointer',
        boxShadow: isDark
          ? '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 10px rgba(184, 134, 11, 0.2)'
          : '0 1px 3px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = isDark ? 'var(--surfaces-gold)' : 'var(--surfaces-border)';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = isDark
          ? '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 14px rgba(197, 155, 39, 0.35)'
          : '0 2px 6px rgba(0, 0, 0, 0.08), 0 0 8px rgba(184, 134, 11, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isDark ? 'rgba(217, 155, 39, 0.45)' : 'var(--border-subtle)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isDark
          ? '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 10px rgba(184, 134, 11, 0.2)'
          : '0 1px 3px rgba(0, 0, 0, 0.04)';
      }}
    >
      {/* Visual Icon Knob */}
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isDark
            ? 'linear-gradient(135deg, #DFBF77 0%, #B8860B 100%)'
            : 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: isDark ? '#0F172A' : '#FBBF24',
          boxShadow: isDark
            ? '0 0 8px rgba(223, 191, 119, 0.5)'
            : '0 1px 3px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isDark ? 'rotate(360deg)' : 'rotate(0deg)',
          flexShrink: 0,
        }}
      >
        {isDark ? (
          <Sun size={13} strokeWidth={2.5} style={{ animation: 'spinSlow 12s linear infinite' }} />
        ) : (
          <Moon size={12} strokeWidth={2.5} />
        )}
      </div>

      {/* Label Text */}
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.03em',
          color: isDark ? '#F1F5F9' : '#334155',
          textTransform: 'uppercase',
          paddingRight: '2px',
          transition: 'color 0.2s ease',
        }}
      >
        {isDark ? 'Dark' : 'Light'}
      </span>

      <style jsx>{`
        @keyframes spinSlow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
}
