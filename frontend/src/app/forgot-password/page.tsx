'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Mail, ArrowRight, ArrowLeft, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import DynamicBrandBackground from '@/components/DynamicBrandBackground';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await forgotPassword(email.trim());
      if (res.success) {
        setSuccessMessage(
          res.message || 'If that email is registered, a 6-digit verification code has been dispatched.'
        );
        // Automatically route to reset page with email filled in after 1.5s
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
        }, 1200);
      } else {
        setErrorMessage(res.error || 'Unable to process reset request. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DynamicBrandBackground style={{ padding: '24px' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(223, 191, 119, 0.38)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 35px rgba(184, 134, 11, 0.16)',
          padding: '40px 36px',
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
            marginBottom: '28px',
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

        {/* Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: '#FEF9EE',
              border: '1px solid #DFBF77',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--surfaces-gold)',
            }}
          >
            <KeyRound size={22} />
          </div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            Forgot Password
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
            Enter your account email and we will send a 6-digit one-time verification code (OTP) to reset your password.
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
              marginBottom: '20px',
              color: '#166534',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700 }}>Verification Code Sent</div>
              <div>{successMessage}</div>
              <div style={{ fontSize: '12px', marginTop: '4px', color: '#15803D' }}>Redirecting to code entry...</div>
            </div>
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
          <div>
            <label
              htmlFor="forgot-email"
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
              Your Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                id="forgot-email"
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

          <button
            type="submit"
            disabled={isSubmitting || !!successMessage}
            style={{
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
                <span>Sending Code...</span>
              </>
            ) : (
              <>
                <span>Send 6-Digit OTP</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
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
            <span>Return to Sign In</span>
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
