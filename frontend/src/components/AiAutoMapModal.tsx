'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  X,
  Check,
  CheckCheck,
  RefreshCw,
  Layers,
  ArrowRight,
  Info,
  HelpCircle,
  Link2,
  Search,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import {
  getAiAutoMappings,
  acceptAiMapping,
  autoMapSingleProduct,
  AiMappingSuggestion,
  AiAutoMapResponse,
  QuickBooksInventoryItem,
} from '@/lib/api';

interface AiAutoMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMappingApplied: () => void;
  isDemoMode?: boolean;
  inventoryItems?: QuickBooksInventoryItem[];
  initialSelectedWalcanoName?: string | null;
}

export default function AiAutoMapModal({
  isOpen,
  onClose,
  onMappingApplied,
  isDemoMode = false,
  inventoryItems = [],
  initialSelectedWalcanoName = null,
}: AiAutoMapModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AiAutoMapResponse | null>(null);
  const [acceptedSet, setAcceptedSet] = useState<Set<string>>(new Set());
  const [processingItem, setProcessingItem] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);

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

  // Available unique Walcano product list
  const availableWalcanoProducts = useMemo(() => {
    const list: Array<{ name: string; sku: string; category: string; is_mapped: boolean; surfaces_name?: string | null }> = [];
    const seen = new Set<string>();

    for (const item of inventoryItems) {
      const name = (item.walcano_name || item.name || '').trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({
          name,
          sku: item.sku || '',
          category: item.category || 'Porcelain Tiles',
          is_mapped: Boolean(item.is_mapped),
          surfaces_name: item.surfaces_name,
        });
      }
    }

    // Add any from suggestion list not yet seen
    if (data?.suggestions) {
      for (const s of data.suggestions) {
        if (s.walcano_name && !seen.has(s.walcano_name.toLowerCase())) {
          seen.add(s.walcano_name.toLowerCase());
          list.push({
            name: s.walcano_name,
            sku: '',
            category: 'Porcelain Tiles',
            is_mapped: false,
          });
        }
      }
    }

    return list;
  }, [inventoryItems, data]);

  const selectedProductObj = useMemo(() => {
    if (!selectedWalcanoName) return null;
    return (
      availableWalcanoProducts.find(
        (p) => p.name.toLowerCase() === selectedWalcanoName.toLowerCase()
      ) || {
        name: selectedWalcanoName,
        sku: '',
        category: 'Porcelain Tiles',
        is_mapped: false,
      }
    );
  }, [selectedWalcanoName, availableWalcanoProducts]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await getAiAutoMappings(isDemoMode);
      setData(res);
      setAcceptedSet(new Set());
    } catch (err) {
      console.error('Failed to fetch AI auto-mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
      setSelectedMappingResult(null);
      setErrorMessage(null);

      if (initialSelectedWalcanoName) {
        setSelectedWalcanoName(initialSelectedWalcanoName);
      } else if (availableWalcanoProducts.length > 0 && !selectedWalcanoName) {
        // Pre-select first unmapped product if available, else first product
        const firstUnmapped = availableWalcanoProducts.find((p) => !p.is_mapped);
        setSelectedWalcanoName(firstUnmapped ? firstUnmapped.name : availableWalcanoProducts[0].name);
      }
    }
  }, [isOpen, initialSelectedWalcanoName, isDemoMode]);

  // Execute Auto Mapping for the SPECIFIC SELECTED Walcano product (Single Source of Truth)
  const handleAutoMapSelected = async () => {
    if (!selectedWalcanoName) {
      setErrorMessage('Please select a specific Walcano product first.');
      return;
    }

    setIsMappingSelected(true);
    setErrorMessage(null);

    const product = selectedProductObj || {
      name: selectedWalcanoName,
      sku: '',
      category: 'Porcelain Tiles',
    };

    try {
      const res = await autoMapSingleProduct({
        walcano_name: product.name,
        sku: product.sku,
        category: product.category,
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
        setAcceptedSet((prev) => new Set(prev).add(res.walcano_name));
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

  const handleSelectAndAutoMap = (item: { name: string; sku?: string; category?: string }) => {
    setSelectedWalcanoName(item.name);
    setSelectedMappingResult(null);
    setErrorMessage(null);
  };

  const handleAcceptSuggestion = async (item: AiMappingSuggestion) => {
    setProcessingItem(item.walcano_name);
    try {
      const res = await acceptAiMapping(
        item.walcano_name,
        item.suggested_surfaces_name,
        item.confidence,
        item.reasoning
      );
      if (res.success) {
        setAcceptedSet((prev) => new Set(prev).add(item.walcano_name));
        onMappingApplied();
      } else {
        alert(`Failed to save mapping: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Error saving mapping: ${err.message || err}`);
    } finally {
      setProcessingItem(null);
    }
  };

  const handleAcceptAllHighConfidence = async () => {
    if (!data?.suggestions) return;
    const highConf = data.suggestions.filter(
      (s) => s.confidence >= 0.8 && !acceptedSet.has(s.walcano_name)
    );
    if (highConf.length === 0) return;

    setBatchProcessing(true);
    try {
      for (const item of highConf) {
        await acceptAiMapping(
          item.walcano_name,
          item.suggested_surfaces_name,
          item.confidence,
          item.reasoning
        );
        setAcceptedSet((prev) => new Set(prev).add(item.walcano_name));
      }
      onMappingApplied();
    } catch (err: any) {
      console.error('Batch accept error:', err);
    } finally {
      setBatchProcessing(false);
    }
  };

  if (!isOpen) return null;

  const suggestions = data?.suggestions || [];
  const highConfidenceCount = suggestions.filter(
    (s) => s.confidence >= 0.8 && !acceptedSet.has(s.walcano_name)
  ).length;

  return (
    <div className={`ai-modal-backdrop ${isOpen ? 'open' : ''}`}>
      <div className="ai-modal-container" style={{ maxWidth: '900px' }}>
        {/* Header */}
        <div className="ai-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  AI Auto-Mapping Studio
                </h3>
                <span className="pill pill-ai">Gemini AI</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Select a specific Walcano product as the single source of truth to automatically map and generate its unique Surfaces Tiles product name.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={fetchSuggestions}
              disabled={loading}
              title="Rescan catalog"
              className="btn btn-secondary"
              style={{ padding: '7px 10px' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '7px 10px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ─── WORKFLOW SECTION: SELECT SPECIFIC WALCANO PRODUCT & AUTO-MAP ─── */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)',
            borderBottom: '2px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span
              style={{
                background: '#7C3AED',
                color: '#FFFFFF',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 800,
              }}
            >
              1
            </span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
              Select Specific Walcano Product (Single Source of Truth)
            </span>
            <span
              style={{
                fontSize: '11px',
                background: '#EDE9FE',
                color: '#6D28D9',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 700,
              }}
            >
              Strict 1:1 Mapping
            </span>
          </div>

          {/* Product Dropdown Selector */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <select
                value={selectedWalcanoName}
                onChange={(e) => {
                  setSelectedWalcanoName(e.target.value);
                  setSelectedMappingResult(null);
                  setErrorMessage(null);
                }}
                disabled={isMappingSelected}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  background: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <option value="">-- Choose a specific Walcano product --</option>
                {availableWalcanoProducts.map((p, i) => (
                  <option key={i} value={p.name}>
                    {p.name} {p.sku ? `(${p.sku})` : ''} {p.is_mapped ? '✓ [Already Mapped]' : '⚠️ [Unmapped]'}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Mapping Button */}
            <button
              type="button"
              onClick={handleAutoMapSelected}
              disabled={isMappingSelected || !selectedWalcanoName}
              className="btn btn-ai"
              style={{
                padding: '10px 22px',
                fontSize: '13px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
              }}
            >
              {isMappingSelected ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Gemini AI Generating Name...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Auto Mapping</span>
                </>
              )}
            </button>
          </div>

          {/* Selected Product Details Card */}
          {selectedProductObj && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '10px',
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pill pill-wallcano" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    SELECTED WALCANO SOURCE
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Single source of truth for Gemini AI
                  </span>
                </div>
                {selectedProductObj.is_mapped && (
                  <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} />
                    Currently Mapped in Catalog
                  </span>
                )}
              </div>

              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                {selectedProductObj.name}
              </div>

              <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#475569', flexWrap: 'wrap' }}>
                {selectedProductObj.sku && (
                  <span>
                    <strong>SKU:</strong> {selectedProductObj.sku}
                  </span>
                )}
                {selectedProductObj.category && (
                  <span>
                    <strong>Category:</strong> {selectedProductObj.category}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '12px' }}>
              {errorMessage}
            </div>
          )}

          {/* Generated Result Card (Derived Solely from Selected Walcano Product) */}
          {selectedMappingResult && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px 20px',
                borderRadius: '10px',
                background: '#FEFDF8',
                border: '2px solid #F59E0B',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)',
                animation: 'fadeIn 0.25s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="pill pill-surfaces" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    GENERATED SURFACES TILES PRODUCT
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
                    fontWeight: 700,
                    background: '#FEF3C7',
                    color: '#B45309',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {Math.round(selectedMappingResult.confidence * 100)}% Confidence
                </span>
              </div>

              <div style={{ fontSize: '16px', fontWeight: 800, color: '#78350F', marginBottom: '8px' }}>
                {selectedMappingResult.surfacesName}
              </div>

              {selectedMappingResult.attributes && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  {selectedMappingResult.attributes.dimensions && (
                    <span style={{ fontSize: '11px', background: '#FFFFFF', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '6px', color: '#78350F', fontWeight: 600 }}>
                      📐 {selectedMappingResult.attributes.dimensions}
                    </span>
                  )}
                  {selectedMappingResult.attributes.finish && (
                    <span style={{ fontSize: '11px', background: '#FFFFFF', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '6px', color: '#78350F', fontWeight: 600 }}>
                      ✨ {selectedMappingResult.attributes.finish}
                    </span>
                  )}
                  {selectedMappingResult.attributes.collection && (
                    <span style={{ fontSize: '11px', background: '#FFFFFF', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '6px', color: '#92400E', fontWeight: 700 }}>
                      🏛️ {selectedMappingResult.attributes.collection}
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px dashed #FDE68A' }}>
                <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} />
                  Mapped and saved directly to catalog for "{selectedMappingResult.walcanoName}"
                </span>
                <button
                  type="button"
                  onClick={handleAutoMapSelected}
                  disabled={isMappingSelected}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 10px', color: '#7C3AED' }}
                >
                  <RefreshCw size={11} className={isMappingSelected ? 'animate-spin' : ''} />
                  <span>Regenerate for this Walcano product</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── CATALOG OVERVIEW & QUICK SELECTION ──────────────────────── */}
        <div
          style={{
            padding: '12px 24px',
            background: '#FFFFFF',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#475569' }}>
            <span style={{ fontWeight: 800, color: '#0F172A' }}>
              Catalog Suggestions & Unmapped Queue
            </span>
            <span>·</span>
            <span>{suggestions.length} items ready for review</span>
          </div>

          {highConfidenceCount > 0 && (
            <button
              type="button"
              onClick={handleAcceptAllHighConfidence}
              disabled={batchProcessing}
              className="btn btn-ai"
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              <CheckCheck size={14} />
              <span>Accept High Confidence ({highConfidenceCount})</span>
            </button>
          )}
        </div>

        {/* Suggestions List */}
        <div className="ai-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid #E2E8F0',
                  borderTopColor: '#7C3AED',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 16px',
                }}
              />
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Analyzing tile catalog with Gemini AI...
              </p>
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <CheckCircle2 size={36} color="#16A34A" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                All Catalog Items Mapped
              </h4>
              <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '420px', margin: '0 auto' }}>
                Every QuickBooks inventory product is currently linked. You can still select any product above to regenerate its unique Surfaces name.
              </p>
            </div>
          ) : (
            suggestions.map((item, idx) => {
              const isAccepted = acceptedSet.has(item.walcano_name);
              const isProcessing = processingItem === item.walcano_name;
              const isCurrentlySelected = selectedWalcanoName.toLowerCase() === item.walcano_name.toLowerCase();

              return (
                <div
                  key={idx}
                  className={`map-card ${isAccepted ? 'accepted' : ''}`}
                  style={{
                    borderColor: isCurrentlySelected ? '#7C3AED' : undefined,
                    background: isCurrentlySelected ? '#FBF9FF' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                      {/* Walcano Product */}
                      <div
                        style={{
                          padding: '10px 14px',
                          background: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span className="pill pill-wallcano" style={{ fontSize: '9px', padding: '2px 6px' }}>
                            SOURCE WALCANO PRODUCT
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {item.walcano_name}
                        </div>
                      </div>

                      {/* Surfaces Product */}
                      <div
                        style={{
                          padding: '10px 14px',
                          background: '#FEFDF8',
                          borderRadius: '8px',
                          border: '1px solid #FDE68A',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span className="pill pill-surfaces" style={{ fontSize: '9px', padding: '2px 6px' }}>
                            SURFACES MATCH
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 800, background: '#FEF3C7', color: '#B45309', padding: '2px 6px', borderRadius: '10px' }}>
                            {Math.round(item.confidence * 100)}% Match
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#78350F' }}>
                          {item.suggested_surfaces_name}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                      {isAccepted ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 700, fontSize: '12px' }}>
                          <Check size={16} />
                          <span>Mapping Saved</span>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAcceptSuggestion(item)}
                            disabled={isProcessing || batchProcessing}
                            className="btn btn-ai"
                            style={{ padding: '7px 12px', fontSize: '12px', width: '100%' }}
                          >
                            {isProcessing ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} />
                            )}
                            <span>Accept Match</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAndAutoMap({ name: item.walcano_name })}
                            className="btn btn-secondary"
                            style={{
                              padding: '5px 10px',
                              fontSize: '11px',
                              color: '#7C3AED',
                              borderColor: '#DDD6FE',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                            title="Select as the single source of truth for Auto Mapping"
                          >
                            <Sparkles size={11} />
                            <span>Select for Auto Mapping</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={12} color="#7C3AED" style={{ flexShrink: 0 }} />
                    <span>{item.reasoning}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="ai-modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B' }}>
            <HelpCircle size={13} />
            <span>The selected Walcano product is the single source of truth for the generated Surfaces Tiles product name.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '7px 16px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
