import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Catalog } from './pages/Catalog';
import { Cart } from './pages/Cart';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Product, CartItem, User } from './types';
import { authService } from './services/api';

const App: React.FC = () => {
  const [page, setPage] = useState('catalog');
  const [user, setUser] = useState<User | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    // Check local session
    const currentUser = authService.getCurrentUser();
    if (currentUser) setUser(currentUser);
    
    // Load cart
    const savedCart = localStorage.getItem('dicompel_cart');
    if (savedCart) setCartItems(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem('dicompel_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (id: string, qty: number) => {
    setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const removeCartItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCartItems([]);

  const renderPage = () => {
    switch(page) {
      case 'catalog':
        return <Catalog addToCart={addToCart} />;
      case 'cart':
        return <Cart 
          items={cartItems} 
          updateQuantity={updateCartQuantity} 
          removeItem={removeCartItem} 
          navigate={setPage}
          clearCart={clearCart}
        />;
      case 'login':
        return <Login onLogin={setUser} navigate={setPage} />;
      case 'dashboard':
        if (!user) return <Login onLogin={setUser} navigate={setPage} />;
        return <Dashboard user={user} />;
      default:
        return <Catalog addToCart={addToCart} />;
    }
  };

  return (
    <Layout 
      user={user} 
      setUser={setUser} 
      cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
      navigate={setPage}
      currentPage={page}
    >
      {renderPage()}
    </Layout>
  );
};

export default App;