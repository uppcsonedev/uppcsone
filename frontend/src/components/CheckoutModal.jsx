import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';

export default function CheckoutModal({ book, onClose, onConfirm }) {
  const [formData, setFormData] = useState({ name: '', whatsapp: '', email: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!formData.name.trim()) return "Please enter your full name.";
    
    // Validate Indian Phone Number
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.whatsapp)) return "Please enter a valid 10-digit WhatsApp number.";
    
    // Validate Email Address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return "Please enter a valid email address.";
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(''); 
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    try {
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          bookId: book.id
        }),
      });

      const data = await response.json();

      if (data.success) {
        onConfirm(book.id, data.orderId, data.gatewayOrderId, data.amount);
      } else {
        setError(data.error || "Something went wrong saving the order.");
      }
    } catch (err) {
      setError("Could not connect to the backend server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        
        {/* Cleaned up Header */}
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)' }}>Secure Checkout</h3>
          <button onClick={onClose} className="close-btn"><X size={20} /></button>
        </div>

        <div className="modal-body">
          {/* Order Summary now uses the CSS class instead of hardcoded white backgrounds */}
          <div className="order-summary">
            <img src={book.coverImage} alt="Cover" className="summary-img" />
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-main)' }}>{book.title}</h4>
              <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--teal-accent)' }}>Total: ₹{book.price}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Error box adjusted to adapt to dark mode nicely */}
            {error && (
              <div style={{ padding: '10px', background: 'var(--border-color)', color: '#ef4444', borderRadius: '6px', fontSize: '13px', border: '1px solid #fca5a5' }}>
                {error}
              </div>
            )}
            
            {/* Form Inputs cleaned of hardcoded borders to allow CSS focus rings */}
            <div className="form-group">
              <label>Full Name</label>
              <input required type="text" className="input-field" placeholder="Ravi Kumar" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="form-group">
              <label>WhatsApp Number (for library access)</label>
              <input required type="text" maxLength="10" className="input-field" placeholder="9876543210" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value.replace(/\D/g, '')})} />
            </div>
            
            <div className="form-group">
              <label>Email Address</label>
              <input required type="email" className="input-field" placeholder="ravi@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ marginTop: '10px', padding: '14px', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
              {isSubmitting ? 'Processing...' : <><ShieldCheck size={18} /> Proceed to Pay</>}
            </button>
          </form>
        </div>
        
      </div>
    </div>
  );
}