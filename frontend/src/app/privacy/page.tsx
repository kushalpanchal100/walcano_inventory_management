import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', lineHeight: '1.7' }}>
      <header style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
          Privacy Policy
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Last Updated: January 1, 2026 | Wallcano &amp; Surfaces Tiles Inventory Management
        </p>
      </header>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>1. Introduction</h2>
        <p>
          Wallcano &amp; Surfaces Tiles (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) respects your privacy. This Privacy Policy explains 
          how information is collected, used, and safeguarded when you use our web-based inventory management platform at 
          <strong> inventory.surfacestiles.cloud</strong>.
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>2. QuickBooks Online Data Access</h2>
        <p>
          When you connect your Intuit QuickBooks Online account, our application requests OAuth access with the <code>com.intuit.quickbooks.accounting</code> scope. 
          We only access and synchronize data essential for inventory synchronization, including:
        </p>
        <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
          <li>Inventory item names, SKUs, and descriptions</li>
          <li>Quantities on hand and reorder thresholds</li>
          <li>Unit sales and purchase prices</li>
          <li>Company identifier (Realm ID) for establishing a secure multi-tenant connection</li>
        </ul>
        <p style={{ marginTop: '8px', fontWeight: 500, color: '#334155' }}>
          We do NOT store or process customer credit card numbers, bank account details, or personal banking credentials.
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>3. How We Use Information</h2>
        <p>Information retrieved from QuickBooks Online is strictly used to:</p>
        <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
          <li>Display real-time inventory counts and warehouse stock levels in your dashboard.</li>
          <li>Perform catalog mapping between QuickBooks items and Surfaces Tiles specification sheets.</li>
          <li>Generate stock restock alerts and downloadable inventory reports (CSV).</li>
        </ul>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>4. Data Protection &amp; Security</h2>
        <p>
          All communications between your browser, our servers, and Intuit API services are encrypted using industry-standard TLS 1.2 / TLS 1.3 encryption in transit. 
          OAuth access tokens and refresh tokens are securely encrypted and never shared with unauthorized third parties.
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>5. Data Retention &amp; Disconnection</h2>
        <p>
          You can disconnect your QuickBooks Online account at any time via the <strong>Disconnect</strong> option in the application dashboard 
          or via your Intuit Account Settings. Disconnecting immediately revokes our API access and purges stored authentication tokens from active sessions.
        </p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>6. Contact Us</h2>
        <p>
          If you have questions regarding this Privacy Policy or your data, please contact: <strong style={{ color: '#4f46e5' }}>privacy@surfacestiles.cloud</strong>.
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
