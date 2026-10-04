import React, { useState } from 'react';

export default function AdminUpload() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Text & Number Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [pages, setPages] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [price, setPrice] = useState('');
  const [physicalPrice, setPhysicalPrice] = useState('');
  
  // File Fields
  const [coverImage, setCoverImage] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [status, setStatus] = useState('');

  // Password Verification Handler
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === "Secret123") {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect password!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title || !price || !pdfFile || !coverImage) {
      setStatus('Please fill out the required fields and attach both files.');
      return;
    }

    setStatus('Uploading to server...');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('pages', pages);
    formData.append('fileSize', fileSize);
    formData.append('price', price);
    formData.append('physicalPrice', physicalPrice);
    
    formData.append('coverImage', coverImage);
    formData.append('pdf', pdfFile);

    // Dynamic backend URL using VITE_API_URL env variable
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    try {
      const response = await fetch(`${API_BASE}/api/admin/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        setStatus('Upload successful! Saved to database.');
        setTitle(''); setCategory(''); setPages(''); setFileSize('');
        setPrice(''); setPhysicalPrice(''); setCoverImage(null); setPdfFile(null);
      } else {
        setStatus('Upload failed.');
      }
    } catch (error) {
      console.error(error);
      setStatus('Error connecting to server.');
    }
  };

  // Render password screen if unauthenticated
  if (!isAuthenticated) {
    return (
      <div style={{ padding: '3rem', maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <h2>Admin Access Required</h2>
        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <input 
            type="password" 
            placeholder="Enter Admin Password" 
            value={passwordInput} 
            onChange={(e) => setPasswordInput(e.target.value)} 
            style={inputStyle} 
          />
          <button type="submit" style={{ padding: '0.8rem', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-container" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Store Admin Dashboard</h2>
      <p>Upload a new book or handout to the catalog.</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
        <input type="text" placeholder="Title (e.g., UPPSC GS-1 Notes)" value={title} onChange={(e) => setTitle(e.target.value)} required style={inputStyle} />
        <input type="text" placeholder="Exam Category (e.g., UPPSC, UPSC)" value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle} />
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input type="number" placeholder="Total Pages" value={pages} onChange={(e) => setPages(e.target.value)} style={{...inputStyle, flex: 1}} />
          <input type="number" step="0.1" placeholder="File Size (MB)" value={fileSize} onChange={(e) => setFileSize(e.target.value)} style={{...inputStyle, flex: 1}} />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <input type="number" placeholder="Digital Price (₹)" value={price} onChange={(e) => setPrice(e.target.value)} required style={{...inputStyle, flex: 1}} />
          <input type="number" placeholder="Physical Price (₹)" value={physicalPrice} onChange={(e) => setPhysicalPrice(e.target.value)} style={{...inputStyle, flex: 1}} />
        </div>

        <div style={{ padding: '1rem', border: '1px dashed #666', borderRadius: '4px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>1. Upload Cover Image (JPG/PNG):</label>
          <input type="file" accept="image/*" onChange={(e) => setCoverImage(e.target.files[0])} required />
        </div>

        <div style={{ padding: '1rem', border: '1px dashed #666', borderRadius: '4px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>2. Upload Actual PDF File:</label>
          <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files[0])} required />
        </div>

        <button type="submit" style={{ padding: '1rem', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '1rem' }}>
          Upload to Database
        </button>
      </form>

      {status && <p style={{ marginTop: '1rem', fontWeight: 'bold', color: status.includes('Please') || status.includes('failed') || status.includes('Error') ? 'red' : 'green' }}>{status}</p>}
    </div>
  );
}

const inputStyle = {
  padding: '0.8rem', 
  borderRadius: '4px', 
  border: '1px solid #ccc'
};