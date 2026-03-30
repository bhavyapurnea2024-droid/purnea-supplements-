import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ChevronRight, ShoppingBag, ShieldCheck, Zap } from 'lucide-react';
import { useCart } from '../CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const CartPage = () => {
  const { items, removeFromCart, updateQuantity, subtotal, totalItems } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 bg-gray-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md w-full"
        >
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <ShoppingBag className="w-12 h-12 text-orange-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter uppercase leading-none">Your cart is empty</h2>
          <p className="text-gray-500 mb-10 leading-relaxed">Looks like you haven't added any premium fuel to your cart yet. Start your fitness journey today!</p>
          <Link to="/shop" className="inline-block w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all active:scale-95">
            Explore Products
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-orange-600">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-bold">Shopping Cart</span>
        </div>

        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-12">Your Shopping Cart <span className="text-orange-600">({totalItems})</span></h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={item.productId}
                  className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-6 items-center group"
                >
                  <Link to={`/product/${item.productId}`} className="w-32 h-32 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </Link>
                  
                  <div className="flex-grow text-center sm:text-left">
                    <Link to={`/product/${item.productId}`}>
                      <h3 className="font-black text-gray-900 text-xl leading-tight mb-2 group-hover:text-orange-600 transition-colors uppercase">{item.name}</h3>
                    </Link>
                    <p className="text-2xl font-black text-gray-900 mb-4 tracking-tight">₹{item.price}</p>
                    
                    <div className="flex items-center justify-center sm:justify-start gap-6">
                      <div className="flex items-center bg-gray-100 rounded-xl p-1">
                        <button 
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white hover:text-orange-600 rounded-lg transition-all"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-10 text-center font-bold text-gray-900">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-white hover:text-orange-600 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.productId)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-gray-400 mb-1">Total</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight">₹{item.price * item.quantity}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl sticky top-24">
              <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Order Summary</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className="text-green-600 font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (GST)</span>
                  <span className="font-bold text-gray-900">Included</span>
                </div>
                <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                  <span className="text-lg font-black text-gray-900 uppercase">Total</span>
                  <span className="text-3xl font-black text-orange-600 tracking-tighter leading-none">₹{subtotal}</span>
                </div>
              </div>

              <button 
                onClick={() => navigate('/checkout')}
                className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 group"
              >
                Proceed to Checkout <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <p className="text-xs font-bold text-gray-900">Secure Checkout Guarantee</p>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <Zap className="w-5 h-5 text-orange-600" />
                  <p className="text-xs font-bold text-gray-900">Fast Delivery in 2-4 Days</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
