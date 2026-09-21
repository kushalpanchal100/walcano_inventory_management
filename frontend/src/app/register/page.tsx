'use client';

import React, { Suspense } from 'react';
import DynamicBrandBackground from '@/components/DynamicBrandBackground';
import AuthCard from '@/components/AuthCard';

function RegisterContent() {
  return (
    <DynamicBrandBackground style={{ padding: '32px 16px', minHeight: '100vh' }}>
      <AuthCard initialTab="register" />

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

export default function RegisterPage() {
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
      <RegisterContent />
    </Suspense>
  );
}
