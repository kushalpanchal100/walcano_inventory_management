'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import DynamicBrandBackground from '@/components/DynamicBrandBackground';

import AuthCard from '@/components/AuthCard';

function LoginContent() {
  return (
    <DynamicBrandBackground style={{ padding: '32px 16px', minHeight: '100vh' }}>
      <AuthCard initialTab="login" />

      {/* Enterprise Platform Badge */}
      <div
        style={{
          marginTop: '24px',
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
        <span>Enterprise Inventory Platform</span>
      </div>
    </DynamicBrandBackground>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <DynamicBrandBackground>
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              borderTopColor: 'var(--surfaces-gold)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </DynamicBrandBackground>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
