'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import DynamicBrandBackground from '@/components/DynamicBrandBackground';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard/inventory');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <DynamicBrandBackground style={{ padding: '20px' }}>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(223, 191, 119, 0.38)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 35px rgba(184, 134, 11, 0.16)',
          padding: '40px 48px',
          textAlign: 'center',
          maxWidth: '440px',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <img
            src="/brands/wallcano-group-logo.png"
            alt="Wallcano Group"
            style={{ height: '72px', width: 'auto', maxWidth: '220px', objectFit: 'contain', marginBottom: '8px' }}
          />
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--surfaces-gold)' }}>
            Wallcano &bull; Surfaces Tiles
          </div>
        </div>

        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid #E2E8F0',
            borderTopColor: 'var(--surfaces-gold)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}
        />

        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
          Wallcano &amp; Surfaces Inventory Platform
        </div>
        <p style={{ color: '#64748B', fontSize: '12px' }}>
          Initializing QuickBooks live synchronization...
        </p>
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
