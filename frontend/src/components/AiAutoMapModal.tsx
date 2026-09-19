'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  getAiAutoMappings,
  acceptAiMapping,
  autoMapSingleProduct,
  AiMappingSuggestion,
  AiAutoMapResponse,
} from '@/lib/api';

interface AiAutoMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMappingApplied: () => void;
  isDemoMode?: boolean;
}

export default function AiAutoMapModal({
  isOpen,
  onClose,
  onMappingApplied,
  isDemoMode = false,
}: AiAutoMapModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<AiAutoMapResponse | null>(null);
  const [acceptedSet, setAcceptedSet] = useState<Set<string>>(new Set());
  const [processingItem, setProcessingItem] = useState<string | null>(null);
  const [regeneratingItem, setRegeneratingItem] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);

  // Quick Auto-Map custom input state
  const [customInput, setCustomInput] = useState<string>('');
  const [isCustomMapping, setIsCustomMapping] = useState<boolean>(false);
  const [customFeedback, setCustomFeedback] = useState<string | null>(null);

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
      setCustomFeedback(null);
    }
  }, [isOpen, isDemoMode]);

  const handleAcceptSingle = async (item: AiMappingSuggestion) => {
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

  const handleRegenerateSingle = async (item: AiMappingSuggestion) => {
    setRegeneratingItem(item.walcano_name);
    try {
      const res = await autoMapSingleProduct({
        walcano_name: item.walcano_name,
        sku: item.walcano_name,
        auto_save: false,
      });

      if (res.success && res.surfaces_name) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            suggestions: prev.suggestions.map((s) =>
              s.walcano_name === item.walcano_name
                ? {
                    ...s,
                    suggested_surfaces_name: res.surfaces_name,
                    confidence: res.confidence,
                    reasoning: res.reasoning,
                    is_unique: res.is_unique,
                    attributes: res.attributes,
                    provider: res.provider,
                  }
                : s
            ),
          };
        });
      }
    } catch (err: any) {
      console.error('Error regenerating unique name:', err);
    } finally {
      setRegeneratingItem(null);
    }
  };

  const handleCustomAutoMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    setIsCustomMapping(true);
    setCustomFeedback(null);

    try {
      const res = await autoMapSingleProduct({
        walcano_name: customInput.trim(),
        surfaces_name: customInput.trim(),
        auto_save: true,
      });

      if (res.success && res.surfaces_name) {
        setCustomFeedback(
          `Mapped "${res.walcano_name}" -> Unique Surfaces Name: "${res.surfaces_name}"`
        );
        // Prepend to suggestions list
        setData((prev) => ({
          unmapped_total: prev ? prev.unmapped_total : 1,
          suggestions_count: (prev ? prev.suggestions_count : 0) + 1,
          provider: res.provider,
          suggestions: [
            {
              walcano_name: res.walcano_name,
              suggested_surfaces_name: res.surfaces_name,
              confidence: res.confidence,
              reasoning: res.reasoning,
              is_unique: res.is_unique,
              attributes: res.attributes,
              provider: res.provider,
            },
            ...(prev ? prev.suggestions.filter((s) => s.walcano_name !== res.walcano_name) : []),
          ],
        }));
        setAcceptedSet((prev) => new Set(prev).add(res.walcano_name));
        onMappingApplied();
        setCustomInput('');
      } else {
        setCustomFeedback(`Failed: ${res.message || 'Could not map product'}`);
      }
    } catch (err: any) {
      setCustomFeedback(`Error: ${err.message || err}`);
    } finally {
      setIsCustomMapping(false);
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
      <div className="ai-modal-container">
        {/* Header */}
        <div className="ai-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  AI Auto-Mapping & Unique Name Generator
                </h3>
                <span className="pill pill-ai">
                  {data?.provider === 'gemini' ? 'Gemini AI Active' : 'Smart Catalog Engine'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Automatically maps Surfaces Tiles products to Walcano products and generates unique, consistent luxury product names using Gemini AI.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={fetchSuggestions}
              disabled={loading}
              title="Rescan"
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

        {/* Quick Auto-Map Specific Product Input Form */}
        <div
          style={{
            padding: '12px 24px',
            background: '#F8FAFC',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <form
            onSubmit={handleCustomAutoMapping}
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Auto-Map any Surfaces Tiles product or Walcano product (e.g. Carrara White 600x1200)..."
                disabled={isCustomMapping}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isCustomMapping || !customInput.trim()}
              className="btn btn-ai"
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isCustomMapping ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Generating Name...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Auto Mapping</span>
                </>
              )}
            </button>
          </form>

          {customFeedback && (
            <div
              style={{
                marginTop: '8px',
                fontSize: '11px',
                fontWeight: 600,
                color: customFeedback.startsWith('Mapped') ? '#16A34A' : '#DC2626',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Check size={12} />
              <span>{customFeedback}</span>
            </div>
          )}
        </div>

        {/* Sub-header Banner */}
        <div
          style={{
            padding: '10px 24px',
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
            <span style={{ fontWeight: 700, color: '#0F172A' }}>
              {suggestions.length} candidate items
            </span>
            <span>·</span>
            <span>{data?.unmapped_total || 0} unmapped items in catalog</span>
            {acceptedSet.size > 0 && (
              <>
                <span>·</span>
                <span style={{ color: '#16A34A', fontWeight: 700 }}>
                  {acceptedSet.size} mappings confirmed
                </span>
              </>
            )}
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

        {/* Modal Body / Suggestions List */}
        <div className="ai-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
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
                Analyzing tile specifications with Gemini AI...
              </p>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                Generating brand-consistent, unique Surfaces Tiles product names based on Walcano attributes.
              </p>
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <Check size={24} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                All Catalog Items Are Mapped!
              </h4>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', margin: '0 auto' }}>
                Every inventory product is currently linked to its corresponding Surfaces specification. Use the search bar above to map any custom product.
              </p>
            </div>
          ) : (
            suggestions.map((item, idx) => {
              const isAccepted = acceptedSet.has(item.walcano_name);
              const isProcessing = processingItem === item.walcano_name;
              const isRegen = regeneratingItem === item.walcano_name;
              const confPercent = Math.round(item.confidence * 100);

              let confStyle = {
                background: '#DCFCE7',
                color: '#15803D',
                border: '1px solid #86EFAC',
              };
              if (item.confidence < 0.7) {
                confStyle = {
                  background: '#FEF3C7',
                  color: '#B45309',
                  border: '1px solid #FDE68A',
                };
              }

              return (
                <div
                  key={idx}
                  className={`map-card ${isAccepted ? 'accepted' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Dual Brand Comparison Columns */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                      {/* Left: Wallcano Product */}
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
                            MAPPED WALCANO PRODUCT
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {item.walcano_name}
                        </div>
                      </div>

                      {/* Right: Suggested Surfaces Product */}
                      <div
                        style={{
                          padding: '10px 14px',
                          background: '#FEFDF8',
                          borderRadius: '8px',
                          border: '1px solid #FDE68A',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="pill pill-surfaces" style={{ fontSize: '9px', padding: '2px 6px' }}>
                              SURFACES PRODUCT
                            </span>
                            <span className="pill pill-ai" style={{ fontSize: '9px', padding: '2px 6px' }}>
                              ✨ Unique AI Name
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '10px',
                              ...confStyle,
                            }}
                          >
                            {confPercent}% Match
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#78350F', lineHeight: '1.3' }}>
                          {item.suggested_surfaces_name}
                        </div>

                        {item.attributes && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {item.attributes.dimensions && (
                              <span style={{ fontSize: '10px', background: '#F1F5F9', padding: '1px 5px', borderRadius: '4px', color: '#475569' }}>
                                📐 {item.attributes.dimensions}
                              </span>
                            )}
                            {item.attributes.finish && (
                              <span style={{ fontSize: '10px', background: '#F1F5F9', padding: '1px 5px', borderRadius: '4px', color: '#475569' }}>
                                ✨ {item.attributes.finish}
                              </span>
                            )}
                            {item.attributes.collection && (
                              <span style={{ fontSize: '10px', background: '#FEF3C7', padding: '1px 5px', borderRadius: '4px', color: '#92400E', fontWeight: 600 }}>
                                🏛️ {item.attributes.collection}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                      {isAccepted ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 700, fontSize: '13px' }}>
                          <Check size={16} />
                          <span>Mapping Saved</span>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAcceptSingle(item)}
                            disabled={isProcessing || isRegen || batchProcessing}
                            className="btn btn-ai"
                            style={{ padding: '8px 12px', width: '100%', fontSize: '12px' }}
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
                            onClick={() => handleRegenerateSingle(item)}
                            disabled={isProcessing || isRegen || batchProcessing}
                            className="btn btn-secondary"
                            style={{
                              padding: '5px 10px',
                              width: '100%',
                              fontSize: '11px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              color: '#7C3AED',
                              borderColor: '#DDD6FE',
                            }}
                            title="Generate another unique Surfaces product name with Gemini AI"
                          >
                            {isRegen ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : (
                              <Sparkles size={11} />
                            )}
                            <span>Auto Mapping</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* AI Reasoning Explanatory Line */}
                  <div
                    style={{
                      marginTop: '10px',
                      fontSize: '11px',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Sparkles size={13} color="#7C3AED" style={{ flexShrink: 0 }} />
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
            <span>Confirmed mappings persist permanently to the catalog and apply across CSV exports and inventory syncs.</span>
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
