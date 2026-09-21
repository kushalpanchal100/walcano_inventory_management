'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Package, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { QuickBooksInventoryItem, updateInventoryStock } from '@/lib/api';
import { ShopifyBagIcon } from './ShopifyIntegrationModal';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: QuickBooksInventoryItem | null;
  onStockUpdated: (sku: string, newQty: number) => void;
  shopifyLocationName?: string;
}

export default function StockAdjustModal({
  isOpen,
  onClose,
  item,
  onStockUpdated,
  shopifyLocationName = '123 William Street',
}: StockAdjustModalProps) {
  const [quantity, setQuantity] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setQuantity(Math.round(item.qty_on_hand || 0));
      setError(null);
      setSuccess(null);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const currentQty = Math.round(item.qty_on_hand || 0);
  const displayName = item.surfaces_name || item.walcano_name || item.name;

  const handleAdjustBy = (delta: number) => {
    setQuantity((prev) => Math.max(0, prev + delta));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity < 0) {
      setError('Quantity cannot be negative.');
      return;
    }

    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await updateInventoryStock(item.sku, quantity, item);
      if (res.success) {
        setSuccess(`Updated stock to ${quantity} and synchronized with Shopify!`);
        onStockUpdated(item.sku, quantity);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError(res.error || 'Failed to update stock quantity.');
      }
    } catch (err: any) {
      setError(err.message || 'Error updating stock.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
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
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '460px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color="var(--surfaces-gold)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Adjust Inventory Stock
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#EF4444',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                background: 'rgba(22, 163, 74, 0.1)',
                border: '1px solid rgba(22, 163, 74, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#16A34A',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle2 size={14} />
              <span>{success}</span>
            </div>
          )}

          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              SKU: <code style={{ fontFamily: 'monospace' }}>{item.sku}</code> • Current on-hand:{' '}
              <strong>{currentQty}</strong>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              New On-Hand Quantity
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value, 10) || 0))}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '18px',
                  fontWeight: 800,
                }}
              />
            </div>

            {/* Quick adjust chips */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleAdjustBy(-10)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => handleAdjustBy(10)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => handleAdjustBy(50)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                +50
              </button>
              <button
                type="button"
                onClick={() => handleAdjustBy(100)}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                +100
              </button>
            </div>
          </div>

          {/* Shopify Real-time Sync Note */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(16, 138, 0, 0.08)',
              border: '1px solid rgba(16, 138, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShopifyBagIcon size={16} />
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              <strong>Automatic Shopify Sync:</strong> Quantity change will immediately call Shopify’s{' '}
              <code style={{ fontFamily: 'monospace', color: '#108A00' }}>inventorySetQuantities</code> API at location{' '}
              <strong>{shopifyLocationName}</strong>.
            </div>
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: '12px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="btn btn-primary"
              style={{
                padding: '7px 16px',
                fontSize: '12px',
                background: '#108A00',
                borderColor: '#108A00',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isUpdating ? <RefreshCw size={13} className="spin" /> : <Check size={13} />}
              <span>{isUpdating ? 'Updating & Syncing...' : 'Update & Sync to Shopify'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
