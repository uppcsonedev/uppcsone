import React, { useState } from 'react';
import { CreditCard, Smartphone, Landmark, ShieldCheck } from 'lucide-react';

export default function PaymentGatewaySimulator({ paymentDetails, onPaymentComplete, onCancel }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const triggerPaymentProcessing = (methodName) => {
    setIsProcessing(true);

    // Simulate 1.5 seconds of bank authentication processing
    setTimeout(() => {
      // Create mock tokens mimicking the cryptographic signatures returned by real gateway servers
      const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 11)}`;
      const mockSignature = Math.random().toString(36).substring(2, 15) + "sig_verify";

      onPaymentComplete({
        gatewayPaymentId: mockPaymentId,
        gatewaySignature: mockSignature
      });
    }, 1500);
  };

  return (
    <div className="gateway-overlay">
      <div className="gateway-box">
        <div className="gateway-brand">
          <span style={{ fontSize: '11px', trackingSpacing: '1px', opacity: 0.8, textTransform: 'uppercase' }}>Secure Transaction Service</span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '22px' }}>v1 Payment Gateway</h2>
        </div>
        
        <div style={{ padding: '20px 24px 0 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Order ID: {paymentDetails.gatewayOrderId}</p>
            <h3 style={{ margin: '4px 0 16px 0', fontSize: '20px', color: '#0f172a' }}>₹{(paymentDetails.amount / 100).toFixed(2)}</h3>
          </div>
          <span style={{ fontSize: '12px', color: '#10b981', background: '#ecfdf5', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} /> Test Mode
          </span>
        </div>

        {isProcessing ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748b' }}>
            <div className="spinner" style={{ margin: '0 auto 16px auto', width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ fontWeight: 'bold', color: '#0f172a' }}>Communicating with the bank...</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>Please do not close this window or press back.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div>
            <div className="payment-options-list">
              <button className="payment-method-btn" onClick={() => triggerPaymentProcessing('UPI')}>
                <Smartphone size={18} style={{ color: '#0284c7' }} />
                <div><strong>UPI / QR</strong> <div style={{ fontSize: '12px', color: '#64748b' }}>Google Pay, PhonePe, Paytm</div></div>
              </button>
              
              <button className="payment-method-btn" onClick={() => triggerPaymentProcessing('Card')}>
                <CreditCard size={18} style={{ color: '#16a34a' }} />
                <div><strong>Cards</strong> <div style={{ fontSize: '12px', color: '#64748b' }}>Visa, MasterCard, RuPay</div></div>
              </button>

              <button className="payment-method-btn" onClick={() => triggerPaymentProcessing('Netbanking')}>
                <Landmark size={18} style={{ color: '#ea580c' }} />
                <div><strong>Netbanking</strong> <div style={{ fontSize: '12px', color: '#64748b' }}>SBI, HDFC, ICICI, Axis</div></div>
              </button>
            </div>

            <button 
              onClick={onCancel}
              style={{ width: '100%', padding: '16px', background: 'none', border: 'none', borderTop: '1px solid #e2e8f0', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
            >
              Cancel Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}