import React from 'react';
import { Download, ShieldCheck } from 'lucide-react'; // Removed BookOpen since we don't need it anymore

export default function EbookCard({ ebook, isPurchased, onBuy, onDownload }) { // Swapped onRead for onDownload
  return (
    <div className="premium-card">
      
      {/* Edge-to-Edge Cover Image */}
      <div className="card-image-container">
        <img src={ebook.coverImage} alt={ebook.title} className="card-cover" />
        
        {/* Tiny Trust Badge Floating over the image */}
        {!isPurchased && (
          <div className="trust-badge" style={{ top: '8px', right: '8px', padding: '4px 8px', fontSize: '10px' }}>
            <ShieldCheck size={12} /> Secure
          </div>
        )}
      </div>

      <div className="card-content">
        {/* Exam Tag Pills (All of them) */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
          {ebook.category ? ebook.category.split(',').map((tag, index) => (
            <span key={index} className="category-tag" style={{ margin: 0, fontSize: '10px' }}>
              {tag.trim()}
            </span>
          )) : (
            <span className="category-tag" style={{ margin: 0, fontSize: '10px' }}>E-Book</span>
          )}
        </div>

        {/* Title (Auto-truncates if too long) */}
        <h3 className="book-title">{ebook.title}</h3>
        
        {/* Simple Meta (Pages / Size / Format) */}
        <div className="meta-item" style={{ fontSize: '12px', marginBottom: '8px', color: 'var(--text-muted)' }}>
          {ebook.pages || '100+'} Pages • {ebook.file_size_mb || '3'} MB (PDF)
        </div>

        {/* Price */}
        {!isPurchased && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', marginTop: 'auto' }}>
            {/* Physical Price (Red Strikethrough) */}
            <span style={{ textDecoration: 'line-through', color: '#ef4444', fontSize: '15px', fontWeight: '500' }}>
              ₹{ebook.physical_price || 150}
            </span>
            
            {/* Digital Price */}
            <span className="book-price" style={{ margin: 0, fontSize: '18px' }}>
              ₹{ebook.price}
            </span>
          </div>
        )}

        {/* Call to Action Buttons */}
        <div className="card-actions">
          {isPurchased ? (
            <button 
              onClick={onDownload} // Changed this to trigger the new download prop
              className="btn btn-success shadow-btn"
              style={{ height: '38px', fontSize: '14px' }}
            >
              <Download size={16} /> Download PDF
            </button>
          ) : (
            <button 
              onClick={onBuy} 
              className="btn btn-primary shadow-btn"
              style={{ height: '38px', fontSize: '14px' }}
            >
              <Download size={16} /> Buy Now
            </button>
          )}
        </div>

      </div>
    </div>
  );
}