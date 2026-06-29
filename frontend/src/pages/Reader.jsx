import React from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function Reader({ bookUrl, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '85vh' }}>
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={onBack} 
          className="btn btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={16} /> Back to Library
        </button>
      </div>
      
      <div style={{ flexGrow: 1, border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f8fafc' }}>
        {/* Using object forces the browser's native PDF renderer */}
        <object 
          data={bookUrl} 
          type="application/pdf" 
          width="100%" 
          height="100%"
        >
          {/* Fallback for browsers that don't support inline PDFs */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center', color: '#64748b' }}>
            <AlertCircle size={48} style={{ marginBottom: '16px', color: '#94a3b8' }} />
            <h3>Unable to display PDF inline</h3>
            <p style={{ margin: '8px 0 16px 0' }}>Your browser doesn't support embedded PDFs.</p>
            <a href={bookUrl} download className="btn btn-primary">
              Download the PDF instead
            </a>
          </div>
        </object>
      </div>
    </div>
  );
}