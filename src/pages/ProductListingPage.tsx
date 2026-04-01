import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product } from '../types';
import { CATEGORIES, GOALS } from '../constants';
import { Search, Filter, Star, ShoppingCart, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../CartContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const ProductListingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { addToCart } = useCart();

  const categoryFilter = searchParams.get('category');
  const goalFilter = searchParams.get('goal');
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';

  useEffect(() => {
    let q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    
    if (categoryFilter) {
      q = query(q, where('category', '==', categoryFilter));
    }
    
    if (goalFilter) {
      q = query(q, where('goal', '==', goalFilter));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      
      // Client-side search filtering
      const filtered = searchQuery 
        ? docs.filter(p => p.name.toLowerCase().includes(searchQuery) || p.description.toLowerCase().includes(searchQuery))
        : docs;
        
      setProducts(filtered);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [categoryFilter, goalFilter, searchQuery]);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">
              {categoryFilter || 'ALL PRODUCTS'}
            </h1>
            <p className="text-gray-500 mt-2">Showing {products.length} premium supplements</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search products..." 
                value={searchQuery}
                onChange={(e) => setSearchParams(prev => {
                  if (e.target.value) prev.set('q', e.target.value);
                  else prev.delete('q');
                  return prev;
                })}
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 ring-orange-500/20 focus:border-orange-500 transition-all w-full md:w-64"
              />
            </div>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <aside className={cn(
            "lg:block space-y-8",
            isFilterOpen ? "block" : "hidden"
          )}>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-black text-gray-900 mb-6 uppercase tracking-tight">Categories</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setSearchParams(prev => { prev.delete('category'); return prev; })}
                  className={cn(
                    "block w-full text-left text-sm font-medium transition-colors hover:text-orange-600",
                    !categoryFilter ? "text-orange-600 font-bold" : "text-gray-500"
                  )}
                >
                  All Categories
                </button>
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setSearchParams(prev => { prev.set('category', cat); return prev; })}
                    className={cn(
                      "block w-full text-left text-sm font-medium transition-colors hover:text-orange-600",
                      categoryFilter === cat ? "text-orange-600 font-bold" : "text-gray-500"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-black text-gray-900 mb-6 uppercase tracking-tight">Fitness Goals</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setSearchParams(prev => { prev.delete('goal'); return prev; })}
                  className={cn(
                    "block w-full text-left text-sm font-medium transition-colors hover:text-orange-600",
                    !goalFilter ? "text-orange-600 font-bold" : "text-gray-500"
                  )}
                >
                  All Goals
                </button>
                {GOALS.map(goal => (
                  <button 
                    key={goal.id}
                    onClick={() => setSearchParams(prev => { prev.set('goal', goal.id); return prev; })}
                    className={cn(
                      "block w-full text-left text-sm font-medium transition-colors hover:text-orange-600",
                      goalFilter === goal.id ? "text-orange-600 font-bold" : "text-gray-500"
                    )}
                  >
                    {goal.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl h-96 animate-pulse border border-gray-100"></div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={product.id}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
                  >
                    <Link to={`/product/${product.id}`} className="relative h-64 overflow-hidden bg-white flex items-center justify-center">
                      <img 
                        src={product.images[0] || `https://picsum.photos/seed/${product.id}/400/400`} 
                        alt={product.name} 
                        className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      {product.discountPrice && (
                        <span className="absolute top-4 left-4 bg-orange-600 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Sale</span>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                    </Link>
                    
                    <div className="p-6 flex-grow flex flex-col">
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-3 h-3 text-orange-500 fill-current" />
                        <span className="text-xs font-bold text-gray-900">{product.rating}</span>
                        <span className="text-xs text-gray-400">({product.numReviews})</span>
                      </div>
                      <Link to={`/product/${product.id}`}>
                        <h3 className="font-black text-gray-900 text-lg leading-tight mb-2 group-hover:text-orange-600 transition-colors uppercase truncate">{product.name}</h3>
                      </Link>
                      <p className="text-xs text-gray-500 mb-4 line-clamp-2">{product.description}</p>
                      
                      <div className="mt-auto flex items-center justify-between">
                        <div>
                          {product.discountPrice ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-black text-gray-900">₹{product.discountPrice}</span>
                              <span className="text-sm text-gray-400 line-through">₹{product.price}</span>
                            </div>
                          ) : (
                            <span className="text-xl font-black text-gray-900">₹{product.price}</span>
                          )}
                        </div>
                        <button 
                          onClick={(e) => handleAddToCart(e, product)}
                          disabled={product.stock <= 0}
                          className={cn(
                            "p-3 rounded-xl transition-all active:scale-95",
                            product.stock > 0 
                              ? "bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-600/20" 
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          )}
                        >
                          <ShoppingCart className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">NO PRODUCTS FOUND</h3>
                <p className="text-gray-500 mb-8">Try adjusting your filters or search query to find what you're looking for.</p>
                <button 
                  onClick={() => setSearchParams({})}
                  className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductListingPage;
