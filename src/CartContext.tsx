import React, { createContext, useContext, useState, useEffect } from 'react';
import { OrderItem, Product } from './types';

interface CartContextType {
  items: OrderItem[];
  addToCart: (product: Product, quantity?: number, flavor?: string, weight?: string) => void;
  removeFromCart: (productId: string, flavor?: string, weight?: string) => void;
  updateQuantity: (productId: string, quantity: number, flavor?: string, weight?: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity = 1, flavor?: string, weight?: string) => {
    setItems(prev => {
      const existing = prev.find(item => 
        item.productId === product.id && 
        item.flavor === flavor && 
        item.weight === weight
      );
      if (existing) {
        return prev.map(item => 
          (item.productId === product.id && item.flavor === flavor && item.weight === weight)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.discountPrice || product.price,
        quantity,
        image: product.images[0] || 'https://picsum.photos/seed/supplement/200/200',
        category: product.category,
        flavor,
        weight,
      }];
    });
  };

  const removeFromCart = (productId: string, flavor?: string, weight?: string) => {
    setItems(prev => prev.filter(item => 
      !(item.productId === productId && item.flavor === flavor && item.weight === weight)
    ));
  };

  const updateQuantity = (productId: string, quantity: number, flavor?: string, weight?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, flavor, weight);
      return;
    }
    setItems(prev => prev.map(item => 
      (item.productId === productId && item.flavor === flavor && item.weight === weight)
        ? { ...item, quantity } 
        : item
    ));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
};
