import React, { useState, useEffect } from 'react';
import './styles/global.css';
import Navbar from './components/Navbar';
import Storefront from './pages/Storefront';
import MyLibrary from './pages/MyLibrary';
import Reader from './pages/Reader';
import Footer from './components/Footer';
import AdminUpload from './pages/AdminUpload'; // 👇 Import the new page

export default function App() {
  const [purchasedBooks, setPurchasedBooks] = useState({});
  const [currentReadingUrl, setCurrentReadingUrl] = useState(null);
  const [currentView, setCurrentView] = useState('store'); 

  // 👇 NEW: Secret entry point for the client
  useEffect(() => {
    if (window.location.hash === '#admin') {
      setCurrentView('admin');
    }
  }, []);

  return (
    <div className="app-layout">
      <Navbar onViewChange={setCurrentView} currentView={currentView} />
      
      <main className="container">
        {currentReadingUrl ? (
          <Reader 
            bookUrl={currentReadingUrl} 
            onBack={() => setCurrentReadingUrl(null)} 
          />
        ) : currentView === 'admin' ? (
          // 👇 NEW: Render the Admin page if the state is 'admin'
          <AdminUpload />
        ) : currentView === 'library' ? (
          <MyLibrary />
        ) : (
          <Storefront 
            purchasedBooks={purchasedBooks} 
            setPurchasedBooks={setPurchasedBooks}
            onRead={(url) => setCurrentReadingUrl(url)}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}