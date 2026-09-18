'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  LogOut,
  Building2,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { QuickBooksStatus } from '@/lib/api';

interface QuickBooksConnectButtonProps {
  isConnected: boolean;
  qboStatus?: QuickBooksStatus | null;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
}

export function QuickBooksLogoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <circle cx="16" cy="16" r="16" fill="#2CA01C" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 5.5C10.201 5.5 5.5 10.201 5.5 16S10.201 26.5 16 26.5 26.5 21.799 26.5 16 21.799 5.5 16 5.5zm-1.05 14.7c-2.32 0-4.2-1.88-4.2-4.2 0-2.32 1.88-4.2 4.2-4.2.735 0 1.426.189 2.026.52V9.7h1.4v4.04c.483.473.774 1.127.774 1.86 0 2.32-1.88 4.2-4.2 4.2zm0-2.1a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2zm2.1-6.3c2.32 0 4.2 1.88 4.2 4.2 0 2.32-1.88 4.2-4.2 4.2-.735 0-1.426-.189-2.026-.52v2.62h-1.4v-4.04a2.98 2.98 0 0 1-.774-1.86c0-2.32 1.88-4.2 4.2-4.2zm0 2.1a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export default function QuickBooksConnectButton({
  isConnected,
  qboStatus,
  isLoading = false,
  isRefreshing = false,
  onConnect,
  onDisconnect,
  onSync,
}: QuickBooksConnectButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleConnectClick = () => {
    setIsConnecting(true);
    onConnect();
    // Safety reset in case popup was blocked or user stayed on page
    setTimeout(() => setIsConnecting(false), 4000);
  };

  const handleDisconnectClick = async () => {
    if (!onDisconnect) return;
    setIsDisconnecting(true);
    try {
      await onDisconnect();
      setIsOpen(false);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // ─── STATE 1: NOT CONNECTED (Prominent Connect QuickBooks CTA) ─────────────
  if (!isConnected) {
    return (
      <button
        type="button"
        id="qbo-connect-top-btn"
        onClick={handleConnectClick}
        disabled={isLoading || isConnecting}
        className="btn"
        title="Connect to Intuit QuickBooks Online"
        style={{
          background: 'linear-gradient(135deg, #2CA01C 0%, #238316 100%)',
          color: '#FFFFFF',
          border: '1px solid #1E7A13',
          boxShadow: '0 2px 8px rgba(44, 160, 28, 0.35)',
          padding: '7px 14px',
          fontSize: '13px',
          fontWeight: 700,
          borderRadius: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          cursor: isConnecting ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(44, 160, 28, 0.45)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(44, 160, 28, 0.35)';
        }}
      >
        <QuickBooksLogoIcon size={18} />
        <span>{isConnecting ? 'Connecting to Intuit...' : 'Connect QuickBooks'}</span>
        <ExternalLink size={13} style={{ opacity: 0.85 }} />
      </button>
    );
  }

  // ─── STATE 2: CONNECTED (Interactive Status Pill + Popover) ────────────────
  const companyName = qboStatus?.company_name || 'Wallcano Tiles Ltd';
  const environment = qboStatus?.environment || 'production';
  const realmId = qboStatus?.realm_id || '';

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        id="qbo-connected-status-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="btn"
        title="QuickBooks Online is connected. Click to view status."
        style={{
          background: '#F0FDF4',
          color: '#166534',
          border: '1px solid #BBF7D0',
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: 700,
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(22, 101, 52, 0.08)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#DCFCE7';
          e.currentTarget.style.borderColor = '#86EFAC';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#F0FDF4';
          e.currentTarget.style.borderColor = '#BBF7D0';
        }}
      >
        <QuickBooksLogoIcon size={16} />
        
        {/* Pulsing Green Live Dot */}
        <span style={{ position: 'relative', display: 'flex', height: '8px', width: '8px' }}>
          <span
            style={{
              position: 'absolute',
              height: '100%',
              width: '100%',
              borderRadius: '9999px',
              backgroundColor: '#22C55E',
              opacity: 0.75,
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
          <span
            style={{
              position: 'relative',
              display: 'inline-flex',
              borderRadius: '9999px',
              height: '8px',
              width: '8px',
              backgroundColor: '#16A34A',
            }}
          />
        </span>

        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {companyName}
        </span>

        <ChevronDown
          size={13}
          color="#166534"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {/* ─── DROPDOWN DETAILS CARD ────────────────────────────────────────── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '320px',
            background: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05)',
            border: '1px solid #E2E8F0',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* Card Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
              padding: '14px 16px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QuickBooksLogoIcon size={20} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em' }}>
                  QuickBooks Online
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} />
                  <span>Live Production Sync</span>
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '2px 7px',
                borderRadius: '6px',
                letterSpacing: '0.05em',
              }}
            >
              {environment}
            </span>
          </div>

          {/* Body details */}
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                  Connected Company
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Building2 size={14} color="#15803D" />
                  <span>{companyName}</span>
                </div>
              </div>

              {realmId && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                    QuickBooks Realm ID
                  </div>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#334155', marginTop: '1px' }}>
                    {realmId}
                  </div>
                </div>
              )}

              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  border: '1px solid #E2E8F0',
                  fontSize: '11px',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Radio size={13} color="#16A34A" />
                <span>Authoritative source for real-time inventory</span>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '14px 0 10px' }} />

            {/* Actions Inside Popover */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {onSync && (
                <button
                  type="button"
                  onClick={() => {
                    onSync();
                    setIsOpen(false);
                  }}
                  disabled={isRefreshing}
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '7px 10px', fontSize: '12px' }}
                >
                  <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>{isRefreshing ? 'Syncing...' : 'Sync Live Inventory'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  handleConnectClick();
                }}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '7px 10px', fontSize: '12px' }}
              >
                <ExternalLink size={13} />
                <span>Reconnect / Switch QBO Account</span>
              </button>

              {onDisconnect && (
                <button
                  type="button"
                  onClick={handleDisconnectClick}
                  disabled={isDisconnecting}
                  className="btn"
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '7px 10px',
                    fontSize: '12px',
                    color: '#DC2626',
                    background: '#FEF2F2',
                    border: '1px solid #FEE2E2',
                  }}
                >
                  <LogOut size={13} />
                  <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect QuickBooks'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
