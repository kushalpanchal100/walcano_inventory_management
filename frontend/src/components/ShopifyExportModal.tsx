'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  Check,
  Building2,
  FileSpreadsheet,
  Layers,
  Info,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { QuickBooksInventoryItem } from '@/lib/api';
import {
  SHOPIFY_INVENTORY_CSV_HEADERS,
  DEFAULT_SHOPIFY_LOCATION,
  SHOPIFY_LOCATION_STORAGE_KEY,
  downloadInventoryCsv,
  itemToShopifyInventoryRow,
  ShopifyInventoryRowData,
  ShopifyExportOptions,
} from '@/lib/csvExport';

interface ShopifyExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuickBooksInventoryItem[];
}

export default function ShopifyExportModal({
  isOpen,
  onClose,
  items,
}: ShopifyExportModalProps) {
  const [location, setLocation] = useState<string>(DEFAULT_SHOPIFY_LOCATION);
  const [fillOnHandNew, setFillOnHandNew] = useState<boolean>(true);
  const [defaultBinName, setDefaultBinName] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [showAllColumns, setShowAllColumns] = useState<boolean>(false);

  // Load persisted location from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLocation = localStorage.getItem(SHOPIFY_LOCATION_STORAGE_KEY);
      if (savedLocation && savedLocation.trim()) {
        setLocation(savedLocation.trim());
      }
    }
  }, [isOpen]);

  // Compute live preview rows based on current modal options
  const previewRows = useMemo<ShopifyInventoryRowData[]>(() => {
    if (!items || items.length === 0) return [];
    const previewOptions: ShopifyExportOptions = {
      location: location || DEFAULT_SHOPIFY_LOCATION,
      fillOnHandNew,
      defaultBinName,
    };
    return items.slice(0, 5).map((it) => itemToShopifyInventoryRow(it, previewOptions));
  }, [items, location, fillOnHandNew, defaultBinName]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.qty_on_hand || 0), 0);
  }, [items]);

  if (!isOpen) return null;

  const handleExport = () => {
    if (items.length === 0) return;

    setIsExporting(true);
    try {
      const finalLocation = location.trim() || DEFAULT_SHOPIFY_LOCATION;

      // Persist location for future exports
      if (typeof window !== 'undefined') {
        localStorage.setItem(SHOPIFY_LOCATION_STORAGE_KEY, finalLocation);
      }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `shopify_inventory_${dateStr}.csv`;

      const success = downloadInventoryCsv(items, {
        location: finalLocation,
        fillOnHandNew,
        defaultBinName: defaultBinName.trim(),
        customFilename: filename,
      });

      if (success) {
        setExportSuccess(true);
        setTimeout(() => {
          setExportSuccess(false);
          onClose();
        }, 1400);
      }
    } catch (err) {
      console.error('Failed to export Shopify inventory CSV:', err);
      alert('Failed to generate Shopify CSV export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#95BF47', // Shopify Green
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(149, 191, 71, 0.3)',
                flexShrink: 0,
              }}
            >
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: 0,
                  }}
                >
                  Export Shopify Inventory CSV
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    border: '1px solid #A7F3D0',
                  }}
                >
                  19 Columns Exact Format
                </span>
              </div>
              <p
                style={{
                  fontSize: '13px',
                  color: '#64748B',
                  margin: '4px 0 0 0',
                }}
              >
                Directly importable into Shopify Inventory without requiring manual edits.
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
              color: '#94A3B8',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Quick Notice */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
              <strong>Shopify Import Specification:</strong> The exported file follows{' '}
              <code>inventory_bin_new_on_hand_template.csv</code> with all 19 columns in order.
              Shopify uses <strong>On hand (new)</strong> to apply inventory updates at your specified{' '}
              <strong>Location</strong>.
            </div>
          </div>

          {/* Configuration Settings */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Shopify Location */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1E293B',
                  marginBottom: '6px',
                }}
              >
                <Building2 size={15} color="#2563EB" />
                <span>Shopify Location Name</span>
              </label>
              <p
                style={{
                  fontSize: '12px',
                  color: '#64748B',
                  margin: '0 0 10px 0',
                  lineHeight: 1.4,
                }}
              >
                Must match an existing location in your Shopify admin (Settings → Locations).
              </p>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. 123 William Street"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  marginTop: '6px',
                  fontSize: '11px',
                  color: '#94A3B8',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Default: 123 William Street</span>
                <span>Auto-saved</span>
              </div>
            </div>

            {/* Bin Name Default */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1E293B',
                  marginBottom: '6px',
                }}
              >
                <Sliders size={15} color="#8B5CF6" />
                <span>Bin Name / Rack (Optional)</span>
              </label>
              <p
                style={{
                  fontSize: '12px',
                  color: '#64748B',
                  margin: '0 0 10px 0',
                  lineHeight: 1.4,
                }}
              >
                Default bin name for items without a designated warehouse bin.
              </p>
              <input
                type="text"
                value={defaultBinName}
                onChange={(e) => setDefaultBinName(e.target.value)}
                placeholder="Leave blank or e.g. A1-01-001"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  marginTop: '6px',
                  fontSize: '11px',
                  color: '#94A3B8',
                }}
              >
                Blank if warehouse does not use bin codes
              </div>
            </div>
          </div>

          {/* On Hand (new) Mode Selector */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1E293B',
                marginBottom: '10px',
              }}
            >
              Inventory Update Behavior: &quot;On hand (new)&quot; Column
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: fillOnHandNew
                    ? '1.5px solid #16A34A'
                    : '1px solid #CBD5E1',
                  backgroundColor: fillOnHandNew ? '#F0FDF4' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="onHandMode"
                  checked={fillOnHandNew}
                  onChange={() => setFillOnHandNew(true)}
                  style={{ marginTop: '3px', accentColor: '#16A34A' }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: fillOnHandNew ? '#15803D' : '#334155',
                    }}
                  >
                    Direct Shopify Import (Recommended)
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748B',
                      marginTop: '2px',
                      lineHeight: 1.4,
                    }}
                  >
                    Populates <strong>&quot;On hand (new)&quot;</strong> with current stock counts so
                    Shopify immediately applies the updated quantities upon import with zero manual
                    adjustments.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: !fillOnHandNew
                    ? '1.5px solid #2563EB'
                    : '1px solid #CBD5E1',
                  backgroundColor: !fillOnHandNew ? '#EFF6FF' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name="onHandMode"
                  checked={!fillOnHandNew}
                  onChange={() => setFillOnHandNew(false)}
                  style={{ marginTop: '3px', accentColor: '#2563EB' }}
                />
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: !fillOnHandNew ? '#1D4ED8' : '#334155',
                    }}
                  >
                    Blank Adjustment Template
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748B',
                      marginTop: '2px',
                      lineHeight: 1.4,
                    }}
                  >
                    Leaves <strong>&quot;On hand (new)&quot;</strong> blank (empty). Use this if you want to
                    open the CSV in a spreadsheet editor and manually enter delta quantities before
                    importing.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Live Data Preview Table */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} color="#475569" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Live Export Preview (First {previewRows.length} of {items.length} records)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAllColumns(!showAllColumns)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#2563EB',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 6px',
                }}
              >
                {showAllColumns ? 'Show key columns' : 'Show all 19 columns'}
              </button>
            </div>

            <div
              style={{
                overflowX: 'auto',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '11.5px',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Handle</th>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Title</th>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Option1 Name</th>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Option1 Value</th>
                    {showAllColumns && (
                      <>
                        <th style={{ padding: '8px 10px', color: '#475569' }}>Option2 Name</th>
                        <th style={{ padding: '8px 10px', color: '#475569' }}>Option2 Value</th>
                        <th style={{ padding: '8px 10px', color: '#475569' }}>Option3 Name</th>
                        <th style={{ padding: '8px 10px', color: '#475569' }}>Option3 Value</th>
                      </>
                    )}
                    <th style={{ padding: '8px 10px', color: '#475569' }}>SKU</th>
                    {showAllColumns && (
                      <>
                        <th style={{ padding: '8px 10px', color: '#475569' }}>HS Code</th>
                        <th style={{ padding: '8px 10px', color: '#475569' }}>COO</th>
                      </>
                    )}
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Location</th>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Bin name</th>
                    {showAllColumns && (
                      <>
                        <th style={{ padding: '8px 10px', color: '#475569' }}>Incoming</th>
                        <th style={{ padding: '8px 10px', color: '#475569' }}>Unavailable</th>
                        <th style={{ padding: '8px 10px', color: '#475569' }}>Committed</th>
                      </>
                    )}
                    <th style={{ padding: '8px 10px', color: '#475569' }}>Available</th>
                    <th style={{ padding: '8px 10px', color: '#475569' }}>On hand (current)</th>
                    <th
                      style={{
                        padding: '8px 10px',
                        color: '#15803D',
                        backgroundColor: '#DCFCE7',
                        fontWeight: 700,
                      }}
                    >
                      On hand (new)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748B' }}>
                        {row.handle}
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0F172A' }}>
                        {row.title}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{row.option1Name}</td>
                      <td style={{ padding: '8px 10px', color: '#334155' }}>{row.option1Value}</td>
                      {showAllColumns && (
                        <>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>
                            {row.option2Name || '-'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>
                            {row.option2Value || '-'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>
                            {row.option3Name || '-'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>
                            {row.option3Value || '-'}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#334155' }}>
                        {row.sku || '-'}
                      </td>
                      {showAllColumns && (
                        <>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>
                            {row.hsCode || '-'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>
                            {row.coo || '-'}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '8px 10px', color: '#0F172A' }}>{row.location}</td>
                      <td style={{ padding: '8px 10px', color: '#64748B' }}>
                        {row.binName || '-'}
                      </td>
                      {showAllColumns && (
                        <>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>{row.incoming}</td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>{row.unavailable}</td>
                          <td style={{ padding: '8px 10px', color: '#64748B' }}>{row.committed}</td>
                        </>
                      )}
                      <td style={{ padding: '8px 10px', color: '#0F172A', fontWeight: 600 }}>
                        {row.available}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#0F172A', fontWeight: 600 }}>
                        {row.onHandCurrent}
                      </td>
                      <td
                        style={{
                          padding: '8px 10px',
                          color: row.onHandNew ? '#166534' : '#94A3B8',
                          backgroundColor: '#F0FDF4',
                          fontWeight: 700,
                        }}
                      >
                        {row.onHandNew || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                marginTop: '6px',
                fontSize: '11px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Info size={12} />
              <span>
                Total columns in exported file:{' '}
                <strong>{SHOPIFY_INVENTORY_CSV_HEADERS.length} columns</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '13px',
                color: '#475569',
              }}
            >
              Ready to export: <strong>{items.length} items</strong> ({totalQuantity.toLocaleString()} total units)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || items.length === 0}
              style={{
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: exportSuccess ? '#16A34A' : '#108A00', // Shopify vibrant action green
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(16, 138, 0, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              {exportSuccess ? <Check size={16} /> : <Download size={16} />}
              <span>{exportSuccess ? 'Downloaded!' : 'Download Shopify CSV'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
