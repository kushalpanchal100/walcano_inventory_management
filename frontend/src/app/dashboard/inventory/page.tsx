'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getLiveInventory,
  getQuickBooksStatus,
  getQuickBooksAuthUrl,
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
} from 'lucide-react';
import { downloadInventoryCsv } from '@/lib/csvExport';
import AiCopilotDrawer from '@/components/AiCopilotDrawer';
import AiAutoMapModal from '@/components/AiAutoMapModal';
import AiRestockModal from '@/components/AiRestockModal';

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
  const [isAutoMapOpen, setIsAutoMapOpen] = useState<boolean>(false);
  const [isRestockOpen, setIsRestockOpen] = useState<boolean>(false);

  const unmappedCount = useMemo(() => {
    return items.filter((i) => !i.is_mapped).length;
  }, [items]);

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
      const [status, inv] = await Promise.all([
        getQuickBooksStatus(),
        getLiveInventory({ demo }),
      ]);

      setQboStatus(status);
      setIsConnected(inv.connected);
      setIsDemoMode(inv.is_demo);
      setItems(inv.items || []);
      setCategories(inv.categories || []);
      setLastSynced(inv.last_synced || new Date().toISOString());
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
      if (stockFilter === 'in_stock' && item.qty_on_hand <= 10) return false;
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
    const inStock = items.filter((i) => i.qty_on_hand > 10).length;
    const lowStock = items.filter((i) => i.qty_on_hand > 0 && i.qty_on_hand <= 10).length;
    const outOfStock = items.filter((i) => i.qty_on_hand <= 0).length;
    const mappedCount = items.filter((i) => i.is_mapped).length;
    const unmappedCount = items.filter((i) => !i.is_mapped).length;

    return { totalProducts, totalQty, inStock, lowStock, outOfStock, mappedCount, unmappedCount };
  }, [items]);

  // CSV Export
  const handleExportCsv = useCallback(() => {
    const itemsToExport = filteredItems.length > 0 ? filteredItems : items;
    if (itemsToExport.length === 0) {
      alert('No inventory items available to export.');
      return;
    }

    setIsExporting(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `walcano_inventory_${dateStr}.csv`;
      const success = downloadInventoryCsv(itemsToExport, filename);
      if (success) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2500);
      }
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
      alert('Failed to generate CSV export.');
    } finally {
      setIsExporting(false);
    }
  }, [filteredItems, items]);

  return (
    <DashboardLayout
      headerTitle="Smart Inventory Management Platform"
      headerSubtitle="Real-time QuickBooks synchronization with intelligent cross-catalog mapping for Wallcano & Surfaces Tiles"
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search product name, Surfaces code, SKU, or category..."
      onRefreshClick={() => loadInventory(isDemoMode, true)}
      isRefreshing={isRefreshing}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* AI Copilot Button */}
          <button
            type="button"
            onClick={() => setIsCopilotOpen(true)}
            className="btn btn-ai"
            title="Open AI Inventory Assistant"
          >
            <Sparkles size={14} />
            <span>AI Copilot</span>
          </button>

          {/* AI Auto-Map Button */}
          <button
            type="button"
            onClick={() => setIsAutoMapOpen(true)}
            className="btn btn-secondary"
            title="AI catalog matching between Wallcano and Surfaces"
          >
            <Link2 size={14} color="var(--surfaces-gold)" />
            <span>Auto-Map</span>
            {unmappedCount > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#F1F5F9',
                  color: 'var(--wallcano-slate)',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                }}
              >
                {unmappedCount}
              </span>
            )}
          </button>

          {/* AI Restock Insights Button */}
          <button
            type="button"
            onClick={() => setIsRestockOpen(true)}
            className="btn btn-secondary"
            title="AI Stockout forecasting and replenishment recommendations"
          >
            <TrendingDown size={14} color="var(--surfaces-gold)" />
            <span>Restock AI</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={items.length === 0 || isLoading || isExporting}
            className="btn btn-primary"
            style={{
              background: exportSuccess ? '#16A34A' : '#0F172A',
              borderColor: exportSuccess ? '#16A34A' : '#0F172A',
            }}
          >
            {exportSuccess ? <Check size={14} /> : <Download size={14} />}
            <span>{exportSuccess ? 'Downloaded!' : 'Export CSV'}</span>
            {filteredItems.length > 0 && !exportSuccess && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '1px 6px',
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
      {/* ─── DUAL BRAND HERO BANNER ──────────────────────────────────── */}
      <div
        style={{
          background: '#FFFFFF',
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
                background: '#F8FAFC',
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
                background: '#FEFDF8',
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
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            background: '#F8FAFC',
            padding: '5px 14px',
            borderRadius: '20px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#16A34A' : 'var(--surfaces-gold)',
              boxShadow: isConnected ? '0 0 6px rgba(22, 163, 74, 0.4)' : '0 0 6px rgba(184, 134, 11, 0.35)',
            }}
          />
          <span>
            {isConnected
              ? `Live Sync: ${qboStatus?.company_name || 'Active'}`
              : isDemoMode
              ? 'Preview Demo Mode'
              : 'Direct API Mode'}
          </span>
        </div>
      </div>

      {/* ─── DEMO MODE BANNER ────────────────────────────────────────── */}
      {isDemoMode && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: '10px',
            background: '#FFFBEB',
            border: '1px solid #FCD34D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} color="#D97706" />
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                Demo Preview Mode Active
              </span>
              <span style={{ fontSize: '12px', color: '#B45309', marginLeft: '8px' }}>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Metric 1: Total Products */}
        <div
          className="stat-card stat-card-ribbon-total"
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
          onClick={() => setMappingFilter('mapped')}
          style={{ cursor: 'pointer' }}
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

        {/* Metric 3: Walcano Exclusive / Unmapped */}
        <div
          className="stat-card stat-card-ribbon-wallcano"
          onClick={() => setMappingFilter('unmapped')}
          style={{ cursor: 'pointer' }}
          title="Click to filter Walcano unmapped items"
        >
          <div className="stat-title" style={{ color: 'var(--wallcano-slate)' }}>
            <Unlink size={14} color="var(--wallcano-slate)" />
            <span>Walcano Exclusive</span>
          </div>
          <div className="stat-value" style={{ color: 'var(--wallcano-dark)' }}>
            {isLoading ? '-' : metrics.unmappedCount}
          </div>
          <div className="stat-desc" style={{ color: 'var(--text-muted)' }}>
            Unmapped / Exclusive to Walcano
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

        {/* Metric 5: In Stock Ratio */}
        <div
          className="stat-card stat-card-ribbon-instock"
          onClick={() => setStockFilter('in_stock')}
          style={{ cursor: 'pointer' }}
          title="Click to view in-stock items"
        >
          <div className="stat-title" style={{ color: '#16A34A' }}>
            <CheckCircle size={14} color="#16A34A" />
            <span>In Stock Items</span>
          </div>
          <div className="stat-value" style={{ color: '#15803D' }}>
            {isLoading ? '-' : metrics.inStock}
          </div>
          <div className="stat-desc">
            {metrics.outOfStock} out of stock · {metrics.lowStock} low
          </div>
        </div>
      </div>

      {/* ─── FILTERS & CONTROLS ──────────────────────────────────────── */}
      <div
        style={{
          background: '#FFFFFF',
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
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Catalog View:
            </span>
            <button
              type="button"
              onClick={() => setMappingFilter('all')}
              className={`btn ${mappingFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px' }}
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
                background: mappingFilter === 'unmapped' ? 'var(--wallcano-slate)' : '#F1F5F9',
                color: mappingFilter === 'unmapped' ? '#FFFFFF' : 'var(--wallcano-slate)',
                borderColor: mappingFilter === 'unmapped' ? 'var(--wallcano-slate)' : '#CBD5E1',
              }}
            >
              <Unlink size={13} />
              <span>Walcano Only ({metrics.unmappedCount})</span>
            </button>
          </div>

          {/* Stock Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                background: '#F8FAFC',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (&gt;10 units)</option>
              <option value="low_stock">Low Stock (1-10 units)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
            </select>

            {lastSynced && (
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                Synced: {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Category Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginRight: '4px' }}>
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
                  borderColor: isSelected ? '#0F172A' : 'var(--border-subtle)',
                  background: isSelected ? '#0F172A' : '#F8FAFC',
                  color: isSelected ? '#FFFFFF' : '#475569',
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
            background: '#FFFFFF',
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
                  <th style={{ width: '32%' }}>
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
                  <th style={{ width: '34%' }}>
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
                  <th style={{ width: '12%' }}>SKU</th>

                  {/* Column 4: Quantity on Hand */}
                  <th style={{ width: '12%' }}>Quantity on Hand</th>

                  {/* Column 5: Category */}
                  <th style={{ width: '10%' }}>Category</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => {
                  const isMapped = Boolean(item.is_mapped);
                  const walcanoDisplayName = item.walcano_name || item.name;

                  return (
                    <tr key={item.id || item.sku || index}>
                      {/* Column 1: Wallcano Tiles Product Name */}
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: '1.3' }}>
                          {walcanoDisplayName}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748B',
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

                      {/* Column 2: Surfaces Tiles Product Name */}
                      <td>
                        {isMapped && item.surfaces_name ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span className="pill pill-surfaces" style={{ fontSize: '9px', padding: '1px 5px' }}>
                                MAPPED
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#78350F', lineHeight: '1.3' }}>
                              {item.surfaces_name}
                            </div>
                            {item.surfaces_variants && item.surfaces_variants.length > 1 && (
                              <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>
                                {item.surfaces_variants.length} catalog variations
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="pill pill-neutral" style={{ fontSize: '10px' }}>
                              <Unlink size={10} color="#94A3B8" />
                              Unmapped
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsAutoMapOpen(true)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--surfaces-gold)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              Auto-Match
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
                            color: '#334155',
                            background: '#F1F5F9',
                            padding: '3px 7px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            display: 'inline-block',
                          }}
                        >
                          {item.sku || 'N/A'}
                        </span>
                      </td>

                      {/* Column 4: Quantity on Hand */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 800,
                              color: item.qty_on_hand <= 0 ? '#BE123C' : '#0F172A',
                            }}
                          >
                            {item.qty_on_hand.toLocaleString()}
                          </span>
                          {item.qty_on_hand <= 0 ? (
                            <span className="pill pill-outstock">Out of Stock</span>
                          ) : item.qty_on_hand <= 10 ? (
                            <span className="pill pill-lowstock">Low Stock</span>
                          ) : (
                            <span className="pill pill-instock">In Stock</span>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Category */}
                      <td>
                        <span className="pill pill-neutral">
                          {item.category || 'General'}
                        </span>
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
        onClose={() => setIsAutoMapOpen(false)}
        onMappingApplied={() => loadInventory(isDemoMode, true)}
        isDemoMode={isDemoMode}
      />

      <AiRestockModal
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        isDemoMode={isDemoMode}
      />
    </DashboardLayout>
  );
}
