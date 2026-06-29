import React, { useState, useEffect, useMemo } from 'react';
import EbookCard from '../components/EbookCard';
import CheckoutModal from '../components/CheckoutModal';
import DarkModeToggle from '../components/DarkModeToggle';

// 1. The Razorpay Script Loader
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Storefront({ purchasedBooks, setPurchasedBooks }) {
  const [checkoutBook, setCheckoutBook] = useState(null);
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State to track the active category filter
  const [selectedCategory, setSelectedCategory] = useState('All');

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/books`);
        const data = await response.json();
        
        if (data.success) {
          setBooks(data.books);
        }
      } catch (error) {
        console.error("Failed to load catalog:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCatalog();
  }, [apiUrl]);

  // Extract unique categories dynamically from the books array
  const uniqueCategories = useMemo(() => {
    const categoriesSet = new Set();
    categoriesSet.add('All'); // Always provide an unfilter option

    books.forEach(book => {
      if (book.category) {
        // Splitting by comma handles cases where a book targets multiple exams
        book.category.split(',').forEach(cat => {
          const trimmedCat = cat.trim();
          if (trimmedCat) categoriesSet.add(trimmedCat);
        });
      }
    });

    return Array.from(categoriesSet);
  }, [books]);

  // Filter the books depending on the selected active chip
  const filteredBooks = useMemo(() => {
    if (selectedCategory === 'All') return books;
    
    return books.filter(book => 
      book.category && book.category.split(',').map(c => c.trim()).includes(selectedCategory)
    );
  }, [selectedCategory, books]);

  const initiateCheckout = (book) => {
    setCheckoutBook(book);
  };

  // 2. The Main Gateway Handler
  const handleCheckoutFormSubmit = async (intentData) => {
    setCheckoutBook(null);

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded) {
      alert("Razorpay SDK failed to load. Are you online?");
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID, 
      amount: intentData.amount,
      currency: "INR",
      name: "Digital Publishing",
      description: "E-Book Purchase",
      order_id: intentData.gatewayOrderId, 
      
      handler: async function (response) {
        try {
          const verifyRes = await fetch(`${apiUrl}/api/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              internalOrderId: intentData.internalOrderId,
              gatewayOrderId: intentData.gatewayOrderId,
              gatewayPaymentId: response.razorpay_payment_id,
              gatewaySignature: response.razorpay_signature
            })
          });

          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            setPurchasedBooks({ ...purchasedBooks, [intentData.bookId]: intentData.internalOrderId });
            alert("Transaction complete! Your book has been unlocked.");
          } else {
            alert("Cryptographic verification failed.");
          }
        } catch (error) {
          console.error("Verification connection error:", error);
          alert("Verification server timeout.");
        }
      },
      theme: { color: "#0f766e" }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  return (
    <div className="container">
      
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px', 
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <h2 className="book-title" style={{ margin: 0, fontSize: '28px' }}>Handout Storefront</h2>
          <p className="book-description" style={{ margin: 0, marginTop: '4px' }}>Online access to exam handouts immediately after purchase.</p>
          <p className="book-description" style={{ margin: 0, marginTop: '4px' }}> यह सभी नोट्स आप यहाँ से डाउनलोड करके PDF प्राप्त कर सकते हैं, PDF आप अपने पास सेव भी कर सकते हैं एवं उसका प्रिंट भी करवा सकते हैं।</p>
        </div>
        
        <DarkModeToggle />
      </header>

      {/* Native-feel Horizontal Categories Section */}
      {!isLoading && books.length > 0 && (
        <div className="category-filter-container">
          {uniqueCategories.map(category => (
            <button
              key={category}
              className={`chip ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}
      
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ 
            margin: '0 auto 16px auto', 
            width: '36px', 
            height: '36px', 
            border: '3px solid var(--border-color)', 
            borderTopColor: 'var(--teal-accent)', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite' 
          }}></div>
          <p>Loading catalog from database...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          <div className="ebooks-grid">
            {filteredBooks.map((ebook) => (
              <EbookCard 
                key={ebook.id} 
                ebook={ebook} 
                isPurchased={!!purchasedBooks[ebook.id]} 
                orderId={purchasedBooks[ebook.id]} 
                onBuy={() => initiateCheckout(ebook)} 
                
                // THE FIX: Directly trigger the working download route
                onDownload={() => {
                  const orderId = purchasedBooks[ebook.id];
                  window.location.href = `${apiUrl}/api/download/${orderId}`;
                }} 
              />
            ))}
          </div>

          {/* Empty state if a filter returns no results */}
          {filteredBooks.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              No e-books available under this exam category yet.
            </p>
          )}
        </>
      )}

      {checkoutBook && (
        <CheckoutModal 
          book={checkoutBook} 
          onClose={() => setCheckoutBook(null)} 
          onConfirm={(bookId, internalOrderId, gatewayOrderId, amount) => handleCheckoutFormSubmit({ bookId, internalOrderId, gatewayOrderId, amount })} 
        />
      )}
    </div>
  );
}