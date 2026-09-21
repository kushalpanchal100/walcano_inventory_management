'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, Sliders, ChevronDown } from 'lucide-react';
import { ShopifyStatus, getShopifyStatus } from '@/lib/api';
import { ShopifyBagIcon } from './ShopifyIntegrationModal';

interface ShopifyConnectButtonProps {
  onOpenModal: () => void;
  statusRefreshKey?: number;
}

export default function ShopifyConnectButton({
  onOpenModal,
  statusRefreshKey = 0,
}: ShopifyConnectButtonProps) {
  const [status, setStatus] = useState<ShopifyStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchStatus() {
      try {
        const data = await getShopifyStatus();
        if (isMounted) setStatus(data);
      } catch {
        // ignore error
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchStatus();
    return () => {
      isMounted = false;
    };
  }, [statusRefreshKey]);

  const isLive = Boolean(status?.connected && !status?.is_mock);
  const locationLabel = status?.location_name || '123 William Street';

  return (
    <button
      type="button"
      onClick={onOpenModal}
      className="btn btn-secondary"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '6px 12px',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        borderColor: isLive ? 'rgba(22, 163, 74, 0.4)' : 'rgba(149, 191, 71, 0.4)',
        background: isLive ? 'rgba(22, 163, 74, 0.08)' : 'rgba(149, 191, 71, 0.08)',
        borderRadius: '8px',
        cursor: 'pointer',
      }}
      title={`Shopify Store: ${status?.shop_name || 'Sandbox'} | Location: ${locationLabel}`}
    >
      <ShopifyBagIcon size={15} />
      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Shopify</span>
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          padding: '1px 5px',
          borderRadius: '999px',
          background: isLive ? '#16A34A' : '#108A00',
          color: '#FFFFFF',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {isLive ? 'Live' : 'Sync'}
      </span>
      <span
        style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          maxWidth: '90px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {locationLabel.split(' ')[0]}...
      </span>
      <Sliders size={11} style={{ color: 'var(--text-muted)' }} />
    </button>
  );
}
