'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, RefreshCw } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  quickBooksAction?: React.ReactNode;
  actions?: React.ReactNode;
  searchPlaceholder?: string;
  onSearchChange?: (val: string) => void;
  onRefreshClick?: () => void;
  isRefreshing?: boolean;
}

export default function DashboardLayout({
  children,
  headerTitle,
  headerSubtitle,
  quickBooksAction,
  actions,
  searchPlaceholder = 'Search SKU, product name, or category...',
  onSearchChange,
  onRefreshClick,
  isRefreshing = false,
}: DashboardLayoutProps) {
  const [searchValue, setSearchValue] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-workspace)' }}>
      {/* ─── TOP UNIFIED HEADER BAR ─────────────────────────────────── */}
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          style={{
            maxWidth: '1700px',
            margin: '0 auto',
            padding: '12px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          {/* ─── Left: Combined Brand / Logo Area ─────────────────────── */}
          <Link
            href="/dashboard/inventory"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              flexShrink: 0,
            }}
          >
            {/* Wallcano Logo */}
            <img
              src="/brands/wallcano-logo.png"
              alt="Wallcano Tiles"
              style={{ height: '24px', width: 'auto', objectFit: 'contain' }}
            />

            {/* Vertical Divider */}
            <div style={{ height: '22px', width: '1px', background: 'var(--border-subtle)' }} />

            {/* Surfaces Logo */}
            <img
              src="/brands/surfaces-logo.png"
              alt="Surfaces Tiles"
              style={{ height: '18px', width: 'auto', objectFit: 'contain' }}
            />

            {/* Combined Brand Label */}
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '2px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--wallcano-dark)', letterSpacing: '0.04em', lineHeight: 1.1 }}>
                WALLCANO × SURFACES
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--surfaces-gold)', lineHeight: 1 }}>
                Tiles Inventory Platform
              </span>
            </div>
          </Link>

          {/* ─── Center: Search Bar ──────────────────────────────────── */}
          <div
            className="header-search-bar"
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              flex: '1 1 300px',
              maxWidth: '440px',
            }}
          >
            <Search
              size={15}
              color="#94A3B8"
              style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: '#F8FAFC',
                fontSize: '13px',
                color: 'var(--text-main)',
                outline: 'none',
                transition: 'all 0.15s ease',
              }}
              onFocus={(e) => {
                e.target.style.background = '#FFFFFF';
                e.target.style.borderColor = 'var(--surfaces-gold)';
                e.target.style.boxShadow = '0 0 0 3px rgba(184, 134, 11, 0.12)';
              }}
              onBlur={(e) => {
                e.target.style.background = '#F8FAFC';
                e.target.style.borderColor = 'var(--border-subtle)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* ─── Right: Actions & Sync Toolbar ────────────────────────── */}
          <div
            className="header-actions-group"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {/* QuickBooks Connect & Status Button */}
            {quickBooksAction}

            {/* Sync Now button */}
            {onRefreshClick && (
              <button
                type="button"
                onClick={onRefreshClick}
                disabled={isRefreshing}
                className="btn btn-secondary"
                title="Sync with QuickBooks"
                style={{ padding: '7px 12px', fontSize: '12px' }}
              >
                <RefreshCw
                  size={13}
                  className={isRefreshing ? 'animate-spin' : ''}
                />
                <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            )}

            {/* Custom action buttons (AI Copilot, Auto-Map, Restock, CSV Export) */}
            {actions}
          </div>
        </div>
      </header>

      {/* ─── MAIN PAGE CONTENT ──────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '24px 28px 48px', maxWidth: '1700px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {(headerTitle || headerSubtitle) && (
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            {headerTitle && (
              <h1
                style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  marginBottom: '6px',
                  background: 'linear-gradient(135deg, #0F172A 35%, #8C6D1F 75%, #B8860B 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'inline-block',
                }}
              >
                {headerTitle}
              </h1>
            )}
            {headerSubtitle && (
              <p
                style={{
                  fontSize: '13px',
                  color: '#6B5E4A',
                  fontWeight: 500,
                  maxWidth: '750px',
                  margin: '0 auto',
                  lineHeight: 1.5,
                }}
              >
                {typeof headerSubtitle === 'string' && headerSubtitle.includes('Wallcano & Surfaces Tiles') ? (
                  <>
                    {headerSubtitle.split('Wallcano & Surfaces Tiles')[0]}
                    <span style={{ fontWeight: 800, color: 'var(--wallcano-dark)' }}>Wallcano</span>
                    {' & '}
                    <span style={{ fontWeight: 800, color: 'var(--surfaces-gold)' }}>Surfaces Tiles</span>
                    {headerSubtitle.split('Wallcano & Surfaces Tiles')[1]}
                  </>
                ) : (
                  headerSubtitle
                )}
              </p>
            )}
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
