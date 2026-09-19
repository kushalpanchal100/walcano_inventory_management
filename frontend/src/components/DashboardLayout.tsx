'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, RefreshCw, LogOut, User as UserIcon, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import DynamicBrandBackground from '@/components/DynamicBrandBackground';

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
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [dashboardTheme, setDashboardTheme] = useState<'dark' | 'light'>('dark');

  // Load persisted theme preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('walcano_dashboard_theme');
      if (saved === 'light' || saved === 'dark') {
        setDashboardTheme(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleDashboardTheme = () => {
    setDashboardTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('walcano_dashboard_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Route protection guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard/inventory')}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Loading state while verifying token
  if (isLoading) {
    return (
      <DynamicBrandBackground variant={dashboardTheme}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '32px 40px',
            borderRadius: '18px',
            border: '1px solid rgba(223, 191, 119, 0.35)',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 25px rgba(184, 134, 11, 0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <img
              src="/brands/wallcano-logo.png"
              alt="Wallcano Tiles"
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
            />
            <div style={{ height: '24px', width: '1px', background: 'var(--border-subtle)' }} />
            <img
              src="/brands/surfaces-logo.png"
              alt="Surfaces Tiles"
              style={{ height: '22px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(226, 232, 240, 0.8)',
              borderTopColor: 'var(--surfaces-gold)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 600 }}>
            Authenticating platform session...
          </span>
        </div>
      </DynamicBrandBackground>
    );
  }

  // Not authenticated fallback
  if (!isAuthenticated) {
    return null;
  }

  // Generate initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <DynamicBrandBackground variant={dashboardTheme} isFixed={true} contentAlign="stretch">
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
        {/* ─── TOP UNIFIED HEADER BAR ─────────────────────────────────── */}
        <header
          style={{
            background: dashboardTheme === 'dark' ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.90)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: dashboardTheme === 'dark' ? '1px solid rgba(223, 191, 119, 0.35)' : '1px solid var(--border-subtle)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            boxShadow: dashboardTheme === 'dark' ? '0 4px 25px rgba(0, 0, 0, 0.25)' : '0 1px 4px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.25s ease',
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

            {/* Custom action buttons (AI Copilot, Restock, CSV Export) */}
            {actions}

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleDashboardTheme}
              title={dashboardTheme === 'dark' ? 'Switch to Executive Light Theme' : 'Switch to Luxury Dark Theme'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 11px',
                borderRadius: '8px',
                border: dashboardTheme === 'dark' ? '1px solid rgba(223, 191, 119, 0.4)' : '1px solid var(--border-subtle)',
                background: dashboardTheme === 'dark' ? '#0F172A' : '#FFFFFF',
                color: dashboardTheme === 'dark' ? '#DFBF77' : '#475569',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: dashboardTheme === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.25)' : 'var(--shadow-xs)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                if (dashboardTheme === 'dark') {
                  e.currentTarget.style.borderColor = 'var(--surfaces-gold)';
                  e.currentTarget.style.boxShadow = '0 3px 10px rgba(184, 134, 11, 0.25)';
                } else {
                  e.currentTarget.style.borderColor = 'var(--surfaces-border)';
                  e.currentTarget.style.background = '#FEF9EE';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                if (dashboardTheme === 'dark') {
                  e.currentTarget.style.borderColor = 'rgba(223, 191, 119, 0.4)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.25)';
                } else {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = '#FFFFFF';
                }
              }}
            >
              {dashboardTheme === 'dark' ? (
                <>
                  <Moon size={13} color="#DFBF77" />
                  <span style={{ fontSize: '11px', letterSpacing: '0.02em' }}>Dark Theme</span>
                </>
              ) : (
                <>
                  <Sun size={13} color="#D97706" />
                  <span style={{ fontSize: '11px', letterSpacing: '0.02em' }}>Light Theme</span>
                </>
              )}
            </button>

            {/* User Profile & Sign Out */}
            {user && (
              <>
                <div style={{ height: '24px', width: '1px', background: 'var(--border-subtle)', margin: '0 4px' }} />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '4px 10px 4px 6px',
                    borderRadius: '20px',
                    background: '#F8FAFC',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Initials Avatar */}
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#0F172A',
                      color: 'var(--surfaces-gold)',
                      border: '1.5px solid var(--surfaces-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(user.full_name)}
                  </div>

                  {/* User Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#0F172A',
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={user.full_name}
                    >
                      {user.full_name}
                    </span>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: user.role === 'admin' ? '#B8860B' : '#64748B',
                      }}
                    >
                      {user.role === 'admin' ? 'Administrator' : 'Staff'}
                    </span>
                  </div>

                  {/* Sign Out Button */}
                  <button
                    type="button"
                    onClick={logout}
                    title="Sign Out"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      marginLeft: '2px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#EF4444';
                      e.currentTarget.style.background = '#FEE2E2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#94A3B8';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </>
            )}
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
                  fontSize: '28px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  marginBottom: '6px',
                  background:
                    dashboardTheme === 'dark'
                      ? 'linear-gradient(135deg, #FFFFFF 25%, #F8FAFC 55%, #DFBF77 85%, #B8860B 100%)'
                      : 'linear-gradient(135deg, #0F172A 35%, #8C6D1F 75%, #B8860B 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: 'inline-block',
                  filter: dashboardTheme === 'dark' ? 'drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5))' : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                {headerTitle}
              </h1>
            )}
            {headerSubtitle && (
              <p
                style={{
                  fontSize: '13px',
                  color: dashboardTheme === 'dark' ? 'rgba(255, 255, 255, 0.82)' : '#6B5E4A',
                  textShadow: dashboardTheme === 'dark' ? '0 1px 4px rgba(0, 0, 0, 0.6)' : 'none',
                  fontWeight: 500,
                  maxWidth: '750px',
                  margin: '0 auto',
                  lineHeight: 1.5,
                  transition: 'color 0.25s ease',
                }}
              >
                {typeof headerSubtitle === 'string' && headerSubtitle.includes('Wallcano & Surfaces Tiles') ? (
                  <>
                    {headerSubtitle.split('Wallcano & Surfaces Tiles')[0]}
                    <span style={{ fontWeight: 800, color: dashboardTheme === 'dark' ? '#FFFFFF' : 'var(--wallcano-dark)' }}>
                      Wallcano
                    </span>
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
    </DynamicBrandBackground>
  );
}
