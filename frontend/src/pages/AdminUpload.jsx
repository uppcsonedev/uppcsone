import React, { useState } from 'react';

export default function AdminUpload() {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file || !title || !price) {
      setStatus('Please fill out all fields and select a PDF.');
      return;
    }

    setStatus('Uploading to server...');

    // We will attach the backend API call here in the next step!
    const formData = new FormData();
    formData.append('title', title);
    formData.append('price', price);
    formData.append('pdf', file);

    console.log("Ready to send:", { title, price, fileName: file.name });
  };

  return (
    <div className="admin-container" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Admin Dashboard: Upload New PDF</h2>
      <p>Fill out the details below to add a new handout to the store.</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
        
        <input 
          type="text" 
          placeholder="Handout Title (e.g., GS-1 Notes)" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        <input 
          type="number" 
          placeholder="Price (₹)" 
          value={price} 
          onChange={(e) => setPrice(e.target.value)} 
          style={{ padding: '0.8rem', borderRadius: '4px', border: '1px solid #ccc' }}
        />

        <div style={{ padding: '1rem', border: '1px dashed #666', borderRadius: '4px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Select PDF File:</label>
          <input 
            type="file" 
            accept=".pdf" 
            onChange={handleFileChange} 
          />
        </div>

        <button 
          type="submit" 
          style={{ padding: '1rem', backgroundColor: '#0056b3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Upload to Database
        </button>
      </form>

      {status && <p style={{ marginTop: '1rem', color: status.includes('Please') ? 'red' : 'green' }}>{status}</p>}
    </div>
  );
}