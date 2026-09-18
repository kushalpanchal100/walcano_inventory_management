import React from 'react';
import Link from 'next/link';

export default function EulaPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', lineHeight: '1.7' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
          End-User License Agreement (EULA)
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Effective Date: January 1, 2026 | Walcano &amp; Surfaces Tiles Inventory Management
        </p>
      </header>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>1. Agreement to Terms</h2>
        <p>
          This End-User License Agreement (&ldquo;Agreement&rdquo;) is a legal agreement between you (&ldquo;User&rdquo; or &ldquo;Licensee&rdquo;) and 
          Walcano &amp; Surfaces Tiles (&ldquo;Licensor&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;) for the use of the Walcano Inventory Management application.
          By accessing or using our software, you agree to be bound by the terms and conditions set forth herein.
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>2. Scope of License</h2>
        <p>
          Licensor grants you a non-exclusive, non-transferable, revocable license to use the Walcano Inventory Management platform solely for internal 
          business operations, specifically inventory tracking, catalog mapping, and synchronized integration with QuickBooks Online accounting.
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>3. Integration with QuickBooks Online</h2>
        <p>
          Our application integrates with Intuit QuickBooks Online via official OAuth 2.0 APIs. You authorize the application to access necessary 
          inventory product listings, stock balances, and item details on your behalf for synchronization and AI catalog auto-mapping.
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>4. Restrictions</h2>
        <p>You agree not to:</p>
        <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
          <li>Reverse engineer, decompile, or disassemble any portion of the software.</li>
          <li>Use the software for unauthorized transmission or extraction of sensitive data.</li>
          <li>Resell, sublicense, or rent access to third parties without prior written consent.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>5. Disclaimer &amp; Limitation of Liability</h2>
        <p>
          The software is provided &ldquo;AS IS&rdquo; without warranties of any kind. In no event shall Licensor be liable for any indirect, 
          incidental, or consequential damages resulting from the use or inability to use this inventory application.
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>6. Termination &amp; Contact</h2>
        <p>
          This agreement remains effective until terminated. You may terminate it at any time by ceasing all use and disconnecting your 
          QuickBooks Online integration. For inquiries, please contact: <strong style={{ color: '#4f46e5' }}>support@surfacestiles.cloud</strong>.
        </p>
      </section>

      <footer style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '40px' }}>
        <Link href="/dashboard/inventory" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 500 }}>
          &larr; Return to Inventory Dashboard
        </Link>
      </footer>
    </div>
  );
}
