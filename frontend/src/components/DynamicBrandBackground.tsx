'use client';

import React, { useState, useEffect, useRef } from 'react';

interface DynamicBrandBackgroundProps {
  children?: React.ReactNode;
  variant?: 'dark' | 'light';
  isFixed?: boolean;
  showParticles?: boolean;
  interactive?: boolean;
  contentAlign?: 'center' | 'stretch';
  className?: string;
  style?: React.CSSProperties;
}

// Statically defined particles for consistent rendering and smooth hydration
const PARTICLES = [
  { id: 1, left: '8%', top: '22%', size: 3, delay: '0s', duration: '11s' },
  { id: 2, left: '16%', top: '78%', size: 4, delay: '2.5s', duration: '13s' },
  { id: 3, left: '26%', top: '35%', size: 2.5, delay: '4s', duration: '9s' },
  { id: 4, left: '38%', top: '85%', size: 3.5, delay: '1s', duration: '14s' },
  { id: 5, left: '48%', top: '15%', size: 2, delay: '3.2s', duration: '10s' },
  { id: 6, left: '62%', top: '65%', size: 3, delay: '5.5s', duration: '12s' },
  { id: 7, left: '74%', top: '28%', size: 4, delay: '1.8s', duration: '15s' },
  { id: 8, left: '84%', top: '72%', size: 2.5, delay: '3.8s', duration: '11.5s' },
  { id: 9, left: '92%', top: '40%', size: 3, delay: '0.8s', duration: '13.5s' },
  { id: 10, left: '12%', top: '50%', size: 2, delay: '6s', duration: '10.5s' },
  { id: 11, left: '80%', top: '88%', size: 3.5, delay: '2.2s', duration: '12.8s' },
  { id: 12, left: '55%', top: '92%', size: 2.5, delay: '4.7s', duration: '14.2s' },
];

export default function DynamicBrandBackground({
  children,
  variant = 'dark',
  isFixed = false,
  showParticles = true,
  interactive = true,
  contentAlign = 'center',
  className = '',
  style = {},
}: DynamicBrandBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isFixed) {
        setMousePos({ x: e.clientX, y: e.clientY, active: true });
      } else {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePos({ x, y, active: true });
      }
    };

    const handleMouseLeave = () => {
      setMousePos((prev) => ({ ...prev, active: false }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [interactive, isFixed]);

  // Background layers markup
  const backgroundLayers = (
    <>
      {/* ─── LAYER 1: Dynamic Brand Aurora Orbs ───────────────────────── */}
      {/* Surfaces Warm Champagne Gold Glow */}
      <div className="brand-bg-orb brand-bg-orb-gold" aria-hidden="true" />

      {/* Wallcano Deep Obsidian & Slate Glow */}
      <div className="brand-bg-orb brand-bg-orb-indigo" aria-hidden="true" />

      {/* Warm Amber Topaz Glow */}
      <div className="brand-bg-orb brand-bg-orb-amber" aria-hidden="true" />

      {/* Architectural Cool Slate Accent */}
      <div className="brand-bg-orb brand-bg-orb-slate" aria-hidden="true" />

      {/* ─── LAYER 2: Architectural Ceramic Tile Grid ────────────────── */}
      <div className="brand-bg-tile-grid" aria-hidden="true" />
      <div className="brand-bg-tile-dots" aria-hidden="true" />

      {/* ─── LAYER 3: Ambient Angled Light Sweep ─────────────────────── */}
      <div className="brand-bg-light-sweep" aria-hidden="true" />

      {/* ─── LAYER 4: Floating Mica / Tile Glaze Sparkles ────────────── */}
      {showParticles && (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              className="brand-bg-particle"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {/* ─── LAYER 5: Interactive Cursor Ambient Glow ────────────────── */}
      {interactive && (
        <div
          className="brand-bg-cursor-glow"
          style={{
            left: `${mousePos.x}px`,
            top: `${mousePos.y}px`,
            opacity: mousePos.active ? 1 : 0,
          }}
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <div
      ref={containerRef}
      className={`brand-bg-container brand-bg-${variant} ${className}`}
      style={{
        ...style,
        alignItems: contentAlign === 'stretch' ? 'stretch' : 'center',
        justifyContent: contentAlign === 'stretch' ? 'flex-start' : 'center',
      }}
    >
      {/* Either fixed to viewport (for dashboards) or relative to container (for auth cards) */}
      {isFixed ? (
        <div className="brand-bg-fixed-canvas" aria-hidden="true">
          {backgroundLayers}
        </div>
      ) : (
        backgroundLayers
      )}

      {/* ─── CONTENT SLOT (Cards, Forms, Dashboard layout) ─────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: contentAlign === 'stretch' ? 'stretch' : 'center',
          flex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
