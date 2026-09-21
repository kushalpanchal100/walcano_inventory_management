'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import DashboardLayout from '@/components/DashboardLayout';
import QuickBooksConnectButton from '@/components/QuickBooksConnectButton';
import {
  getLiveInventory,
  getQuickBooksStatus,
  getQuickBooksAuthUrl,
  disconnectQuickBooks,
  saveManualMapping,
  autoMapSingleProduct,
  QuickBooksInventoryItem,
  QuickBooksStatus,
} from '@/lib/api';
import {
  Search,
  RefreshCw,
  ExternalLink,
  Layers,
  AlertTriangle,
  Package,
  CheckCircle,
  AlertCircle,
  XCircle,
  Filter,
  Sparkles,
  Info,
  Download,
  Check,
  Link2,
  Unlink,
  TrendingDown,
  ChevronRight,
  Pencil,
  X,
} from 'lucide-react';
import { downloadInventoryCsv } from '@/lib/csvExport';
import AiCopilotDrawer from '@/components/AiCopilotDrawer';
import AiAutoMapModal from '@/components/AiAutoMapModal';
import AiRestockModal from '@/components/AiRestockModal';
import ManualMapModal from '@/components/ManualMapModal';
import ShopifyExportModal from '@/components/ShopifyExportModal';
import ShopifyConnectButton from '@/components/ShopifyConnectButton';
import ShopifyIntegrationModal, { ShopifyBagIcon } from '@/components/ShopifyIntegrationModal';
import StockAdjustModal from '@/components/StockAdjustModal';
import {
  syncProductToShopify,
  getSyncedShopifyProducts,
  getShopifyStatus,
  ShopifyStatus,
} from '@/lib/api';

export default function QuickBooksInventoryPage() {
  const [items, setItems] = useState<QuickBooksInventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [qboStatus, setQboStatus] = useState<QuickBooksStatus | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [mappingFilter, setMappingFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [isRestockOpen, setIsRestockOpen] = useState<boolean>(false);
  const [isShopifyExportOpen, setIsShopifyExportOpen] = useState<boolean>(false);

  // Shopify Integration states
  const [isShopifyModalOpen, setIsShopifyModalOpen] = useState<boolean>(false);
  const [shopifyStatus, setShopifyStatus] = useState<ShopifyStatus | null>(null);
  const [syncedProductSkus, setSyncedProductSkus] = useState<Record<string, any>>({});
  const [stockAdjustItem, setStockAdjustItem] = useState<QuickBooksInventoryItem | null>(null);
  const [syncingSku, setSyncingSku] = useState<string | null>(null);
  const [shopifyRefreshKey, setShopifyRefreshKey] = useState<number>(0);

  const [connectionBanner, setConnectionBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
    surfacesName?: string;
  } | null>(null);

  // Manual Mapping Modal state (Single Product Focus)
  const [manualMapItem, setManualMapItem] = useState<QuickBooksInventoryItem | null>(null);

  // Single-product AI Auto-Map Modal state
  const [isAutoMapOpen, setIsAutoMapOpen] = useState<boolean>(false);
  const [selectedWalcanoForModal, setSelectedWalcanoForModal] = useState<string | null>(null);
  const [targetItemForModal, setTargetItemForModal] = useState<QuickBooksInventoryItem | null>(null);

  const openManualMapModalForItem = (item: QuickBooksInventoryItem) => {
    setManualMapItem(item);
  };

  const openAutoMapModalForItem = (item: QuickBooksInventoryItem) => {
    const walcanoName = (item.walcano_name || item.name || '').trim();
    setSelectedWalcanoForModal(walcanoName);
    setTargetItemForModal(item);
    setIsAutoMapOpen(true);
  };

  const handleManualMappingSaved = async (walcanoName: string, newSurfacesName: string) => {
    const targetItem = items.find(
      (it) => (it.walcano_name || it.name || '').trim().toLowerCase() === walcanoName.toLowerCase()
    );

    setItems((prevItems) =>
      prevItems.map((it) => {
        const itName = (it.walcano_name || it.name || '').trim();
        if (itName.toLowerCase() === walcanoName.toLowerCase()) {
          return {
            ...it,
            surfaces_name: newSurfacesName,
            is_mapped: true,
            mapping_note: 'Manual user entry',
          };
        }
        return it;
      })
    );

    let shopifySyncSuffix = '';
    if (targetItem) {
      try {
        const syncRes = await syncProductToShopify({
          sku: targetItem.sku,
          walcano_name: walcanoName,
          surfaces_name: newSurfacesName,
          category: targetItem.category,
          qty_on_hand: targetItem.qty_on_hand,
        });
        if (syncRes.success) {
          setSyncedProductSkus((prev) => ({
            ...prev,
            [targetItem.sku]: {
              sku: targetItem.sku,
              surfaces_name: newSurfacesName,
              action: syncRes.action,
            },
          }));
          shopifySyncSuffix = ' & auto-synced to Shopify!';
        }
      } catch (se) {
        console.warn('Auto Shopify sync notice:', se);
      }
    }

    setToastMessage({
      text: `Manual mapping saved! "${walcanoName}" mapped to "${newSurfacesName}"${shopifySyncSuffix}`,
      type: 'success',
      surfacesName: newSurfacesName,
    });
    setManualMapItem(null);
  };

  // One-click sync single product directly to Shopify
  const handleSyncSingleProductToShopify = async (item: QuickBooksInventoryItem) => {
    setSyncingSku(item.sku);
    try {
      const res = await syncProductToShopify({
        sku: item.sku,
        name: item.name,
        walcano_name: item.walcano_name,
        surfaces_name: item.surfaces_name,
        category: item.category,
        qty_on_hand: item.qty_on_hand,
      });

      if (res.success) {
        setSyncedProductSkus((prev) => ({
          ...prev,
          [item.sku]: {
            sku: item.sku,
            surfaces_name: item.surfaces_name,
            last_synced: res.last_synced,
            shopify_product_id: res.shopify_product_id,
            action: res.action,
          },
        }));
        setToastMessage({
          text: `✓ ${res.action === 'created' ? 'Created and' : ''} Synced "${res.product_name}" to Shopify!`,
          type: 'success',
        });
      } else {
        setToastMessage({
          text: `Shopify sync failed: ${res.error || 'Unknown error'}`,
          type: 'error',
        });
      }
    } catch (err: any) {
      setToastMessage({
        text: `Shopify sync error: ${err.message || err}`,
        type: 'error',
      });
    } finally {
      setSyncingSku(null);
    }
  };

  // Real-time stock update handler (synced directly to Shopify)
  const handleStockUpdated = (sku: string, newQty: number) => {
    setItems((prev) =>
      prev.map((it) => (it.sku === sku ? { ...it, qty_on_hand: newQty } : it))
    );
    setSyncedProductSkus((prev) => ({
      ...prev,
      [sku]: {
        ...(prev[sku] || {}),
        sku,
        qty_on_hand: newQty,
        last_synced: new Date().toISOString(),
      },
    }));
    setToastMessage({
      text: `✓ Stock updated to ${newQty} and synced to Shopify!`,
      type: 'success',
    });
  };

  const handleApplyFilter = useCallback((filters: any) => {
    if (filters.stock) setStockFilter(filters.stock);
    if (filters.mapping) setMappingFilter(filters.mapping);
    if (filters.category) setSelectedCategory(filters.category);
    if (filters.search !== undefined) setSearchQuery(filters.search);
  }, []);

  const loadInventory = useCallback(async (demo: boolean = false, isBackground: boolean = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [status, inv, shopifyProducts, shopifyStat] = await Promise.all([
        getQuickBooksStatus(),
        getLiveInventory({ demo }),
        getSyncedShopifyProducts(),
        getShopifyStatus(),
      ]);

      setQboStatus(status);
      setIsConnected(inv.connected || status.connected);
      setIsDemoMode(inv.is_demo);
      setItems(inv.items || []);
      setCategories(inv.categories || []);
      setLastSynced(inv.last_synced || new Date().toISOString());
      if (shopifyProducts) setSyncedProductSkus(shopifyProducts);
      if (shopifyStat) setShopifyStatus(shopifyStat);
    } catch (err) {
      console.error('Failed to load QuickBooks inventory:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInventory(false, false);
  }, [loadInventory]);

  // Handle return redirect from QuickBooks OAuth callback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('qbo_connected') === 'true') {
        setConnectionBanner({
          type: 'success',
          message: 'QuickBooks Online connected successfully! Streaming real-time inventory.',
        });
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('qbo_error')) {
        setConnectionBanner({
          type: 'error',
          message: `QuickBooks connection issue: ${decodeURIComponent(params.get('qbo_error') || 'OAuth authorization was not completed.')}`,
        });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleConnectQuickBooks = async () => {
    try {
      const { url, error } = await getQuickBooksAuthUrl();
      if (url) {
        window.location.href = url;
      } else {
        alert(error || 'QuickBooks OAuth link could not be created. Please verify QBO credentials in backend/.env.');
      }
    } catch (err: any) {
      alert(`Connection failed: ${err.message || err}`);
    }
  };

  const handleDisconnectQuickBooks = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect QuickBooks? Real-time inventory sync will be paused until you reconnect.'
      )
    ) {
      return;
    }
    setIsLoading(true);
    try {
      await disconnectQuickBooks();
      await loadInventory(false, false);
      setConnectionBanner({
        type: 'info',
        message: 'QuickBooks session disconnected. Click "Connect QuickBooks" at the top anytime to reconnect.',
      });
    } catch (err: any) {
      alert(`Disconnect failed: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      // Mapping
      if (mappingFilter === 'mapped' && !item.is_mapped) {
        return false;
      }
      if (mappingFilter === 'unmapped' && item.is_mapped) {
        return false;
      }

      // Stock status
      if (stockFilter === 'in_stock' && item.qty_on_hand <= 0) return false;
      if (stockFilter === 'low_stock' && (item.qty_on_hand <= 0 || item.qty_on_hand > 10)) return false;
      if (stockFilter === 'out_of_stock' && item.qty_on_hand > 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(q);
        const matchWalcano = (item.walcano_name || '').toLowerCase().includes(q);
        const matchSurfaces = (item.surfaces_name || '').toLowerCase().includes(q);
        const matchVariants = (item.surfaces_variants || []).some((v) => v.toLowerCase().includes(q));
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchName && !matchWalcano && !matchSurfaces && !matchVariants && !matchSku && !matchCat) return false;
      }

      return true;
    });
  }, [items, selectedCategory, mappingFilter, stockFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const totalProducts = items.length;
    const totalQty = items.reduce((sum, item) => sum + (item.qty_on_hand || 0), 0);
    const inStock = items.filter((i) => i.qty_on_hand > 0).length;
    const lowStock = items.filter((i) => i.qty_on_hand > 0 && i.qty_on_hand <= 10).length;
    const outOfStock = items.filter((i) => i.qty_on_hand <= 0).length;
    const mappedCount = items.filter((i) => i.is_mapped).length;
    const unmappedCount = items.filter((i) => !i.is_mapped).length;

    return { totalProducts, totalQty, inStock, lowStock, outOfStock, mappedCount, unmappedCount };
  }, [items]);

  // CSV Export - Opens Shopify Export modal with full configuration and live preview
  const handleExportCsv = useCallback(() => {
    const itemsToExport = filteredItems.length > 0 ? filteredItems : items;
    if (itemsToExport.length === 0) {
      alert('No inventory items available to export.');
      return;
    }
    setIsShopifyExportOpen(true);
  }, [filteredItems, items]);

  return (
    <DashboardLayout
      headerTitle="Smart Inventory Management Platform"
      headerSubtitle="Real-time QuickBooks synchronization with intelligent cross-catalog mapping for Wallcano & Surfaces Tiles"
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search product name, Surfaces code, SKU, or category..."
      onRefreshClick={() => loadInventory(false, true)}
      isRefreshing={isRefreshing}
      quickBooksAction={
        <QuickBooksConnectButton
          isConnected={isConnected}
          qboStatus={qboStatus}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onConnect={handleConnectQuickBooks}
          onDisconnect={handleDisconnectQuickBooks}
          onSync={() => loadInventory(false, true)}
        />
      }
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
          {/* Shopify Live Integration Button */}
          <ShopifyConnectButton
            onOpenModal={() => setIsShopifyModalOpen(true)}
            statusRefreshKey={shopifyRefreshKey}
          />

          {/* AI Copilot Button */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            className="btn btn-ai"
            title="Open AI Inventory Assistant"
            style={{ padding: '6px 11px', fontSize: '12px', whiteSpace: 'nowrap' }}
          >
            <Sparkles size={13} />
            <span>AI Copilot</span>
          </button>

          {/* AI Restock Insights Button */}
          <button
            type="button"
            onClick={() => setIsRestockOpen(true)}
            className="btn btn-secondary"
            title="AI Stockout forecasting and replenishment recommendations"
            style={{ padding: '6px 11px', fontSize: '12px', whiteSpace: 'nowrap' }}
          >
            <TrendingDown size={13} color="var(--surfaces-gold)" />
            <span>Restock AI</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={items.length === 0 || isLoading || isExporting}
            className="btn btn-primary"
            style={{
              padding: '6px 11px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              background: exportSuccess ? '#16A34A' : undefined,
              borderColor: exportSuccess ? '#16A34A' : undefined,
            }}
          >
            {exportSuccess ? <Check size={13} /> : <Download size={13} />}
            <span>{exportSuccess ? 'Downloaded!' : 'Export CSV'}</span>
            {filteredItems.length > 0 && !exportSuccess && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '1px 5px',
                  borderRadius: '10px',
                }}
              >
                {filteredItems.length}
              </span>
            )}
          </button>
        </div>
      }
    >
      {/* ─── OAUTH CALLBACK / STATUS ALERT BANNER ────────────────────── */}
      {connectionBanner && (
        <div
          style={{
            marginBottom: '18px',
            padding: '12px 18px',
            borderRadius: '10px',
            background:
              connectionBanner.type === 'success'
                ? '#F0FDF4'
                : connectionBanner.type === 'error'
                ? '#FEF2F2'
                : '#EFF6FF',
            border: `1px solid ${
              connectionBanner.type === 'success'
                ? '#BBF7D0'
                : connectionBanner.type === 'error'
                ? '#FECACA'
                : '#BFDBFE'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {connectionBanner.type === 'success' ? (
              <CheckCircle size={18} color="#16A34A" />
            ) : connectionBanner.type === 'error' ? (
              <AlertCircle size={18} color="#DC2626" />
            ) : (
              <Info size={18} color="#2563EB" />
            )}
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color:
                  connectionBanner.type === 'success'
                    ? '#166534'
                    : connectionBanner.type === 'error'
                    ? '#991B1B'
                    : '#1E40AF',
              }}
            >
              {connectionBanner.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConnectionBanner(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              fontSize: '14px',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── DUAL BRAND HERO BANNER ──────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '14px',
          border: '1px solid var(--border-subtle)',
          padding: '22px 24px',
          marginBottom: '24px',
          boxShadow: 'var(--shadow-xs)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '16px',
        }}
      >
        {/* Centered Dual Brand Info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Wallcano Brand Presentation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                background: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/brands/wallcano-logo.png"
                alt="Wallcano Tiles"
                className="brand-logo-img"
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--wallcano-dark)', letterSpacing: '0.02em' }}>
                Wallcano Tiles
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Primary QuickBooks Inventory
              </div>
            </div>
          </div>

          <div style={{ height: '36px', width: '1px', background: 'var(--border-subtle)' }} />

          {/* Surfaces Brand Presentation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                background: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid var(--surfaces-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src="/brands/surfaces-logo.png"
                alt="Surfaces Tiles"
                className="brand-logo-img"
              />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--surfaces-text-badge)', letterSpacing: '0.02em' }}>
                Surfaces Tiles
              </div>
              <div style={{ fontSize: '11px', color: 'var(--surfaces-gold)' }}>
                Reference Specification Catalog
              </div>
            </div>
          </div>
        </div>

        {/* Centered Quick sync indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            background: 'var(--bg-subtle)',
            padding: '5px 14px',
            borderRadius: '20px',
            border: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#16A34A' : '#F59E0B',
              boxShadow: isConnected ? '0 0 6px rgba(22, 163, 74, 0.4)' : '0 0 6px rgba(245, 158, 11, 0.35)',
            }}
          />
          <span>
            {isConnected
              ? `Live Sync: ${qboStatus?.company_name || 'Active'}`
              : isDemoMode
              ? 'Preview Demo Mode'
              : 'Direct API Mode'}
          </span>
          {!isConnected && (
            <button
              type="button"
              onClick={handleConnectQuickBooks}
              style={{
                background: '#2CA01C',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '3px 9px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Connect Now</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── AI ACTION TOAST / BANNER ───────────────────────────────── */}
      {toastMessage && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 18px',
            borderRadius: '10px',
            background:
              toastMessage.type === 'success'
                ? '#F0FDF4'
                : toastMessage.type === 'error'
                ? '#FEF2F2'
                : '#F5F3FF',
            border:
              toastMessage.type === 'success'
                ? '1px solid #86EFAC'
                : toastMessage.type === 'error'
                ? '1px solid #FECACA'
                : '1px solid #DDD6FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles
              size={18}
              color={
                toastMessage.type === 'success'
                  ? '#16A34A'
                  : toastMessage.type === 'error'
                  ? '#DC2626'
                  : '#7C3AED'
              }
            />
            <div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color:
                    toastMessage.type === 'success'
                      ? '#166534'
                      : toastMessage.type === 'error'
                      ? '#991B1B'
                      : '#5B21B6',
                }}
              >
                {toastMessage.type === 'success'
                  ? 'Mapping Confirmed'
                  : toastMessage.type === 'error'
                  ? 'Mapping Error'
                  : 'Processing...'}
              </span>
              <p
                style={{
                  fontSize: '12px',
                  color:
                    toastMessage.type === 'success'
                      ? '#15803D'
                      : toastMessage.type === 'error'
                      ? '#B91C1C'
                      : '#6D28D9',
                  margin: '2px 0 0 0',
                }}
              >
                {toastMessage.text}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── DEMO MODE BANNER ────────────────────────────────────────── */}
      {isDemoMode && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: '10px',
            background: 'var(--status-low-bg)',
            border: '1px solid var(--status-low-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} color="var(--status-low-text)" />
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--status-low-text)' }}>
                Demo Preview Mode Active
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                Showing sample tile records. Connect your live QuickBooks company for authoritative real-time stock.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleConnectQuickBooks}
              className="btn btn-qbo"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              <ExternalLink size={13} />
              <span>Connect Live QuickBooks</span>
            </button>
            <button
              type="button"
              onClick={() => loadInventory(false, false)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Exit Demo
            </button>
          </div>
        </div>
      )}

      {/* ─── METRICS CARDS ───────────────────────────────────────────── */}
      <div
        className="stat-card-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {/* Metric 1: Total Products */}
        <div
          className={`stat-card stat-card-ribbon-total ${stockFilter === 'all' && mappingFilter === 'all' ? 'active' : ''}`}
          onClick={() => {
            setMappingFilter('all');
            setStockFilter('all');
          }}
          style={{ cursor: 'pointer' }}
          title="Click to view all products"
        >
          <div className="stat-title">
            <Layers size={14} color="#0F172A" />
            <span>Total QBO Products</span>
          </div>
          <div className="stat-value">
            {isLoading ? '-' : metrics.totalProducts}
          </div>
          <div className="stat-desc">
            Direct from QuickBooks Online
          </div>
        </div>

        {/* Metric 2: Surfaces Mapped */}
        <div
          className="stat-card stat-card-ribbon-surfaces"
          onClick={() => setMappingFilter(mappingFilter === 'mapped' ? 'all' : 'mapped')}
          style={{
            cursor: 'pointer',
            border: mappingFilter === 'mapped' ? '1.5px solid var(--surfaces-gold)' : undefined,
          }}
          title="Click to filter Surfaces mapped items"
        >
          <div className="stat-title" style={{ color: '#B45309' }}>
            <Link2 size={14} color="#D97706" />
            <span>Surfaces Mapped</span>
          </div>
          <div className="stat-value" style={{ color: '#92400E' }}>
            {isLoading ? '-' : metrics.mappedCount}
          </div>
          <div className="stat-desc" style={{ color: '#B45309' }}>
            Linked to Surfaces specifications
          </div>
        </div>

        {/* Metric 3: Wallcano Exclusive / Unmapped */}
        <div
          className="stat-card stat-card-ribbon-wallcano"
          onClick={() => setMappingFilter(mappingFilter === 'unmapped' ? 'all' : 'unmapped')}
          style={{
            cursor: 'pointer',
            border: mappingFilter === 'unmapped' ? '1.5px solid var(--wallcano-slate)' : undefined,
          }}
          title="Click to filter Wallcano unmapped items"
        >
          <div className="stat-title" style={{ color: 'var(--wallcano-slate)' }}>
            <Unlink size={14} color="var(--wallcano-slate)" />
            <span>Wallcano Exclusive</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--wallcano-dark)' }}>
            {isLoading ? '-' : metrics.unmappedCount}
          </div>
          <div className="stat-desc" style={{ color: 'var(--text-muted)' }}>
            Unmapped / Exclusive to Wallcano
          </div>
        </div>

        {/* Metric 4: Total Quantity on Hand */}
        <div className="stat-card">
          <div className="stat-title">
            <Package size={14} color="#64748B" />
            <span>Total Units on Hand</span>
          </div>
          <div className="stat-value">
            {isLoading ? '-' : metrics.totalQty.toLocaleString()}
          </div>
          <div className="stat-desc">
            Aggregated units in stock
          </div>
        </div>

        {/* Metric 5: In Stock Card */}
        <div
          className="stat-card stat-card-ribbon-instock"
          onClick={() => setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock')}
          style={{
            cursor: 'pointer',
            border: stockFilter === 'in_stock' ? '2px solid #16A34A' : undefined,
            background: stockFilter === 'in_stock' ? 'rgba(22, 163, 74, 0.08)' : undefined,
          }}
          title={stockFilter === 'in_stock' ? 'Currently filtering: In Stock (click to clear)' : 'Click to filter by In Stock'}
        >
          <div className="stat-title" style={{ color: '#16A34A' }}>
            <CheckCircle size={14} color="#16A34A" />
            <span>In Stock</span>
          </div>
          <div className="stat-value" style={{ color: '#15803D' }}>
            {isLoading ? '-' : metrics.inStock}
          </div>
          <div className="stat-desc" style={{ color: stockFilter === 'in_stock' ? '#15803D' : undefined }}>
            {stockFilter === 'in_stock' ? 'Active filter · Click to clear' : 'Available units on hand'}
          </div>
        </div>

        {/* Metric 6: Out of Stock Card */}
        <div
          className="stat-card stat-card-ribbon-outstock"
          onClick={() => setStockFilter(stockFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
          style={{
            cursor: 'pointer',
            border: stockFilter === 'out_of_stock' ? '2px solid #DC2626' : undefined,
            background: stockFilter === 'out_of_stock' ? 'rgba(220, 38, 38, 0.08)' : undefined,
          }}
          title={stockFilter === 'out_of_stock' ? 'Currently filtering: Out of Stock (click to clear)' : 'Click to filter by Out of Stock'}
        >
          <div className="stat-title" style={{ color: '#DC2626' }}>
            <AlertCircle size={14} color="#DC2626" />
            <span>Out of Stock</span>
          </div>
          <div className="stat-value" style={{ color: '#BE123C' }}>
            {isLoading ? '-' : metrics.outOfStock}
          </div>
          <div className="stat-desc" style={{ color: stockFilter === 'out_of_stock' ? '#BE123C' : undefined }}>
            {stockFilter === 'out_of_stock' ? 'Active filter · Click to clear' : 'Items with zero inventory'}
          </div>
        </div>
      </div>

      {/* ─── FILTERS & CONTROLS ──────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-xs)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Row 1: Brand Tab Segment & Stock Filter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* Brand Segmented Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Catalog View:
            </span>
            <button
              type="button"
              onClick={() => setMappingFilter('all')}
              className={`btn ${mappingFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: mappingFilter === 'all' ? 700 : 600,
              }}
            >
              All Tiles ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setMappingFilter('mapped')}
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: mappingFilter === 'mapped' ? 'var(--surfaces-gold)' : 'var(--surfaces-bg-badge)',
                color: mappingFilter === 'mapped' ? '#FFFFFF' : 'var(--surfaces-text-badge)',
                borderColor: 'var(--surfaces-border)',
              }}
            >
              <Link2 size={13} />
              <span>Surfaces Mapped ({metrics.mappedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setMappingFilter('unmapped')}
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: mappingFilter === 'unmapped' ? 'var(--wallcano-slate)' : 'var(--bg-subtle)',
                color: mappingFilter === 'unmapped' ? '#FFFFFF' : 'var(--text-secondary)',
                borderColor: mappingFilter === 'unmapped' ? 'var(--wallcano-slate)' : 'var(--border-subtle)',
              }}
            >
              <Unlink size={13} />
              <span>Wallcano Only ({metrics.unmappedCount})</span>
            </button>
          </div>

          {/* Stock Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-main)',
                background: 'var(--bg-input)',
                border: stockFilter !== 'all' ? '1px solid var(--surfaces-gold)' : '1px solid var(--border-subtle)',
                borderRadius: '8px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock ({metrics.inStock})</option>
              <option value="out_of_stock">Out of Stock ({metrics.outOfStock})</option>
              <option value="low_stock">Low Stock (1-10 units)</option>
            </select>

            {stockFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStockFilter('all')}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '5px 9px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
                title="Clear stock status filter"
              >
                Clear
              </button>
            )}

            {lastSynced && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Synced: {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Category Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px' }}>
            Category:
          </span>
          {['All', ...categories].map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 500,
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--surfaces-gold)' : 'var(--border-subtle)',
                  background: isSelected ? 'var(--surfaces-gold)' : 'var(--bg-subtle)',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── INVENTORY TABLE CONTAINER ──────────────────────────────── */}
      <div className="inventory-table-container">
        {/* Table Title Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={17} color="var(--surfaces-gold)" />
            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--wallcano-dark)' }}>
              QuickBooks Product Catalog
            </span>
            <span className="pill pill-neutral">
              {filteredItems.length} {filteredItems.length === 1 ? 'record' : 'records'}
            </span>
            {stockFilter === 'in_stock' && (
              <span className="pill pill-instock" style={{ fontSize: '10px', padding: '2px 8px' }}>
                Filtered: In Stock
              </span>
            )}
            {stockFilter === 'out_of_stock' && (
              <span className="pill pill-outstock" style={{ fontSize: '10px', padding: '2px 8px' }}>
                Filtered: Out of Stock
              </span>
            )}
            {stockFilter === 'low_stock' && (
              <span className="pill pill-lowstock" style={{ fontSize: '10px', padding: '2px 8px' }}>
                Filtered: Low Stock
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredItems.length === 0 || isLoading || isExporting}
              className="btn btn-secondary"
              style={{ padding: '5px 10px', fontSize: '11px' }}
            >
              <Download size={12} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Loading / Empty / Data Table */}
        {isLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid #E2E8F0',
                borderTopColor: 'var(--surfaces-gold)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p style={{ color: '#0F172A', fontSize: '14px', fontWeight: 700 }}>
              Connecting to QuickBooks Online...
            </p>
            <p style={{ color: '#64748B', fontSize: '12px', marginTop: '4px' }}>
              Loading real-time quantities and catalog mappings
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Package size={40} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
              {isConnected || isDemoMode ? 'No matching products found' : 'No inventory data available'}
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '400px', margin: '0 auto 16px' }}>
              {isConnected || isDemoMode
                ? 'Try clearing your search query or selecting a different brand/category filter.'
                : 'Connect your QuickBooks Online account to stream your live tile records.'}
            </p>
            {!isConnected && !isDemoMode && (
              <button
                type="button"
                onClick={handleConnectQuickBooks}
                className="btn btn-qbo"
              >
                Connect QuickBooks Now
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="inventory-table">
              <thead>
                <tr>
                  {/* Column 1: Wallcano Product */}
                  <th style={{ width: '25%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src="/brands/wallcano-logo.png"
                        alt="Wallcano"
                        style={{ height: '16px', width: 'auto', objectFit: 'contain' }}
                      />
                      <span>Wallcano Product (QBO)</span>
                    </div>
                  </th>

                  {/* Column 2: Surfaces Product */}
                  <th style={{ width: '28%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src="/brands/surfaces-logo.png"
                        alt="Surfaces"
                        style={{ height: '14px', width: 'auto', objectFit: 'contain' }}
                      />
                      <span>Surfaces Specification</span>
                    </div>
                  </th>

                  {/* Column 3: SKU */}
                  <th style={{ width: '10%' }}>SKU</th>

                  {/* Column 4: Quantity on Hand */}
                  <th style={{ width: '18%' }}>Quantity on Hand</th>

                  {/* Column 5: Category */}
                  <th style={{ width: '10%' }}>Category</th>

                  {/* Column 6: Shopify Direct Sync */}
                  <th style={{ width: '14%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShopifyBagIcon size={14} />
                      <span>Shopify Sync</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const isMapped = Boolean(item.is_mapped);
                  const walcanoDisplayName = item.walcano_name || item.name;
                  const isSynced = Boolean(syncedProductSkus[item.sku]);
                  const isThisSyncing = syncingSku === item.sku;
                  const shopifyRecord = syncedProductSkus[item.sku];

                  return (
                    <tr key={item.id || item.sku || index}>
                      {/* Column 1: Wallcano Tiles Product Name */}
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', lineHeight: '1.3' }}>
                          {walcanoDisplayName}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginTop: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span className="pill pill-wallcano" style={{ fontSize: '9px', padding: '1px 5px' }}>
                            QBO
                          </span>
                          {item.id && <span>ID: {item.id}</span>}
                        </div>
                      </td>

                      {/* Column 2: Surfaces Tiles Mapping & Specification */}
                      <td style={{ position: 'relative' }}>
                        {/* Pencil Edit Icon for Direct Manual Mapping Modal */}
                        <button
                          type="button"
                          onClick={() => openManualMapModalForItem(item)}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '8px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '5px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-card)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            zIndex: 2,
                            boxShadow: 'var(--shadow-xs)',
                          }}
                          title="Map Product Manually"
                          aria-label="Map Product Manually"
                        >
                          <Pencil size={11} />
                        </button>

                        {isMapped && item.surfaces_name ? (
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', paddingRight: '28px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                                <span className="pill pill-surfaces" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                  MAPPED
                                </span>
                                {item.mapping_note && item.mapping_note.toLowerCase().includes('manual') ? (
                                  <span className="pill pill-neutral" style={{ fontSize: '9px', padding: '1px 5px', background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                                    ✍️ Manual
                                  </span>
                                ) : item.mapping_note && (item.mapping_note.toLowerCase().includes('gemini') || item.mapping_note.toLowerCase().includes('ai')) ? (
                                  <span className="pill pill-ai" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                    ✨ AI Mapped
                                  </span>
                                ) : null}
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--surfaces-text-badge)', lineHeight: '1.3' }}>
                                {item.surfaces_name}
                              </div>
                              {item.surfaces_variants && item.surfaces_variants.length > 1 && (
                                <div style={{ fontSize: '11px', color: 'var(--surfaces-gold-light)', marginTop: '2px' }}>
                                  {item.surfaces_variants.length} catalog variations
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => openAutoMapModalForItem(item)}
                                className="btn btn-secondary"
                                style={{
                                  padding: '3px 8px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: '#7C3AED',
                                  borderColor: 'rgba(124, 58, 237, 0.4)',
                                  background: 'rgba(124, 58, 237, 0.12)',
                                  borderRadius: '5px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  cursor: 'pointer',
                                }}
                                title="Auto-map this specific product and generate a unique Surfaces Tiles product name using AI"
                              >
                                <Sparkles size={10} />
                                <span>Remap</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => openAutoMapModalForItem(item)}
                              className="btn btn-secondary"
                              style={{
                                padding: '3px 8px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#7C3AED',
                                borderColor: 'rgba(124, 58, 237, 0.4)',
                                background: 'rgba(124, 58, 237, 0.12)',
                                borderRadius: '5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                              title="Auto-map this specific product and generate a unique Surfaces Tiles product name using AI"
                            >
                              <Sparkles size={10} />
                              <span>Auto-Map</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openManualMapModalForItem(item)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--surfaces-gold)',
                                fontWeight: 600,
                                textDecoration: 'underline',
                                cursor: 'pointer',
                                fontSize: '11px',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Map this product manually to Surfaces Tiles"
                            >
                              Manual Map
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Column 3: SKU */}
                      <td>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-subtle)',
                            padding: '3px 7px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            display: 'inline-block',
                          }}
                        >
                          {item.sku || 'N/A'}
                        </span>
                      </td>

                      {/* Column 4: Quantity on Hand (Interactive / Quick Adjust) */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                            <span
                              style={{
                                fontSize: '14px',
                                fontWeight: 800,
                                color: item.qty_on_hand <= 0 ? 'var(--status-out-text)' : 'var(--text-main)',
                              }}
                            >
                              {item.qty_on_hand.toLocaleString()}
                            </span>
                            {item.qty_on_hand <= 0 ? (
                              <span
                                className="pill pill-outstock"
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 8px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Out of Stock
                              </span>
                            ) : (
                              <span
                                className="pill pill-instock"
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 8px',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                In Stock
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setStockAdjustItem(item)}
                            title="Quick adjust on-hand stock and push to Shopify inventory"
                            style={{
                              background: 'var(--bg-subtle)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: '5px',
                              padding: '3px 7px',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '10px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Pencil size={10} />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>

                      {/* Column 5: Category */}
                      <td>
                        <span className="pill pill-neutral">
                          {item.category || 'General'}
                        </span>
                      </td>

                      {/* Column 6: Shopify Direct Sync Status & One-Click Button */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isSynced ? (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: '999px',
                                background: 'rgba(22, 163, 74, 0.12)',
                                color: '#16A34A',
                                border: '1px solid rgba(22, 163, 74, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                              }}
                              title={`Synced with Shopify: ${shopifyRecord?.product_title || item.name}`}
                            >
                              <Check size={10} strokeWidth={3} />
                              <span>Synced</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '999px',
                                background: 'var(--bg-subtle)',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border-subtle)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Not Synced
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSyncSingleProductToShopify(item)}
                            disabled={isThisSyncing}
                            className="btn btn-secondary"
                            style={{
                              padding: '3px 8px',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#108A00',
                              borderColor: 'rgba(16, 138, 0, 0.35)',
                              background: 'rgba(16, 138, 0, 0.08)',
                              borderRadius: '5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                            title="One-click sync: Creates or updates this Surfaces Tiles product in Shopify with on-hand quantity"
                          >
                            {isThisSyncing ? (
                              <RefreshCw size={10} className="spin" />
                            ) : (
                              <ShopifyBagIcon size={11} />
                            )}
                            <span>{isThisSyncing ? 'Syncing...' : isSynced ? 'Sync' : 'One-Click Sync'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODALS & DRAWERS ────────────────────────────────────────── */}
      <AiCopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onApplyFilter={handleApplyFilter}
        isDemoMode={isDemoMode}
      />

      <AiAutoMapModal
        isOpen={isAutoMapOpen}
        onClose={() => {
          setIsAutoMapOpen(false);
          setSelectedWalcanoForModal(null);
          setTargetItemForModal(null);
        }}
        onMappingApplied={() => loadInventory(isDemoMode, true)}
        isDemoMode={isDemoMode}
        inventoryItems={items}
        initialSelectedWalcanoName={selectedWalcanoForModal}
        targetItem={targetItemForModal}
      />



      <AiRestockModal
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        isDemoMode={isDemoMode}
      />

      <ManualMapModal
        isOpen={Boolean(manualMapItem)}
        onClose={() => setManualMapItem(null)}
        item={manualMapItem}
        onMappingSaved={handleManualMappingSaved}
      />

      {/* Shopify Inventory CSV Export Modal (Backup / Manual Bulk Import) */}
      <ShopifyExportModal
        isOpen={isShopifyExportOpen}
        onClose={() => setIsShopifyExportOpen(false)}
        items={filteredItems.length > 0 ? filteredItems : items}
      />

      {/* Shopify Direct API Integration Modal */}
      <ShopifyIntegrationModal
        isOpen={isShopifyModalOpen}
        onClose={() => {
          setIsShopifyModalOpen(false);
          setShopifyRefreshKey((k) => k + 1);
        }}
        inventoryItems={items}
        onOpenCsvExport={() => setIsShopifyExportOpen(true)}
        onSyncComplete={() => {
          loadInventory(isDemoMode, true);
          setShopifyRefreshKey((k) => k + 1);
        }}
      />

      {/* Quick Stock Adjust & Real-Time Shopify Sync Modal */}
      <StockAdjustModal
        isOpen={Boolean(stockAdjustItem)}
        onClose={() => setStockAdjustItem(null)}
        item={stockAdjustItem}
        onStockUpdated={handleStockUpdated}
        shopifyLocationName={shopifyStatus?.location_name || '123 William Street'}
      />
    </DashboardLayout>
  );
}
