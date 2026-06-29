import React, { useState } from 'react';
import { Search, Download, BookKey, Clock } from 'lucide-react';

export default function MyLibrary() {
  const [contact, setContact] = useState('');
  const [ownedBooks, setOwnedBooks] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 👇 Define the dynamic API URL right here so the whole file can use it
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchLibrary = async (e) => {
    e.preventDefault();
    if (!contact.trim()) return;

    setIsLoading(true);
    try {
      // 👇 Injected apiUrl into both fetch requests
      const [libraryRes, catalogRes] = await Promise.all([
        fetch(`${apiUrl}/api/library/${encodeURIComponent(contact)}`),
        fetch(`${apiUrl}/api/books`)
      ]);

      const libraryData = await libraryRes.json();
      const catalogData = await catalogRes.json();

      if (libraryData.success && catalogData.success) {
        const libraryWithDetails = libraryData.library.map(order => {
          const bookDetails = catalogData.books.find(b => b.id === order.bookId);
          return { ...bookDetails, orderId: order.orderId, purchasedAt: order.created_at };
        }).filter(b => b.title); 

        setOwnedBooks(libraryWithDetails);
        setHasSearched(true);
      }
    } catch (error) {
      console.error("Failed to fetch library:", error);
      alert("Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ background: '#e0f2fe', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
          <BookKey size={40} style={{ color: '#0284c7' }} />
        </div>
        <h2>Access Your Digital Library</h2>
        <p style={{ color: '#64748b', fontSize: '15px' }}>Enter your registered Email or WhatsApp number to retrieve your purchases.</p>
      </div>

      <form onSubmit={fetchLibrary} style={{ display: 'flex', gap: '12px', marginBottom: '40px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Email or WhatsApp Number" 
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          style={{ flexGrow: 1, maxWidth: '400px', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px' }}
        />
        <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ padding: '14px 24px', whiteSpace: 'nowrap', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLoading ? 'Searching...' : <><Search size={18} /> Find My Books</>}
        </button>
      </form>

      {hasSearched && (
        <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
          {ownedBooks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
              <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>No purchases found for "{contact}"</p>
              <p>Please double-check your spelling or try another contact method you may have used during checkout.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '18px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px' }}>Your Collection ({ownedBooks.length})</h3>
              
              {ownedBooks.map((book) => (
                <div key={book.orderId} style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <img src={book.coverImage} alt={book.title} style={{ width: '80px', height: '100px', objectFit: 'contain', background: '#f8fafc', padding: '4px', borderRadius: '8px', border: '1px solid #f1f5f9' }} />
                  
                  <div style={{ flexGrow: 1, minWidth: '200px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{book.category}</span>
                    <h4 style={{ margin: '4px 0 8px 0', fontSize: '18px' }}>{book.title}</h4>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Order #{book.orderId}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {new Date(book.purchasedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* 👇 Injected apiUrl into the download href */}
                  <a 
                    href={`${apiUrl}/api/download/${book.orderId}`} 
                    className="btn btn-success"
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '8px' }}
                  >
                    <Download size={18} /> Download PDF
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}