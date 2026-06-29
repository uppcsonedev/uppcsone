import React, { useState } from 'react';
import './styles/global.css';
import Navbar from './components/Navbar';
import Storefront from './pages/Storefront';
import MyLibrary from './pages/MyLibrary';
import Reader from './pages/Reader';
import Footer from './components/Footer';

export default function App() {
  const [purchasedBooks, setPurchasedBooks] = useState({});
  const [currentReadingUrl, setCurrentReadingUrl] = useState(null);
  
  // NEW: State to toggle between the store and the library
  const [currentView, setCurrentView] = useState('store'); // 'store' or 'library'

  return (
    <div className="app-layout">
      {/* Pass the view setter to the Navbar so users can click links */}
      <Navbar onViewChange={setCurrentView} currentView={currentView} />
      
      <main className="container">
        {currentReadingUrl ? (
          <Reader 
            bookUrl={currentReadingUrl} 
            onBack={() => setCurrentReadingUrl(null)} 
          />
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