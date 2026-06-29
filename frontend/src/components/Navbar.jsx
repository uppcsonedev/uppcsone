import React from 'react';

export default function Navbar({ onViewChange, currentView }) {
  return (
    <nav className="navbar" style={{ padding: '20px 0' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* LOGO & TEXT BRANDING CONTAINER */}
        <div 
          onClick={() => onViewChange('store')}
          style={{ 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center',
            gap: '12px' /* 👈 Adds perfect spacing between the image and text */
          }}
        >
          {/* Circular Image Logo */}
          <img 
            src="/client-logo.png" 
            alt="Client Logo" 
            style={{ 
              height: '60px', 
              width: 'auto',  
              maxWidth: '180px', 
              objectFit: 'contain',
              margin: '-10px 0' 
            }} 
          />
          
          {/* Colored Text Logo */}
          <div style={{ 
            fontSize: '24px', 
            fontWeight: '900', 
            fontFamily: 'Arial, sans-serif', /* Matches the chunky sans-serif look */
            letterSpacing: '0.5px' 
          }}>
            <span style={{ color: '#1c3e94' }}>UPPCS</span>{' '}
            <span style={{ color: '#FF3333' }}>ONE</span>
          </div>
        </div>
        
        <div>
          <button 
            className="btn" 
            style={{ 
              background: currentView === 'library' ? 'var(--border-color)' : 'transparent', 
              color: 'var(--text-main)', 
              border: '1px solid var(--border-focus)',
              fontWeight: currentView === 'library' ? 'bold' : 'normal',
              padding: '8px 16px',
              borderRadius: '6px',
              transition: 'all 0.3s ease'
            }}
            onClick={() => onViewChange('library')}
          >
            My Library
          </button>
        </div>
      </div>
    </nav>
  );
}