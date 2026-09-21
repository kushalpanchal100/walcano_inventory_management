'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  RefreshCw,
  Edit3,
  CheckCircle2,
  Tag,
  Sparkles,
} from 'lucide-react';
import {
  saveManualMapping,
  autoMapSingleProduct,
  QuickBooksInventoryItem,
} from '@/lib/api';

interface ManualMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: QuickBooksInventoryItem | null;
  onMappingSaved: (walcanoName: string, newSurfacesName: string) => void;
}

export default function ManualMapModal({
  isOpen,
  onClose,
  item,
  onMappingSaved,
}: ManualMapModalProps) {
  const [surfacesName, setSurfacesName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const walcanoName = (item?.walcano_name || item?.name || '').trim();

  useEffect(() => {
    if (isOpen && item) {
      setSurfacesName(item.surfaces_name || '');
      setErrorMessage(null);
      setIsSaving(false);
    } else {
      setSurfacesName('');
      setErrorMessage(null);
      setIsSaving(false);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = surfacesName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a new Surfaces Tiles product name.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await saveManualMapping(walcanoName, trimmed);
      if (res.success) {
        onMappingSaved(walcanoName, trimmed);
        onClose();
      } else {
        setErrorMessage(res.message || 'Failed to save manual mapping.');
      }
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoMapWithAi = async () => {
    if (!walcanoName) return;
    setIsGeneratingWithAi(true);
    setErrorMessage(null);
    try {
      const res = await autoMapSingleProduct({
        walcano_name: walcanoName,
        sku: item?.sku,
        category: item?.category,
        auto_save: false,
      });
      if (res.success && res.surfaces_name) {
        setSurfacesName(res.surfaces_name);
      } else {
        setErrorMessage(res.message || 'AI auto-mapping failed.');
      }
    } catch (err: any) {
      setErrorMessage(`Error generating name with AI: ${err.message || err}`);
    } finally {
      setIsGeneratingWithAi(false);
    }
  };

  return (
    <div className={`ai-modal-backdrop ${isOpen ? 'open' : ''}`}>
      <div
        className="ai-modal-container"
        style={{
          maxWidth: '520px',
          borderRadius: '14px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Header */}
        <div className="ai-modal-header" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
                flexShrink: 0,
              }}
            >
              <Edit3 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                Manual Product Mapping
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Map selected Wallcano product directly to Surfaces Tiles catalog
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px 8px', borderRadius: '6px' }}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="ai-modal-body" style={{ padding: '20px' }}>
            {/* Selected Wallcano Product Card */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                <span className="pill pill-wallcano" style={{ fontSize: '9px', padding: '2px 6px' }}>
                  SELECTED WALLCANO PRODUCT
                </span>
                {item.id && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    QBO ID: {item.id}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1.3', marginBottom: '6px' }}>
                {walcanoName}
              </div>

              <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                {item.sku && (
                  <span>
                    <strong>SKU:</strong> <code style={{ color: 'var(--surfaces-gold-light)', background: 'var(--bg-card)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--border-subtle)' }}>{item.sku}</code>
                  </span>
                )}
                {item.category && (
                  <span>
                    <strong>Category:</strong> {item.category}
                  </span>
                )}
                {item.qty_on_hand !== undefined && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <strong>Stock:</strong> {item.qty_on_hand.toLocaleString()}
                    {item.qty_on_hand <= 0 ? (
                      <span className="pill pill-outstock" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        Out of Stock
                      </span>
                    ) : (
                      <span className="pill pill-instock" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        In Stock
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Input Field: New Surfaces Tiles Product Name */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                <label
                  htmlFor="new-surfaces-name"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#1E293B',
                  }}
                >
                  <Tag size={13} color="#D97706" />
                  <span>New Surfaces Tiles Product Name</span>
                  <span style={{ color: '#DC2626' }}>*</span>
                </label>

                <button
                  type="button"
                  onClick={handleAutoMapWithAi}
                  disabled={isGeneratingWithAi || isSaving}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#7C3AED',
                    background: '#F5F3FF',
                    border: '1px solid #DDD6FE',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: isGeneratingWithAi || isSaving ? 'not-allowed' : 'pointer',
                    opacity: isGeneratingWithAi || isSaving ? 0.7 : 1,
                  }}
                  title="Generate a brand-compliant, unique Surfaces product name for this product using AI"
                >
                  <Sparkles size={11} className={isGeneratingWithAi ? 'animate-spin' : ''} />
                  <span>{isGeneratingWithAi ? 'Generating...' : '✨ Auto-Map with AI'}</span>
                </button>
              </div>
              <input
                id="new-surfaces-name"
                type="text"
                value={surfacesName}
                onChange={(e) => setSurfacesName(e.target.value)}
                placeholder="Enter new Surfaces Tiles product name..."
                autoFocus
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  background: 'var(--bg-input)',
                  border: '1.5px solid var(--border-medium)',
                  borderRadius: '8px',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                This name applies strictly to <strong>"{walcanoName}"</strong> and will be saved directly into the Surfaces catalog.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '12px',
                  marginBottom: '10px',
                }}
              >
                {errorMessage}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="ai-modal-footer" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 600 }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving || !surfacesName.trim()}
              className="btn btn-primary"
              style={{
                padding: '8px 18px',
                fontSize: '12px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                borderColor: '#B45309',
                color: '#FFFFFF',
                borderRadius: '7px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(180, 83, 9, 0.25)',
                cursor: 'pointer',
              }}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Mapping...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Map Product Manually</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
