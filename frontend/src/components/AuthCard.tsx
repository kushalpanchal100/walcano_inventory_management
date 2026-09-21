'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface AuthCardProps {
  initialTab?: 'login' | 'register';
}

export default function AuthCard({ initialTab = 'login' }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/dashboard/inventory';

  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isDark, mounted } = useTheme();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Password requirements
  const isLongEnough = regPassword.length >= 8;
  const hasMixedChars = /[A-Z]/.test(regPassword) && /[0-9]/.test(regPassword);
  const passwordsMatch = regPassword.length > 0 && regPassword === regConfirmPassword;

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(nextUrl);
    }
  }, [authLoading, isAuthenticated, nextUrl, router]);

  // Sync state if initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
    setLoginError('');
    setRegError('');
  }, [initialTab]);

  const handleTabSwitch = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    setLoginError('');
    setRegError('');
    // Update browser URL without full reload for easy bookmarking
    if (typeof window !== 'undefined') {
      const targetUrl = tab === 'login' ? '/login' : '/register';
      const search = searchParams.toString();
      const newPath = search ? `${targetUrl}?${search}` : targetUrl;
      window.history.replaceState(null, '', newPath);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please enter both email and password.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await login(loginEmail.trim(), loginPassword);
      if (res.success) {
        router.replace(nextUrl);
      } else {
        setLoginError(res.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim()) {
      setRegError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim()) {
      setRegError('Please enter a valid work email address.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Password must contain at least 8 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please re-check.');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await register(regName.trim(), regEmail.trim(), regPassword);
      if (res.success) {
        router.replace(nextUrl);
      } else {
        setRegError(res.error || 'Registration failed. An account with this email may already exist.');
      }
    } catch (err: any) {
      setRegError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsRegistering(false);
    }
  };

  const isDarkMode = mounted && isDark;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '460px',
        background: isDarkMode
          ? 'rgba(18, 24, 38, 0.94)'
          : 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '24px',
        border: isDarkMode
          ? '1px solid rgba(212, 175, 55, 0.35)'
          : '1px solid rgba(223, 191, 119, 0.45)',
        boxShadow: isDarkMode
          ? '0 25px 60px -12px rgba(0, 0, 0, 0.85), 0 0 40px rgba(212, 175, 55, 0.18)'
          : '0 25px 60px -12px rgba(15, 23, 42, 0.28), 0 0 35px rgba(184, 134, 11, 0.14)',
        padding: '36px 32px 32px',
        position: 'relative',
        zIndex: 10,
        transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      {/* Top Bar: Subtle Theme Toggle */}
      <div
        style={{
          position: 'absolute',
          top: '18px',
          right: '18px',
          zIndex: 15,
        }}
      >
        <ThemeToggle />
      </div>

      {/* ─── Prominent Brand Logo Header ─── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '26px',
          textAlign: 'center',
        }}
      >
        {/* Brand Logo with Ambient Halo */}
        <div
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 18px',
            borderRadius: '16px',
            marginBottom: '14px',
            transition: 'all 0.25s ease',
          }}
        >
          {/* Subtle Ambient Gold Glow behind logo */}
          <div
            style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '20px',
              background: isDarkMode
                ? 'radial-gradient(circle, rgba(212, 175, 55, 0.22) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(184, 134, 11, 0.14) 0%, transparent 70%)',
              filter: 'blur(10px)',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />

          {/* Wallcano Group Brand Logo */}
          <img
            src={
              isDarkMode
                ? '/brands/wallcano-group-logo-white.png'
                : '/brands/wallcano-group-logo.png'
            }
            alt="Wallcano Group"
            style={{
              height: '78px',
              width: 'auto',
              maxWidth: '240px',
              objectFit: 'contain',
              position: 'relative',
              zIndex: 2,
              filter: isDarkMode
                ? 'drop-shadow(0 2px 10px rgba(212, 175, 55, 0.25))'
                : 'drop-shadow(0 2px 6px rgba(15, 23, 42, 0.12))',
              transition: 'filter 0.25s ease',
            }}
          />
        </div>

        {/* Dual Brand Inventory Tagline */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: isDarkMode
              ? 'rgba(212, 175, 55, 0.12)'
              : 'rgba(184, 134, 11, 0.08)',
            border: isDarkMode
              ? '1px solid rgba(212, 175, 55, 0.3)'
              : '1px solid rgba(223, 191, 119, 0.35)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: isDarkMode ? '#FDE68A' : 'var(--surfaces-gold)',
            marginBottom: '6px',
          }}
        >
          <span>Wallcano</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span>Surfaces Tiles</span>
          <span style={{ opacity: 0.5 }}>•</span>
          <span style={{ color: isDarkMode ? '#CBD5E1' : '#475569' }}>Inventory</span>
        </div>

        <p
          style={{
            fontSize: '12px',
            color: isDarkMode ? '#94A3B8' : '#64748B',
            marginTop: '2px',
            lineHeight: 1.4,
          }}
        >
          Centralized Synchronization &amp; AI Analytics Platform
        </p>
      </div>

      {/* ─── Modern Segmented Tab Switcher (Sign In vs Create Account) ─── */}
      <div
        role="tablist"
        aria-label="Authentication Options"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
          background: isDarkMode ? 'rgba(15, 22, 36, 0.9)' : '#F1F5F9',
          padding: '4px',
          borderRadius: '14px',
          border: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid #E2E8F0',
          marginBottom: '24px',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'login'}
          onClick={() => handleTabSwitch('login')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: activeTab === 'login'
              ? isDarkMode
                ? '1px solid rgba(212, 175, 55, 0.4)'
                : '1px solid rgba(223, 191, 119, 0.5)'
              : '1px solid transparent',
            background: activeTab === 'login'
              ? isDarkMode
                ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
                : '#FFFFFF'
              : 'transparent',
            color: activeTab === 'login'
              ? isDarkMode
                ? '#FDE68A'
                : '#0F172A'
              : isDarkMode
              ? '#94A3B8'
              : '#64748B',
            fontSize: '13px',
            fontWeight: activeTab === 'login' ? 800 : 600,
            cursor: 'pointer',
            boxShadow: activeTab === 'login'
              ? isDarkMode
                ? '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 10px rgba(212, 175, 55, 0.2)'
                : '0 2px 8px rgba(15, 23, 42, 0.08)'
              : 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            outline: 'none',
          }}
        >
          <LogIn size={15} color={activeTab === 'login' ? (isDarkMode ? '#FDE68A' : 'var(--surfaces-gold)') : '#94A3B8'} />
          <span>Sign In</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'register'}
          onClick={() => handleTabSwitch('register')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: activeTab === 'register'
              ? isDarkMode
                ? '1px solid rgba(212, 175, 55, 0.4)'
                : '1px solid rgba(223, 191, 119, 0.5)'
              : '1px solid transparent',
            background: activeTab === 'register'
              ? isDarkMode
                ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
                : '#FFFFFF'
              : 'transparent',
            color: activeTab === 'register'
              ? isDarkMode
                ? '#FDE68A'
                : '#0F172A'
              : isDarkMode
              ? '#94A3B8'
              : '#64748B',
            fontSize: '13px',
            fontWeight: activeTab === 'register' ? 800 : 600,
            cursor: 'pointer',
            boxShadow: activeTab === 'register'
              ? isDarkMode
                ? '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 10px rgba(212, 175, 55, 0.2)'
                : '0 2px 8px rgba(15, 23, 42, 0.08)'
              : 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            outline: 'none',
          }}
        >
          <UserPlus size={15} color={activeTab === 'register' ? (isDarkMode ? '#FDE68A' : 'var(--surfaces-gold)') : '#94A3B8'} />
          <span>Create Account</span>
        </button>
      </div>

      {/* ─── TAB 1: SIGN IN FORM ─── */}
      {activeTab === 'login' && (
        <div key="login-tab-content" className="auth-tab-pane">
          {/* Error Alert */}
          {loginError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: isDarkMode ? 'rgba(220, 38, 38, 0.18)' : '#FEF2F2',
                border: isDarkMode ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #FCA5A5',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '18px',
                color: isDarkMode ? '#FCA5A5' : '#991B1B',
                fontSize: '13px',
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email Field */}
            <div>
              <label
                htmlFor="auth-login-email"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isDarkMode ? '#CBD5E1' : '#334155',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Work Email Address
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail
                  size={16}
                  color={isDarkMode ? '#64748B' : '#94A3B8'}
                  style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
                />
                <input
                  id="auth-login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@wallcano.com"
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: isDarkMode
                      ? '1px solid rgba(255, 255, 255, 0.14)'
                      : '1px solid #CBD5E1',
                    background: isDarkMode ? '#0F1624' : '#F8FAFC',
                    color: isDarkMode ? '#F1F5F9' : '#0F172A',
                    outline: 'none',
                    transition: 'all 0.18s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--surfaces-gold)';
                    e.target.style.boxShadow = isDarkMode
                      ? '0 0 0 3px rgba(212, 175, 55, 0.25)'
                      : '0 0 0 3px rgba(184, 134, 11, 0.16)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.14)' : '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <label
                  htmlFor="auth-login-password"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isDarkMode ? '#CBD5E1' : '#334155',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--surfaces-gold)',
                    textDecoration: 'none',
                  }}
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock
                  size={16}
                  color={isDarkMode ? '#64748B' : '#94A3B8'}
                  style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
                />
                <input
                  id="auth-login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 40px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: isDarkMode
                      ? '1px solid rgba(255, 255, 255, 0.14)'
                      : '1px solid #CBD5E1',
                    background: isDarkMode ? '#0F1624' : '#F8FAFC',
                    color: isDarkMode ? '#F1F5F9' : '#0F172A',
                    outline: 'none',
                    transition: 'all 0.18s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--surfaces-gold)';
                    e.target.style.boxShadow = isDarkMode
                      ? '0 0 0 3px rgba(212, 175, 55, 0.25)'
                      : '0 0 0 3px rgba(184, 134, 11, 0.16)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.14)' : '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isDarkMode ? '#94A3B8' : '#64748B',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Sign In Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                marginTop: '6px',
                padding: '13px 20px',
                background: isDarkMode
                  ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
                  : 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#FFFFFF',
                border: '1px solid var(--surfaces-gold)',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isDarkMode
                  ? '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 12px rgba(212, 175, 55, 0.25)'
                  : '0 4px 14px rgba(15, 23, 42, 0.25), 0 0 8px rgba(184, 134, 11, 0.15)',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: isLoggingIn ? 0.75 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoggingIn) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.borderColor = 'var(--surfaces-gold-light)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--surfaces-gold)';
              }}
            >
              {isLoggingIn ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#FFFFFF',
                      borderRadius: '50%',
                      animation: 'authSpin 0.8s linear infinite',
                    }}
                  />
                  <span>Authenticating credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Platform</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Prompt to switch to Create Account */}
          <div
            style={{
              marginTop: '22px',
              paddingTop: '16px',
              borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              textAlign: 'center',
              fontSize: '13px',
              color: isDarkMode ? '#94A3B8' : '#64748B',
            }}
          >
            New team member?{' '}
            <button
              type="button"
              onClick={() => handleTabSwitch('register')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--surfaces-gold)',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Create an account
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CREATE ACCOUNT FORM ─── */}
      {activeTab === 'register' && (
        <div key="register-tab-content" className="auth-tab-pane">
          {/* Error Alert */}
          {regError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                background: isDarkMode ? 'rgba(220, 38, 38, 0.18)' : '#FEF2F2',
                border: isDarkMode ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #FCA5A5',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '16px',
                color: isDarkMode ? '#FCA5A5' : '#991B1B',
                fontSize: '13px',
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{regError}</span>
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Full Name */}
            <div>
              <label
                htmlFor="auth-reg-name"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isDarkMode ? '#CBD5E1' : '#334155',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Full Name
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <UserIcon
                  size={16}
                  color={isDarkMode ? '#64748B' : '#94A3B8'}
                  style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
                />
                <input
                  id="auth-reg-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Elena Vance"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 40px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: isDarkMode
                      ? '1px solid rgba(255, 255, 255, 0.14)'
                      : '1px solid #CBD5E1',
                    background: isDarkMode ? '#0F1624' : '#F8FAFC',
                    color: isDarkMode ? '#F1F5F9' : '#0F172A',
                    outline: 'none',
                    transition: 'all 0.18s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--surfaces-gold)';
                    e.target.style.boxShadow = isDarkMode
                      ? '0 0 0 3px rgba(212, 175, 55, 0.25)'
                      : '0 0 0 3px rgba(184, 134, 11, 0.16)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.14)' : '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Work Email */}
            <div>
              <label
                htmlFor="auth-reg-email"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isDarkMode ? '#CBD5E1' : '#334155',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Work Email Address
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail
                  size={16}
                  color={isDarkMode ? '#64748B' : '#94A3B8'}
                  style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
                />
                <input
                  id="auth-reg-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@wallcano.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 40px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: isDarkMode
                      ? '1px solid rgba(255, 255, 255, 0.14)'
                      : '1px solid #CBD5E1',
                    background: isDarkMode ? '#0F1624' : '#F8FAFC',
                    color: isDarkMode ? '#F1F5F9' : '#0F172A',
                    outline: 'none',
                    transition: 'all 0.18s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--surfaces-gold)';
                    e.target.style.boxShadow = isDarkMode
                      ? '0 0 0 3px rgba(212, 175, 55, 0.25)'
                      : '0 0 0 3px rgba(184, 134, 11, 0.16)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.14)' : '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="auth-reg-password"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isDarkMode ? '#CBD5E1' : '#334155',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock
                  size={16}
                  color={isDarkMode ? '#64748B' : '#94A3B8'}
                  style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
                />
                <input
                  id="auth-reg-password"
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 40px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: isDarkMode
                      ? '1px solid rgba(255, 255, 255, 0.14)'
                      : '1px solid #CBD5E1',
                    background: isDarkMode ? '#0F1624' : '#F8FAFC',
                    color: isDarkMode ? '#F1F5F9' : '#0F172A',
                    outline: 'none',
                    transition: 'all 0.18s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--surfaces-gold)';
                    e.target.style.boxShadow = isDarkMode
                      ? '0 0 0 3px rgba(212, 175, 55, 0.25)'
                      : '0 0 0 3px rgba(184, 134, 11, 0.16)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.14)' : '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isDarkMode ? '#94A3B8' : '#64748B',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="auth-reg-confirm-password"
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isDarkMode ? '#CBD5E1' : '#334155',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Confirm Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock
                  size={16}
                  color={isDarkMode ? '#64748B' : '#94A3B8'}
                  style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
                />
                <input
                  id="auth-reg-confirm-password"
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-type your password"
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 40px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: isDarkMode
                      ? '1px solid rgba(255, 255, 255, 0.14)'
                      : '1px solid #CBD5E1',
                    background: isDarkMode ? '#0F1624' : '#F8FAFC',
                    color: isDarkMode ? '#F1F5F9' : '#0F172A',
                    outline: 'none',
                    transition: 'all 0.18s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--surfaces-gold)';
                    e.target.style.boxShadow = isDarkMode
                      ? '0 0 0 3px rgba(212, 175, 55, 0.25)'
                      : '0 0 0 3px rgba(184, 134, 11, 0.16)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.14)' : '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password Validation Checklist */}
            {regPassword.length > 0 && (
              <div
                style={{
                  background: isDarkMode ? 'rgba(15, 22, 36, 0.8)' : '#F8FAFC',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isLongEnough ? '#16A34A' : (isDarkMode ? '#94A3B8' : '#64748B') }}>
                  <CheckCircle2 size={13} color={isLongEnough ? '#16A34A' : (isDarkMode ? '#475569' : '#CBD5E1')} />
                  <span>At least 8 characters</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasMixedChars ? '#16A34A' : (isDarkMode ? '#94A3B8' : '#64748B') }}>
                  <CheckCircle2 size={13} color={hasMixedChars ? '#16A34A' : (isDarkMode ? '#475569' : '#CBD5E1')} />
                  <span>Contains uppercase letter &amp; number</span>
                </div>
                {regConfirmPassword.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordsMatch ? '#16A34A' : '#DC2626' }}>
                    <CheckCircle2 size={13} color={passwordsMatch ? '#16A34A' : '#FCA5A5'} />
                    <span>Passwords match</span>
                  </div>
                )}
              </div>
            )}

            {/* Register Submit Button */}
            <button
              type="submit"
              disabled={isRegistering}
              style={{
                marginTop: '4px',
                padding: '13px 20px',
                background: isDarkMode
                  ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
                  : 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#FFFFFF',
                border: '1px solid var(--surfaces-gold)',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: isRegistering ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isDarkMode
                  ? '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 12px rgba(212, 175, 55, 0.25)'
                  : '0 4px 14px rgba(15, 23, 42, 0.25), 0 0 8px rgba(184, 134, 11, 0.15)',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                opacity: isRegistering ? 0.75 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isRegistering) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.borderColor = 'var(--surfaces-gold-light)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--surfaces-gold)';
              }}
            >
              {isRegistering ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: '#FFFFFF',
                      borderRadius: '50%',
                      animation: 'authSpin 0.8s linear infinite',
                    }}
                  />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Team Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Prompt to switch to Sign In */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #E2E8F0',
              textAlign: 'center',
              fontSize: '13px',
              color: isDarkMode ? '#94A3B8' : '#64748B',
            }}
          >
            Already registered?{' '}
            <button
              type="button"
              onClick={() => handleTabSwitch('login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--surfaces-gold)',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Sign in here
            </button>
          </div>
        </div>
      )}

      {/* Security & Verification Badges */}
      <div
        style={{
          marginTop: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '11px',
          color: isDarkMode ? '#94A3B8' : '#64748B',
        }}
      >
        <ShieldCheck size={14} color="#16A34A" />
        <span>Enterprise RBAC • 256-bit Encrypted Session</span>
      </div>

      <style jsx>{`
        @keyframes authSpin {
          to {
            transform: rotate(360deg);
          }
        }
        .auth-tab-pane {
          animation: authFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes authFadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
