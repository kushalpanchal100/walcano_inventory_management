'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, User as UserIcon, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/dashboard/inventory');
    }
  }, [authLoading, isAuthenticated, router]);

  // Real-time password validation helpers
  const isLongEnough = password.length >= 8;
  const hasMixedChars = /[A-Z]/.test(password) && /[0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must contain at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-check.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register(fullName.trim(), email.trim(), password);
      if (res.success) {
        router.replace('/dashboard/inventory');
      } else {
        setErrorMessage(res.error || 'Registration failed. An account with this email may already exist.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during registration.');
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
        padding: '32px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle luxury ambient glows */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          left: '-100px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(184, 134, 11, 0.14) 0%, rgba(184, 134, 11, 0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid rgba(223, 191, 119, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 35px rgba(184, 134, 11, 0.12)',
          padding: '36px 36px',
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
            marginBottom: '24px',
          }}
        >
          <img
            src="/brands/wallcano-logo.png"
            alt="Wallcano Tiles"
            style={{ height: '30px', width: 'auto', objectFit: 'contain' }}
          />
          <div style={{ height: '24px', width: '1px', background: 'var(--border-subtle)' }} />
          <img
            src="/brands/surfaces-logo.png"
            alt="Surfaces Tiles"
            style={{ height: '20px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            Create Your Account
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
            Join the Wallcano & Surfaces Tiles inventory management team
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
              marginBottom: '18px',
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Full Name */}
          <div>
            <label
              htmlFor="reg-name"
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
              Full Name
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <UserIcon
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                id="reg-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Elena Vance"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  outline: 'none',
                  transition: 'all 0.15s ease',
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

          {/* Work Email */}
          <div>
            <label
              htmlFor="reg-email"
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
              Work Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                id="reg-email"
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
                  transition: 'all 0.15s ease',
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
            <label
              htmlFor="reg-password"
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
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 38px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  outline: 'none',
                  transition: 'all 0.15s ease',
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

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="reg-confirm-password"
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
              Confirm Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                id="reg-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type password"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  outline: 'none',
                  transition: 'all 0.15s ease',
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

          {/* Password Validation Checklist */}
          {password.length > 0 && (
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '8px',
                padding: '10px 14px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                fontSize: '11px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isLongEnough ? '#16A34A' : '#64748B' }}>
                <CheckCircle2 size={13} color={isLongEnough ? '#16A34A' : '#CBD5E1'} />
                <span>At least 8 characters</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: hasMixedChars ? '#16A34A' : '#64748B' }}>
                <CheckCircle2 size={13} color={hasMixedChars ? '#16A34A' : '#CBD5E1'} />
                <span>Contains uppercase letter & number</span>
              </div>
              {confirmPassword.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: passwordsMatch ? '#16A34A' : '#DC2626' }}>
                  <CheckCircle2 size={13} color={passwordsMatch ? '#16A34A' : '#FCA5A5'} />
                  <span>Passwords match</span>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '6px',
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
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer / Login Link */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '18px',
            borderTop: '1px solid #E2E8F0',
            textAlign: 'center',
            fontSize: '13px',
            color: '#64748B',
          }}
        >
          Already have an account?{' '}
          <Link
            href="/login"
            style={{
              color: 'var(--surfaces-gold)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </div>

        {/* Security Notice */}
        <div
          style={{
            marginTop: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#94A3B8',
          }}
        >
          <ShieldCheck size={13} color="#16A34A" />
          <span>New accounts are assigned authenticated staff access</span>
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
