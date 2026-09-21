'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  X,
  Check,
  RefreshCw,
  HelpCircle,
  Link2,
  CheckCircle2,
  ShieldCheck,
  Package,
  Layers,
  Pencil,
} from 'lucide-react';
import {
  autoMapSingleProduct,
  saveManualMapping,
  QuickBooksInventoryItem,
} from '@/lib/api';

interface AiAutoMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMappingApplied: () => void;
  isDemoMode?: boolean;
  inventoryItems?: QuickBooksInventoryItem[];
  initialSelectedWalcanoName?: string | null;
  targetItem?: QuickBooksInventoryItem | null;
}

export default function AiAutoMapModal({
  isOpen,
  onClose,
  onMappingApplied,
  isDemoMode = false,
  inventoryItems = [],
  initialSelectedWalcanoName = null,
  targetItem = null,
}: AiAutoMapModalProps) {
  // Specific Walcano product selection state (Single Source of Truth)
  const [selectedWalcanoName, setSelectedWalcanoName] = useState<string>('');
  const [isMappingSelected, setIsMappingSelected] = useState<boolean>(false);
  const [selectedMappingResult, setSelectedMappingResult] = useState<{
    walcanoName: string;
    surfacesName: string;
    confidence: number;
    reasoning: string;
    isUnique: boolean;
    attributes?: Record<string, any>;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual editing state inside modal
  const [isEditingManually, setIsEditingManually] = useState<boolean>(false);
  const [manualInputName, setManualInputName] = useState<string>('');
  const [isSavingManual, setIsSavingManual] = useState<boolean>(false);

  const handleSaveManualInModal = async () => {
    const trimmed = manualInputName.trim();
    if (!trimmed || !selectedWalcanoName) return;
    setIsSavingManual(true);
    setErrorMessage(null);

    try {
      const res = await saveManualMapping(selectedWalcanoName, trimmed);
      if (res.success) {
        setSelectedMappingResult({
          walcanoName: selectedWalcanoName,
          surfacesName: trimmed,
          confidence: 1.0,
          reasoning: 'Manually specified by user',
          isUnique: true,
          attributes: selectedMappingResult?.attributes,
        });
        setIsEditingManually(false);
        onMappingApplied();
      } else {
        setErrorMessage(res.message || 'Failed to save manual mapping');
      }
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message || err}`);
    } finally {
      setIsSavingManual(false);
    }
  };

  // Available unique Walcano product list strictly from active inventory
  const availableWalcanoProducts = useMemo(() => {
    const list: Array<{
      name: string;
      sku: string;
      category: string;
      qty_on_hand?: number;
      is_mapped: boolean;
      surfaces_name?: string | null;
    }> = [];
    const seen = new Set<string>();

    for (const item of inventoryItems) {
      const name = (item.walcano_name || item.name || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({
          name,
          sku: item.sku || '',
          category: item.category || 'Porcelain Tiles',
          qty_on_hand: item.qty_on_hand,
          is_mapped: Boolean(item.is_mapped),
          surfaces_name: item.surfaces_name,
        });
      }
    }
    return list;
  }, [inventoryItems]);

  const selectedProductObj = useMemo(() => {
    if (!selectedWalcanoName) return null;
    const match = availableWalcanoProducts.find(
      (p) => p.name.toLowerCase() === selectedWalcanoName.toLowerCase()
    );
    if (match) return match;
    if (targetItem && (targetItem.walcano_name || targetItem.name)?.toLowerCase() === selectedWalcanoName.toLowerCase()) {
      return {
        name: selectedWalcanoName,
        sku: targetItem.sku || '',
        category: targetItem.category || 'Porcelain Tiles',
        qty_on_hand: targetItem.qty_on_hand,
        is_mapped: Boolean(targetItem.is_mapped),
        surfaces_name: targetItem.surfaces_name,
      };
    }
    return {
      name: selectedWalcanoName,
      sku: '',
      category: 'Porcelain Tiles',
      is_mapped: false,
    };
  }, [selectedWalcanoName, availableWalcanoProducts, targetItem]);

  // Execute Auto Mapping for a specific product
  const runAutoMap = async (name: string, sku?: string, category?: string) => {
    if (!name) return;
    setIsMappingSelected(true);
    setErrorMessage(null);

    try {
      const res = await autoMapSingleProduct({
        walcano_name: name,
        sku: sku || undefined,
        category: category || undefined,
        auto_save: true,
      });

      if (res.success && res.surfaces_name) {
        setSelectedMappingResult({
          walcanoName: res.walcano_name,
          surfacesName: res.surfaces_name,
          confidence: res.confidence,
          reasoning: res.reasoning,
          isUnique: res.is_unique,
          attributes: res.attributes,
        });
        onMappingApplied();
      } else {
        setErrorMessage(res.message || 'Auto-mapping request failed.');
      }
    } catch (err: any) {
      setErrorMessage(`Error: ${err.message || err}`);
    } finally {
      setIsMappingSelected(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      const targetName =
        (targetItem?.walcano_name || targetItem?.name || initialSelectedWalcanoName || '').trim();

      if (targetName) {
        setSelectedWalcanoName(targetName);
        setSelectedMappingResult(null);
        // Automatically run AI Auto-Mapping for this specific product
        runAutoMap(targetName, targetItem?.sku, targetItem?.category);
      } else if (availableWalcanoProducts.length > 0) {
        // Pre-select first unmapped product if available
        const firstUnmapped = availableWalcanoProducts.find((p) => !p.is_mapped);
        const fallback = firstUnmapped ? firstUnmapped.name : availableWalcanoProducts[0].name;
        setSelectedWalcanoName(fallback);
        setSelectedMappingResult(null);
      }
    } else {
      setSelectedMappingResult(null);
      setErrorMessage(null);
      setIsMappingSelected(false);
    }
  }, [isOpen, initialSelectedWalcanoName, targetItem]);

  if (!isOpen) return null;

  // Unmapped products from current inventory excluding currently selected
  const otherUnmappedProducts = availableWalcanoProducts.filter(
    (p) => !p.is_mapped && p.name.toLowerCase() !== selectedWalcanoName.toLowerCase()
  );

  return (
    <div className={`ai-modal-backdrop ${isOpen ? 'open' : ''}`}>
      <div className="ai-modal-container" style={{ maxWidth: '850px' }}>
        {/* Header */}
        <div className="ai-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                flexShrink: 0,
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  AI Product Auto-Mapper
                </h3>
                <span className="pill pill-ai">AI Assisted</span>
                <span
                  style={{
                    fontSize: '11px',
                    background: 'rgba(124, 58, 237, 0.15)',
                    color: '#A78BFA',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 700,
                  }}
                >
                  Strict 1:1 Mapping
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                The selected Wallcano product is the <strong>single source of truth</strong> for generating the unique Surfaces Tiles product name.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '7px 10px' }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="ai-modal-body" style={{ padding: '24px' }}>
          {/* ─── 1. SELECTED WALLCANO PRODUCT (SINGLE SOURCE OF TRUTH) ─── */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="pill pill-wallcano" style={{ fontSize: '10px', padding: '2px 8px' }}>
                  SOURCE WALLCANO PRODUCT
                </span>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Single Source of Truth
                </span>
              </div>

              {selectedProductObj?.is_mapped && (
                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} />
                  Currently Mapped
                </span>
              )}
            </div>

            {/* Product Switcher / Selector */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <select
                  value={selectedWalcanoName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setSelectedWalcanoName(newName);
                    setSelectedMappingResult(null);
                    setErrorMessage(null);
                    const prod = availableWalcanoProducts.find((p) => p.name === newName);
                    runAutoMap(newName, prod?.sku, prod?.category);
                  }}
                  disabled={isMappingSelected}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-medium)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    background: 'var(--bg-input)',
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  {availableWalcanoProducts.length === 0 && (
                    <option value={selectedWalcanoName}>{selectedWalcanoName}</option>
                  )}
                  {availableWalcanoProducts.map((p, i) => (
                    <option key={i} value={p.name}>
                      {p.name} {p.sku ? `(${p.sku})` : ''} {p.is_mapped ? '✓ [Mapped]' : '⚠️ [Unmapped]'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  const prod = selectedProductObj;
                  runAutoMap(selectedWalcanoName, prod?.sku, prod?.category);
                }}
                disabled={isMappingSelected || !selectedWalcanoName}
                className="btn btn-ai"
                style={{
                  padding: '10px 18px',
                  fontSize: '12px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
                }}
              >
                {isMappingSelected ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>AI Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Auto Mapping</span>
                  </>
                )}
              </button>
            </div>

            {/* Product Meta Details */}
            {selectedProductObj && (
              <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                {selectedProductObj.sku && (
                  <span>
                    <strong>SKU:</strong> <code style={{ color: 'var(--surfaces-gold-light)', background: 'var(--bg-card)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>{selectedProductObj.sku}</code>
                  </span>
                )}
                {selectedProductObj.category && (
                  <span>
                    <strong>Category:</strong> {selectedProductObj.category}
                  </span>
                )}
                {selectedProductObj.qty_on_hand !== undefined && (
                  <span>
                    <strong>Stock:</strong> {selectedProductObj.qty_on_hand.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '13px' }}>
              <strong>Error:</strong> {errorMessage}
            </div>
          )}

          {/* ─── 2. GENERATED SURFACES TILES PRODUCT MATCH ─── */}
          {isMappingSelected ? (
            <div
              style={{
                padding: '36px 20px',
                borderRadius: '12px',
                background: '#FEFDF8',
                border: '2px dashed #FDE68A',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  border: '3px solid #FDE68A',
                  borderTopColor: '#B45309',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 14px',
                }}
              />
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#78350F', marginBottom: '6px' }}>
                AI is Generating Unique Surfaces Product Name...
              </h4>
              <p style={{ fontSize: '12px', color: '#92400E', maxWidth: '520px', margin: '0 auto' }}>
                Analyzing dimensions, finish, tone, and luxury collection syntax strictly for <strong>"{selectedWalcanoName}"</strong> to ensure a unique, non-colliding catalog entry.
              </p>
            </div>
          ) : selectedMappingResult ? (
            <div
              style={{
                padding: '20px 24px',
                borderRadius: '12px',
                background: '#FEFDF8',
                border: '2px solid #F59E0B',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.12)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pill pill-surfaces" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    MAPPED SURFACES TILES PRODUCT
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      background: '#DCFCE7',
                      color: '#15803D',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    ✓ 100% Derived from Selected Product
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    background: '#FEF3C7',
                    color: '#B45309',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {Math.round(selectedMappingResult.confidence * 100)}% Match
                </span>
              </div>

              {/* Unique Generated Name */}
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#78350F', marginBottom: '10px', lineHeight: '1.3' }}>
                {selectedMappingResult.surfacesName}
              </div>

              {/* Attribute Badges */}
              {selectedMappingResult.attributes && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {selectedMappingResult.attributes.dimensions && (
                    <span style={{ fontSize: '11px', background: '#FFFFFF', border: '1px solid #FDE68A', padding: '3px 9px', borderRadius: '6px', color: '#78350F', fontWeight: 700 }}>
                      📐 {selectedMappingResult.attributes.dimensions}
                    </span>
                  )}
                  {selectedMappingResult.attributes.finish && (
                    <span style={{ fontSize: '11px', background: '#FFFFFF', border: '1px solid #FDE68A', padding: '3px 9px', borderRadius: '6px', color: '#78350F', fontWeight: 700 }}>
                      ✨ {selectedMappingResult.attributes.finish}
                    </span>
                  )}
                  {selectedMappingResult.attributes.collection && (
                    <span style={{ fontSize: '11px', background: '#FFFFFF', border: '1px solid #FDE68A', padding: '3px 9px', borderRadius: '6px', color: '#92400E', fontWeight: 800 }}>
                      🏛️ {selectedMappingResult.attributes.collection} Collection
                    </span>
                  )}
                  {selectedMappingResult.attributes.tile_type && (
                    <span style={{ fontSize: '11px', background: '#FFFFFF', border: '1px solid #FDE68A', padding: '3px 9px', borderRadius: '6px', color: '#78350F', fontWeight: 600 }}>
                      📦 {selectedMappingResult.attributes.tile_type}
                    </span>
                  )}
                </div>
              )}

              {/* Reasoning Description */}
              <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '16px', background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                <Sparkles size={14} color="#7C3AED" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{selectedMappingResult.reasoning}</span>
              </div>

              {/* Manual Name Editor inside Modal */}
              {isEditingManually ? (
                <div style={{ marginBottom: '16px', padding: '14px 18px', background: '#FFFFFF', border: '1.5px solid #F59E0B', borderRadius: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#78350F', marginBottom: '6px' }}>
                    Custom Surfaces Tiles Product Name (Manual Entry):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={manualInputName}
                      onChange={(e) => setManualInputName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveManualInModal();
                        if (e.key === 'Escape') setIsEditingManually(false);
                      }}
                      placeholder="Enter custom Surfaces Tiles name..."
                      disabled={isSavingManual}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        background: 'var(--bg-input)',
                        borderRadius: '8px',
                        border: '1.5px solid var(--border-medium)',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveManualInModal}
                      disabled={isSavingManual || !manualInputName.trim()}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        background: '#16A34A',
                        borderColor: '#15803D',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {isSavingManual ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                      <span>Save Entry</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingManually(false)}
                      disabled={isSavingManual}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Status and Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '10px', borderTop: '1px dashed #FDE68A' }}>
                <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} />
                  Mapping successfully saved to catalog and synchronized with inventory!
                </span>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setManualInputName(selectedMappingResult.surfacesName);
                      setIsEditingManually(true);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '5px 12px', color: '#B45309', borderColor: '#FDE68A', background: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Edit this Surfaces product name manually"
                  >
                    <Pencil size={11} />
                    <span>Edit Manually</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const prod = selectedProductObj;
                      runAutoMap(selectedWalcanoName, prod?.sku, prod?.category);
                    }}
                    disabled={isMappingSelected}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '5px 12px', color: '#7C3AED', borderColor: '#DDD6FE', background: '#FFFFFF', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    title="Regenerate another unique variant with AI"
                  >
                    <RefreshCw size={12} className={isMappingSelected ? 'animate-spin' : ''} />
                    <span>Regenerate Unique Name</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '32px 20px',
                borderRadius: '12px',
                background: '#F8FAFC',
                border: '1.5px dashed #CBD5E1',
                textAlign: 'center',
              }}
            >
              <Layers size={32} color="#94A3B8" style={{ margin: '0 auto 10px' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Ready to Auto-Map "{selectedWalcanoName}"
              </h4>
              <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '420px', margin: '0 auto 14px' }}>
                Automatically generate a unique Surfaces Tiles product name using AI, or enter your own custom name manually.
              </p>

              {isEditingManually ? (
                <div style={{ maxWidth: '480px', margin: '0 auto 16px', padding: '14px', background: '#FFFFFF', border: '1.5px solid #F59E0B', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={manualInputName}
                      onChange={(e) => setManualInputName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveManualInModal();
                        if (e.key === 'Escape') setIsEditingManually(false);
                      }}
                      placeholder="Enter custom Surfaces Tiles name..."
                      disabled={isSavingManual}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveManualInModal}
                      disabled={isSavingManual || !manualInputName.trim()}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        background: '#16A34A',
                        borderColor: '#15803D',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      {isSavingManual ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                      <span>Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingManually(false)}
                      disabled={isSavingManual}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const prod = selectedProductObj;
                      runAutoMap(selectedWalcanoName, prod?.sku, prod?.category);
                    }}
                    className="btn btn-ai"
                    style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 800 }}
                  >
                    <Sparkles size={14} />
                    <span>Auto-Match with AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualInputName('');
                      setIsEditingManually(true);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Pencil size={12} />
                    <span>Enter Manually</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── 3. OTHER UNMAPPED INVENTORY ITEMS QUICK-SWITCH ─── */}
          {otherUnmappedProducts.length > 0 && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                Other Unmapped Items in Your Inventory ({otherUnmappedProducts.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {otherUnmappedProducts.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedWalcanoName(item.name);
                      setSelectedMappingResult(null);
                      setErrorMessage(null);
                      runAutoMap(item.name, item.sku, item.category);
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: '#475569',
                      background: '#FFFFFF',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title={`Switch to ${item.name} and Auto-Map`}
                  >
                    <Package size={11} color="#94A3B8" />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ai-modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B' }}>
            <HelpCircle size={13} />
            <span>Strict 1:1 mapping: only the selected Wallcano product is used to generate the Surfaces product name.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '7px 18px', fontWeight: 600 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
