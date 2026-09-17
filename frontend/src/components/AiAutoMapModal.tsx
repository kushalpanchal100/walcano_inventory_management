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
} from 'lucide-react';
import {
  getAiAutoMappings,
  acceptAiMapping,
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
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);

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
                  AI Catalog Auto-Mapper
                </h3>
                <span className="pill pill-ai">
                  {data?.provider === 'gemini' ? 'Gemini 2.5 Live' : 'Heuristic Engine'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Maps unmapped QuickBooks items to the Surfaces tile specification catalog by size, finish, and characteristics
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

        {/* Sub-header Banner */}
        <div
          style={{
            padding: '12px 24px',
            background: '#F8FAFC',
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
              {suggestions.length} candidate suggestions
            </span>
            <span>·</span>
            <span>{data?.unmapped_total || 0} unmapped items in QuickBooks</span>
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
                Analyzing tile catalog specifications...
              </p>
              <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                Cross-referencing Wallcano QuickBooks records with Surfaces master sheet
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
                Every QuickBooks inventory product is currently linked to its corresponding Surfaces specification.
              </p>
            </div>
          ) : (
            suggestions.map((item, idx) => {
              const isAccepted = acceptedSet.has(item.walcano_name);
              const isProcessing = processingItem === item.walcano_name;
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Dual Brand Comparison Columns */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
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
                            WALLCANO PRODUCT
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span className="pill pill-surfaces" style={{ fontSize: '9px', padding: '2px 6px' }}>
                            SURFACES MATCH
                          </span>
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
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#78350F' }}>
                          {item.suggested_surfaces_name}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div style={{ minWidth: '130px', display: 'flex', justifyContent: 'flex-end' }}>
                      {isAccepted ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16A34A', fontWeight: 700, fontSize: '13px' }}>
                          <Check size={16} />
                          <span>Mapped</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAcceptSingle(item)}
                          disabled={isProcessing || batchProcessing}
                          className="btn btn-ai"
                          style={{ padding: '8px 14px', width: '100%' }}
                        >
                          {isProcessing ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          <span>Accept Match</span>
                        </button>
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
            <span>Confirmed mappings persist permanently to the catalog and apply across CSV exports.</span>
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
