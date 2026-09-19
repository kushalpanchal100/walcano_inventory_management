'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/dashboard/inventory';

  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(nextUrl);
    }
  }, [authLoading, isAuthenticated, nextUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        router.replace(nextUrl);
      } else {
        setErrorMessage(res.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected connection error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 45%, #0B1120 100%)',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle luxury geometric background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          right: '-150px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(184, 134, 11, 0.15) 0%, rgba(184, 134, 11, 0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-120px',
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid rgba(223, 191, 119, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 35px rgba(184, 134, 11, 0.12)',
          padding: '40px 36px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Brand Logos */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <img
            src="/brands/wallcano-logo.png"
            alt="Wallcano Tiles"
            style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
          />
          <div style={{ height: '26px', width: '1px', background: 'var(--border-subtle)' }} />
          <img
            src="/brands/surfaces-logo.png"
            alt="Surfaces Tiles"
            style={{ height: '22px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            Sign in to Platform
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
            Centralized inventory synchronization for Wallcano & Surfaces Tiles
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '20px',
              color: '#991B1B',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@wallcano.com"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={(e) => {
                  e.target.style.background = '#FFFFFF';
                  e.target.style.borderColor = 'var(--surfaces-gold)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(184, 134, 11, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.background = '#F8FAFC';
                  e.target.style.borderColor = '#CBD5E1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password */}
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
                htmlFor="login-password"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
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
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 38px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  outline: 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={(e) => {
                  e.target.style.background = '#FFFFFF';
                  e.target.style.borderColor = 'var(--surfaces-gold)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(184, 134, 11, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.background = '#F8FAFC';
                  e.target.style.borderColor = '#CBD5E1';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '8px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#FFFFFF',
              border: '1px solid var(--surfaces-gold)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
              transition: 'all 0.18s ease',
              opacity: isSubmitting ? 0.75 : 1,
            }}
          >
            {isSubmitting ? (
              <>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#FFFFFF',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer / Register Link */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid #E2E8F0',
            textAlign: 'center',
            fontSize: '13px',
            color: '#64748B',
          }}
        >
          Don't have an account?{' '}
          <Link
            href="/register"
            style={{
              color: 'var(--surfaces-gold)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Register here
          </Link>
        </div>

        {/* Security badge */}
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#94A3B8',
          }}
        >
          <ShieldCheck size={13} color="#16A34A" />
          <span>Encrypted with PostgreSQL & 256-bit JWT Sessions</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 45%, #0B1120 100%)',
          }}
        />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
