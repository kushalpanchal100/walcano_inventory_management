'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Building2,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  Download,
} from 'lucide-react';
import {
  ShopifyStatus,
  ShopifyLocation,
  getShopifyStatus,
  connectShopify,
  disconnectShopify,
  getShopifyLocations,
  setShopifyLocation,
  syncAllProductsToShopify,
  QuickBooksInventoryItem,
  ShopifyBulkSyncResult,
} from '@/lib/api';

export function ShopifyBagIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M17.5 7.5V6C17.5 3.79086 15.7091 2 13.5 2H10.5C8.29086 2 6.5 3.79086 6.5 6V7.5M3.5 7.5H20.5L19.5 21.5H4.5L3.5 7.5Z"
        stroke="#95BF47"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="2" fill="#95BF47" />
    </svg>
  );
}

interface ShopifyIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItems?: QuickBooksInventoryItem[];
  onOpenCsvExport?: () => void;
  onSyncComplete?: () => void;
}

export default function ShopifyIntegrationModal({
  isOpen,
  onClose,
  inventoryItems = [],
  onOpenCsvExport,
  onSyncComplete,
}: ShopifyIntegrationModalProps) {
  const [status, setStatus] = useState<ShopifyStatus | null>(null);
  const [locations, setLocations] = useState<ShopifyLocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<ShopifyBulkSyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [shopUrl, setShopUrl] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [apiVersion, setApiVersion] = useState<string>('2024-04');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedLocationName, setSelectedLocationName] = useState<string>('123 William Street');
  const [autoSync, setAutoSync] = useState<boolean>(true);

  // Load status & locations on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSyncResult(null);

    async function loadData() {
      try {
        const [stat, locs] = await Promise.all([
          getShopifyStatus(),
          getShopifyLocations(),
        ]);
        if (!isMounted) return;

        setStatus(stat);
        setLocations(locs);

        if (stat.shop_url) setShopUrl(stat.shop_url);
        if (stat.api_version) setApiVersion(stat.api_version);
        if (stat.auto_sync !== undefined) setAutoSync(stat.auto_sync);

        const activeLoc =
          locs.find((l) => l.id === stat.location_id) ||
          locs.find((l) => l.name === stat.location_name) ||
          locs[0];

        if (activeLoc) {
          setSelectedLocationId(activeLoc.id);
          setSelectedLocationName(activeLoc.name);
        } else if (stat.location_name) {
          setSelectedLocationName(stat.location_name);
        }
      } catch (err: any) {
        if (isMounted) setErrorMessage(err.message || 'Failed to load Shopify data.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopUrl.trim()) {
      setErrorMessage('Please enter your Shopify store domain.');
      return;
    }
    if (!accessToken.trim()) {
      setErrorMessage('Please enter your Shopify Admin API Access Token (shpat_...).');
      return;
    }
    if (accessToken.trim().startsWith('shpss_')) {
      setErrorMessage(
        "You entered an API Secret Key ('shpss_...'). Shopify requires the Admin API Access Token ('shpat_...'). " +
        "In your Shopify Admin, navigate to: Settings -> Apps and sales channels -> Develop apps -> [Your App] -> API credentials -> 'Admin API access token'."
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await connectShopify({
        shop_url: shopUrl.trim(),
        access_token: accessToken.trim(),
        api_version: apiVersion,
        location_id: selectedLocationId,
        location_name: selectedLocationName,
        auto_sync: autoSync,
      });

      if (res.ok && res.status) {
        setStatus(res.status);
        setSuccessMessage(`Successfully connected to ${res.status.shop_name || 'Shopify'}!`);
        // Refresh locations
        const freshLocs = await getShopifyLocations();
        setLocations(freshLocs);
      } else {
        setErrorMessage(res.error || 'Failed to connect to Shopify. Please verify your token.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Shopify?')) return;
    setIsSaving(true);
    try {
      await disconnectShopify();
      const freshStat = await getShopifyStatus();
      setStatus(freshStat);
      setAccessToken('');
      setSuccessMessage('Disconnected from Shopify.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disconnect.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLocationChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locId = e.target.value;
    const match = locations.find((l) => l.id === locId);
    const locName = match ? match.name : selectedLocationName;
    setSelectedLocationId(locId);
    setSelectedLocationName(locName);

    try {
      await setShopifyLocation(locId, locName);
      setSuccessMessage(`Updated default inventory location to '${locName}'.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage('Failed to update location preference.');
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSyncResult(null);

    try {
      const result = await syncAllProductsToShopify({
        items: inventoryItems,
        location_id: selectedLocationId,
        location_name: selectedLocationName,
      });
      setSyncResult(result);
      if (result.success) {
        setSuccessMessage(
          `Sync complete! ${result.created} created, ${result.updated} updated in Shopify.`
        );
        if (onSyncComplete) onSyncComplete();
      } else {
        setErrorMessage(result.message || 'Sync encountered errors.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync products to Shopify.');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const isLive = Boolean(status?.connected && !status?.is_mock);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.18s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(149, 191, 71, 0.08) 0%, rgba(16, 138, 0, 0.04) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#95BF47',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(149, 191, 71, 0.35)',
              }}
            >
              <ShopifyBagIcon size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Shopify Inventory API Integration
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: isLive ? 'rgba(22, 163, 74, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: isLive ? '#16A34A' : '#3B82F6',
                    border: `1px solid ${isLive ? 'rgba(22, 163, 74, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                  }}
                >
                  {isLive ? '● Live Store' : '⚙️ Sandbox Mode'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                Direct synchronization via Shopify’s official GraphQL Inventory Management APIs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Alerts */}
          {errorMessage && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#EF4444',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div
              style={{
                background: 'rgba(22, 163, 74, 0.1)',
                border: '1px solid rgba(22, 163, 74, 0.3)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#16A34A',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>{successMessage}</div>
            </div>
          )}

          {/* Connection Status Banner */}
          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                Store Connection Status
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {status?.shop_name || 'Surfaces Tiles Sandbox Store'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Domain: <code style={{ fontFamily: 'monospace', color: 'var(--surfaces-gold)' }}>{status?.shop_url || 'surfaces-tiles-demo.myshopify.com'}</code>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isLive ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isSaving}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  Disconnect
                </button>
              ) : (
                <div
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#3B82F6',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    fontWeight: 600,
                  }}
                >
                  Interactive Simulation Ready
                </div>
              )}
            </div>
          </div>

          {/* Live Store Configuration Form */}
          <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Shopify Store Credentials
              </h3>
              <a
                href="https://help.shopify.com/en/manual/apps/app-types/custom-apps"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '11px', color: '#108A00', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
              >
                <span>How to generate Access Token</span>
                <ExternalLink size={11} />
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Shopify Store URL
                </label>
                <input
                  type="text"
                  placeholder="your-store.myshopify.com"
                  value={shopUrl}
                  onChange={(e) => setShopUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Admin API Access Token
                </label>
                <input
                  type="password"
                  placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: accessToken.startsWith('shpss_') ? '1px solid #F59E0B' : '1px solid var(--border-subtle)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                />
                {accessToken.startsWith('shpss_') && (
                  <div style={{ fontSize: '11px', color: '#D97706', marginTop: '4px', lineHeight: 1.3 }}>
                    ⚠️ This is an <strong>API Secret Key</strong> (shpss_...). Please use the <strong>Admin API Access Token</strong> (shpat_...).
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary"
                style={{
                  fontSize: '12px',
                  padding: '8px 16px',
                  background: '#108A00',
                  borderColor: '#108A00',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isSaving ? <RefreshCw size={13} className="spin" /> : <ShieldCheck size={13} />}
                <span>{isSaving ? 'Verifying...' : 'Save & Verify Connection'}</span>
              </button>
            </div>
          </form>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: 0 }} />

          {/* Location & Sync Preferences */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Shopify Inventory Location
            </h3>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Primary Inventory Location (for stock sync & new products)
              </label>
              <select
                value={selectedLocationId}
                onChange={handleLocationChange}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                }}
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.address ? `(${loc.address})` : ''}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                All synchronized on-hand quantities will be adjusted at this Shopify location using{' '}
                <code style={{ fontFamily: 'monospace' }}>inventorySetQuantities</code>.
              </p>
            </div>

            {/* Auto-Sync Preferences */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#108A00' }}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>
                  Auto-create new Surfaces Tiles products in Shopify upon mapping
                </span>
              </label>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 0 26px' }}>
                Automatically creates corresponding products in Shopify with name, SKU, on-hand quantity, and designated location.
              </p>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: 0 }} />

          {/* One-Click Bulk Sync Section */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 138, 0, 0.06) 0%, rgba(149, 191, 71, 0.03) 100%)',
              border: '1px solid rgba(16, 138, 0, 0.25)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={15} color="#108A00" />
                <span>One-Click Full Catalog Sync</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                Push all {inventoryItems.length} items to Shopify. Creates missing products and updates current stock levels.
              </p>
              {syncResult && (
                <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600, marginTop: '5px' }}>
                  Last sync: {syncResult.created} created, {syncResult.updated} updated, {syncResult.failed} errors.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSyncAll}
              disabled={isSyncingAll || inventoryItems.length === 0}
              className="btn btn-primary"
              style={{
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 700,
                background: '#108A00',
                borderColor: '#108A00',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16, 138, 0, 0.25)',
              }}
            >
              {isSyncingAll ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
              <span>{isSyncingAll ? 'Syncing to Shopify...' : 'One-Click Sync All Products'}</span>
            </button>
          </div>

          {/* Backup CSV Export Callout */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <strong>Need a manual import?</strong> The 19-column Shopify Inventory CSV Export remains available anytime.
            </div>
            {onOpenCsvExport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCsvExport();
                }}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Download size={12} />
                <span>Open CSV Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '7px 16px', fontSize: '13px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
