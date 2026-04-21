import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product } from '../types';
import { Star, ShoppingCart, ShieldCheck, Zap, TrendingUp, ChevronRight, ChevronLeft, Minus, Plus, Heart, Share2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useCart } from '../CartContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedFlavor, setSelectedFlavor] = useState<string>('');
  const [selectedWeight, setSelectedWeight] = useState<string>('');
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        } else {
          toast.error('Product not found');
          navigate('/shop');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `products/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  useEffect(() => {
    if (product) {
      if (product.flavors && product.flavors.length > 0 && !selectedFlavor) {
        setSelectedFlavor(product.flavors[0]);
      }
      if (product.weights && product.weights.length > 0 && !selectedWeight) {
        setSelectedWeight(product.weights[0]);
      }
    }
  }, [product]);

  const handleAddToCart = () => {
    if (product) {
      if (product.flavors?.length && !selectedFlavor) {
        toast.error('Please select a flavor');
        return;
      }
      if (product.weights?.length && !selectedWeight) {
        toast.error('Please select a weight');
        return;
      }
      addToCart(product, quantity, selectedFlavor, selectedWeight);
      toast.success(`${product.name} added to cart`);
    }
  };

  const handleBuyNow = () => {
    if (product) {
      if (product.flavors?.length && !selectedFlavor) {
        toast.error('Please select a flavor');
        return;
      }
      if (product.weights?.length && !selectedWeight) {
        toast.error('Please select a weight');
        return;
      }
      addToCart(product, quantity, selectedFlavor, selectedWeight);
      navigate('/checkout');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-gray-100 rounded-3xl h-[500px]"></div>
          <div className="space-y-6">
            <div className="h-12 bg-gray-100 rounded-xl w-3/4"></div>
            <div className="h-6 bg-gray-100 rounded-xl w-1/4"></div>
            <div className="h-32 bg-gray-100 rounded-xl"></div>
            <div className="h-16 bg-gray-100 rounded-xl w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const images = product.images.length > 0 ? product.images : ['https://picsum.photos/seed/supplement/800/800'];

  return (
    <div className="bg-white min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-orange-600">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/shop" className="hover:text-orange-600">Shop</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to={`/shop?category=${product.category}`} className="hover:text-orange-600">{product.category}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-bold truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          {/* Image Gallery */}
          <div className="space-y-6">
            <div className="relative group">
              <motion.div 
                layoutId={`product-image-${product.id}`}
                className="aspect-square rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm flex items-center justify-center relative"
              >
                <img 
                  key={activeImage}
                  src={images[activeImage]} 
                  alt={product.name} 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                  loading="eager"
                />

                {/* Sliding Buttons */}
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/80 backdrop-blur-md border border-gray-100 shadow-lg text-gray-900 opacity-0 group-hover:opacity-100 transition-all hover:bg-orange-600 hover:text-white"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl bg-white/80 backdrop-blur-md border border-gray-100 shadow-lg text-gray-900 opacity-0 group-hover:opacity-100 transition-all hover:bg-orange-600 hover:text-white"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    
                    {/* Dots Indicator */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, i) => (
                        <div 
                          key={i}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            activeImage === i ? "w-6 bg-orange-600" : "bg-gray-300"
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    "w-20 h-20 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0",
                    activeImage === i ? "border-orange-500 ring-2 ring-orange-500/20" : "border-transparent hover:border-gray-200"
                  )}
                >
                  <div className="w-full h-full flex items-center justify-center bg-white">
                    <img 
                      src={img} 
                      alt={`${product.name} ${i}`} 
                      className="max-w-full max-h-full object-contain" 
                      referrerPolicy="no-referrer" 
                      loading="lazy"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-widest rounded-full">{product.brand}</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-full">{product.category}</span>
              </div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none mb-4 uppercase">{product.name}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("w-4 h-4", i < Math.floor(product.rating) ? "text-orange-500 fill-current" : "text-gray-200")} />
                  ))}
                  <span className="text-sm font-bold text-gray-900 ml-2">{product.rating}</span>
                </div>
                <span className="text-sm text-gray-400">|</span>
                <span className="text-sm text-gray-500 font-medium">{product.numReviews} Reviews</span>
                <span className="text-sm text-gray-400">|</span>
                <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                    {product.salesCount || (50 + (product.id.charCodeAt(0) % 51))}+ Happy Customers
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <div className="flex items-end gap-3 mb-2">
                {product.discountPrice ? (
                  <>
                    <span className="text-4xl font-black text-gray-900 tracking-tight">₹{product.discountPrice}</span>
                    <span className="text-xl text-gray-400 line-through mb-1">₹{product.price}</span>
                    <span className="text-sm font-bold text-green-600 mb-1">Save ₹{product.price - product.discountPrice}</span>
                  </>
                ) : (
                  <span className="text-4xl font-black text-gray-900 tracking-tight">₹{product.price}</span>
                )}
              </div>
              <p className="text-xs text-gray-500">Inclusive of all taxes. Free shipping on orders above ₹999.</p>
            </div>

            {/* Options Selection */}
            <div className="space-y-6 mb-8">
              {product.flavors && product.flavors.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-3">Select Flavor</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.flavors.map(flavor => (
                      <button
                        key={flavor}
                        onClick={() => setSelectedFlavor(flavor)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                          selectedFlavor === flavor 
                            ? "border-orange-600 bg-orange-50 text-orange-600" 
                            : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
                        )}
                      >
                        {flavor}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.weights && product.weights.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-3">Select Weight</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.weights.map(weight => (
                      <button
                        key={weight}
                        onClick={() => setSelectedWeight(weight)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all",
                          selectedWeight === weight 
                            ? "border-orange-600 bg-orange-50 text-orange-600" 
                            : "border-gray-100 bg-white text-gray-500 hover:border-gray-200"
                        )}
                      >
                        {weight}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8 mb-12">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Description</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Lab Tested</p>
                    <p className="text-[10px] text-gray-500">100% Authentic</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl">
                  <Zap className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Fast Acting</p>
                    <p className="text-[10px] text-gray-500">Maximum Results</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-white hover:text-orange-600 rounded-lg transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-gray-900">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-white hover:text-orange-600 rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-grow">
                  {product.stock > 0 ? (
                    <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> In Stock ({product.stock} units left)
                    </p>
                  ) : (
                    <p className="text-xs font-bold text-red-600">Out of Stock</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                  className="flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  <ShoppingCart className="w-5 h-5" /> Add to Cart
                </button>
                <button 
                  onClick={handleBuyNow}
                  disabled={product.stock <= 0}
                  className="flex items-center justify-center gap-2 bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all active:scale-95 disabled:bg-gray-200 disabled:text-gray-400"
                >
                  Buy Now
                </button>
              </div>
              
              <div className="flex items-center justify-center gap-6 pt-4">
                <button className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors">
                  <Heart className="w-4 h-4" /> Add to Wishlist
                </button>
                <button className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors">
                  <Share2 className="w-4 h-4" /> Share Product
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
