'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle,
  Package,
  TrendingDown,
  RefreshCw,
  Download,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  getRestockInsights,
  RestockInsightsResponse,
  RestockRecommendation,
} from '@/lib/api';

interface AiRestockModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDemoMode?: boolean;
}

export default function AiRestockModal({
  isOpen,
  onClose,
  isDemoMode = false,
}: AiRestockModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<RestockInsightsResponse | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await getRestockInsights(10, isDemoMode);
      setData(res);
    } catch (err) {
      console.error('Failed to load restock insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInsights();
    }
  }, [isOpen, isDemoMode]);

  if (!isOpen) return null;

  const recommendations = data?.recommendations || [];
  const healthScore = data?.health_score ?? 85;

  return (
    <div className={`ai-modal-backdrop ${isOpen ? 'open' : ''}`}>
      <div className="ai-modal-container" style={{ maxWidth: '880px' }}>
        {/* Header */}
        <div className="ai-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  AI Inventory Health & Restock Insights
                </h3>
                <span className="pill pill-ai">
                  {data?.provider === 'gemini' ? 'AI Live Engine' : 'Heuristic Forecasting'}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Proactive reorder recommendations and stockout risk tiers
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={fetchInsights}
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

        {/* Health Score & Metrics Summary Bar */}
        <div
          style={{
            padding: '16px 24px',
            background: '#F8FAFC',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
          }}
        >
          {/* Health Score */}
          <div
            style={{
              padding: '12px 16px',
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Catalog Health Score
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: healthScore >= 80 ? '#16A34A' : '#D97706', marginTop: '4px' }}>
              {healthScore}%
            </div>
          </div>

          {/* Critical Risk */}
          <div
            style={{
              padding: '12px 16px',
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #FECDD3',
              borderLeft: '4px solid #E11D48',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#E11D48', textTransform: 'uppercase' }}>
              Stockout (0 Qty)
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#BE123C', marginTop: '4px' }}>
              {data?.critical_count ?? 0} items
            </div>
          </div>

          {/* Low Stock Warning */}
          <div
            style={{
              padding: '12px 16px',
              background: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #FDE68A',
              borderLeft: '4px solid #D97706',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>
              Low Stock Warning
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#B45309', marginTop: '4px' }}>
              {data?.low_stock_count ?? 0} items
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="ai-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid #E2E8F0',
                  borderTopColor: '#E11D48',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 16px',
                }}
              />
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                Calculating restock forecasting...
              </p>
            </div>
          ) : recommendations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--status-instock-bg, #DCFCE7)',
                  color: 'var(--status-instock-text, #16A34A)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <CheckCircle size={24} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Inventory Levels Are Optimal!
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
                All tiles in your QuickBooks inventory meet the minimum recommended buffer quantities.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
                Replenishment Recommendations ({recommendations.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recommendations.map((rec, idx) => {
                  const isCritical = rec.priority === 'Critical';
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        background: 'var(--bg-card)',
                        border: '1px solid',
                        borderColor: isCritical ? 'rgba(244, 63, 94, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                        boxShadow: 'var(--shadow-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            className={isCritical ? 'pill pill-outstock' : 'pill pill-lowstock'}
                            style={{ fontSize: '10px' }}
                          >
                            {rec.priority.toUpperCase()} RISK
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            SKU: {rec.sku || 'N/A'}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {rec.name}
                        </div>
                        {rec.surfaces_name && (
                          <div style={{ fontSize: '12px', color: 'var(--surfaces-gold-light)', marginTop: '2px' }}>
                            Surfaces: {rec.surfaces_name}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {rec.risk_reason}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'right' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current Stock</div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: rec.current_qty <= 0 ? '#BE123C' : '#D97706' }}>
                            {rec.current_qty} units
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '8px 14px',
                            background: 'var(--bg-subtle)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            Suggested Reorder
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                            +{rec.suggested_reorder_qty} units
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ai-modal-footer">
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            {data?.summary || 'Replenishment suggestions computed from live catalog quantities.'}
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
