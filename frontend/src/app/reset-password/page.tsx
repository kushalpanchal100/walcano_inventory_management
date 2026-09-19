'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, KeyRound, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import DynamicBrandBackground from '@/components/DynamicBrandBackground';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const { resetPassword, forgotPassword } = useAuth();

  const [email, setEmail] = useState(emailParam);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    if (emailParam && !email) {
      setEmail(emailParam);
    }
  }, [emailParam, email]);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Restrict to max 6 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(cleaned);
  };

  const handleResendOtp = async () => {
    if (!email.trim()) {
      setErrorMessage('Please provide your email address to resend the code.');
      return;
    }
    setIsResending(true);
    setResendStatus('');
    try {
      const res = await forgotPassword(email.trim());
      if (res.success) {
        setResendStatus('A new 6-digit verification code was sent to your email.');
      } else {
        setErrorMessage(res.error || 'Failed to resend code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error requesting code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setResendStatus('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must contain at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword(email.trim(), otpCode.trim(), newPassword);
      if (res.success) {
        setSuccessMessage(res.message || 'Password reset successfully! Redirecting to Sign In...');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        setErrorMessage(res.error || 'Password reset failed. Code may be expired or incorrect.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DynamicBrandBackground style={{ padding: '24px' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(223, 191, 119, 0.38)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 35px rgba(184, 134, 11, 0.16)',
          padding: '38px 36px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
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
            Reset Your Password
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.4 }}>
            Enter the 6-digit OTP code sent to your email along with your new password
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: '#F0FDF4',
              border: '1px solid #86EFAC',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '18px',
              color: '#166534',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700 }}>Success!</div>
              <div>{successMessage}</div>
            </div>
          </div>
        )}

        {/* Resend Status Banner */}
        {resendStatus && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FEF9EE',
              border: '1px solid #DFBF77',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '16px',
              color: '#785910',
              fontSize: '12px',
            }}
          >
            <CheckCircle2 size={15} color="#B8860B" />
            <span>{resendStatus}</span>
          </div>
        )}

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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email */}
          <div>
            <label
              htmlFor="reset-email"
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
                id="reset-email"
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
                }}
              />
            </div>
          </div>

          {/* 6-Digit OTP */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label
                htmlFor="reset-otp"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                6-Digit Security Code (OTP)
              </label>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--surfaces-gold)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isResending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
              >
                <RefreshCw size={12} className={isResending ? 'animate-spin' : ''} />
                <span>{isResending ? 'Resending...' : 'Resend Code'}</span>
              </button>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <KeyRound
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                id="reset-otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={otpCode}
                onChange={handleOtpChange}
                placeholder="• • • • • •"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 38px',
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '6px',
                  fontFamily: 'monospace',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#FEFDF8',
                  color: '#0F172A',
                  outline: 'none',
                  textAlign: 'center',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--surfaces-gold)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(184, 134, 11, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#CBD5E1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="reset-new-password"
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
              New Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
              htmlFor="reset-confirm-password"
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
              Confirm New Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                id="reset-confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  color: '#0F172A',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !!successMessage}
            style={{
              marginTop: '4px',
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#FFFFFF',
              border: '1px solid var(--surfaces-gold)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isSubmitting || !!successMessage ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
              opacity: isSubmitting || !!successMessage ? 0.75 : 1,
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
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <span>Save New Password</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Back Link */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '18px',
            borderTop: '1px solid #E2E8F0',
            textAlign: 'center',
          }}
        >
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#64748B',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} />
            <span>Cancel and Return to Sign In</span>
          </Link>
        </div>
      </div>

      {/* Enterprise Platform Badge */}
      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.45)',
          letterSpacing: '0.02em',
        }}
      >
        <span style={{ color: 'var(--surfaces-gold)', fontWeight: 600 }}>Wallcano</span>
        <span>•</span>
        <span style={{ color: 'var(--surfaces-gold-light)', fontWeight: 600 }}>Surfaces Tiles</span>
        <span>•</span>
        <span>Enterprise Inventory</span>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </DynamicBrandBackground>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <DynamicBrandBackground>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              borderTopColor: 'var(--surfaces-gold)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </DynamicBrandBackground>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
