import React from 'react';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '50px 20px 20px 20px', marginTop: '60px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'space-between' }}>
        
        {/* Brand Section */}
        <div style={{ flex: '1 1 250px' }}>
          <h4 style={{ fontSize: '20px', marginBottom: '16px', color: '#ffffff', fontWeight: '700' }}>UPPCS ONE</h4>
          <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: '1.6' }}>
            Instant, secure access to premium digital study materials.
          </p>
        </div>

        {/* Mandatory Legal Links */}
        <div style={{ flex: '1 1 200px' }}>
          <h4 style={{ fontSize: '16px', marginBottom: '16px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '1px' }}>Legal</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li><a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }}>Terms & Conditions</a></li>
            <li><a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }}>Privacy Policy</a></li>
            <li><a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', transition: 'color 0.2s' }}>Refund & Cancellation Policy</a></li>
          </ul>
        </div>

        {/* Mandatory Contact Info */}
        <div style={{ flex: '1 1 250px' }}>
          <h4 style={{ fontSize: '16px', marginBottom: '16px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '1px' }}>Contact Us</h4>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}><strong>Email:</strong> uppcs1.0@gmail.com</p>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}><strong>Phone(Whatsapp only):</strong> +91 9415950206</p>
    
        </div>

      </div>
      
      {/* Copyright Bar */}
      <div style={{ borderTop: '1px solid #1e293b', marginTop: '40px', paddingTop: '20px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
        © {new Date().getFullYear()} UPPCS ONE. All rights reserved.
      </div>
    </footer>
  );
}