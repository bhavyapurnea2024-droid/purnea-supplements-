import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { Product } from '../types';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Save, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CATEGORIES, GOALS, DEFAULT_COMMISSION_RATE } from '../constants';

const AdminProducts = () => {
  const { user: adminUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    discountPrice: 0,
    category: CATEGORIES[0],
    brand: '',
    goal: GOALS[0].id,
    stock: 0,
    images: ['', '', '', ''],
    flavors: '',
    weights: '',
    commissionRate: 0.05,
    specialOffer: '',
  });

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'products'), orderBy('createdAt', 'desc')), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });
    return () => unsub();
  }, []);

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.brand || formData.price <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const filteredImages = formData.images.map(img => img.trim()).filter(img => img !== '');
      if (filteredImages.length === 0) {
        toast.error('Please provide at least one product image');
        setLoading(false);
        return;
      }

      const productData = {
        ...formData,
        images: filteredImages,
        flavors: formData.flavors ? formData.flavors.split(',').map(f => f.trim()).filter(f => f) : [],
        weights: formData.weights ? formData.weights.split(',').map(w => w.trim()).filter(w => w) : [],
        rating: editingProduct?.rating || 5,
        numReviews: editingProduct?.numReviews || 0,
        salesCount: editingProduct?.salesCount ?? (Math.floor(Math.random() * 51) + 50),
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
        await logAction(adminUser!.uid, adminUser!.email, adminUser!.displayName, 'UPDATE_PRODUCT', `Updated product: ${productData.name}`, 'admin');
        toast.success('Product updated successfully');
      } else {
        await addDoc(collection(db, 'products'), productData);
        await logAction(adminUser!.uid, adminUser!.email, adminUser!.displayName, 'CREATE_PRODUCT', `Created product: ${productData.name}`, 'admin');
        toast.success('Product added successfully');
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ 
        name: '', 
        description: '', 
        price: 0, 
        discountPrice: 0, 
        category: CATEGORIES[0], 
        brand: '', 
        goal: GOALS[0].id, 
        stock: 0, 
        images: ['', '', '', ''], 
        flavors: '',
        weights: '',
        commissionRate: DEFAULT_COMMISSION_RATE, 
        specialOffer: '' 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      await logAction(adminUser!.uid, adminUser!.email, adminUser!.displayName, 'DELETE_PRODUCT', `Deleted product ID: ${id}`, 'admin');
      toast.success('Product deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Manage <span className="text-orange-600">Products</span></h1>
          <p className="text-gray-500 mt-2">Add, edit, or remove products from your store.</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ 
              name: '', 
              description: '', 
              price: 0, 
              discountPrice: 0, 
              category: CATEGORIES[0], 
              brand: '', 
              goal: GOALS[0].id, 
              stock: 0, 
              images: ['', '', '', ''], 
              flavors: '',
              weights: '',
              commissionRate: 0.05, 
              specialOffer: '' 
            });
            setIsModalOpen(true);
          }}
          className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Price</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Stock</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-gray-100 flex items-center justify-center">
                        <img src={product.images[0] || 'https://picsum.photos/seed/supplement/100/100'} alt={product.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.category}</td>
                  <td className="px-6 py-4 text-sm font-black text-gray-900">₹{product.price}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      product.stock > 10 ? "bg-green-100 text-green-700" : 
                      product.stock > 0 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                    )}>
                      {product.stock} in stock
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setFormData({
                            name: product.name,
                            description: product.description,
                            price: product.price,
                            discountPrice: product.discountPrice || 0,
                            category: product.category,
                            brand: product.brand,
                            goal: product.goal,
                            stock: product.stock,
                            images: Array(4).fill('').map((_, i) => product.images[i] || ''),
                            flavors: (product.flavors || []).join(', '),
                            weights: (product.weights || []).join(', '),
                            commissionRate: product.commissionRate || 0.05,
                            specialOffer: product.specialOffer || '',
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <p className="text-sm text-gray-500">Fill in the product details below.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Product Name</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                        placeholder="e.g. Whey Protein Isolate"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Brand</label>
                      <input 
                        type="text" 
                        value={formData.brand}
                        onChange={(e) => setFormData({...formData, brand: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                        placeholder="e.g. Optimum Nutrition"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Price (₹)</label>
                        <input 
                          type="number" 
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Discount Price (₹)</label>
                        <input 
                          type="number" 
                          value={formData.discountPrice}
                          onChange={(e) => setFormData({...formData, discountPrice: Number(e.target.value)})}
                          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Category</label>
                        <select 
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                        >
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Goal</label>
                        <select 
                          value={formData.goal}
                          onChange={(e) => setFormData({...formData, goal: e.target.value})}
                          className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                        >
                          {GOALS.map(goal => <option key={goal.id} value={goal.id}>{goal.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Description</label>
                      <textarea 
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20 min-h-[120px]"
                        placeholder="Product description..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Stock Quantity</label>
                      <input 
                        type="number" 
                        value={formData.stock}
                        onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Commission Rate (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={formData.commissionRate * 100}
                        onChange={(e) => setFormData({...formData, commissionRate: Number(e.target.value) / 100})}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Special Offer Text</label>
                      <input 
                        type="text" 
                        value={formData.specialOffer}
                        onChange={(e) => setFormData({...formData, specialOffer: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                        placeholder="e.g. BUY 1 GET 1 FREE"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-1">Product Images (Up to 4)</label>
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="flex gap-2">
                          <input 
                            type="text" 
                            value={formData.images[index]}
                            onChange={(e) => {
                              const newImages = [...formData.images];
                              newImages[index] = e.target.value;
                              setFormData({...formData, images: newImages});
                            }}
                            className="flex-grow bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20 text-sm"
                            placeholder={`Image URL ${index + 1}`}
                          />
                          {formData.images[index] && (
                            <div className="w-11 h-11 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                              <img src={formData.images[index]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Flavors (Comma separated)</label>
                      <input 
                        type="text" 
                        value={formData.flavors}
                        onChange={(e) => setFormData({...formData, flavors: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                        placeholder="e.g. Chocolate, Vanilla, Strawberry"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Weights (Comma separated)</label>
                      <input 
                        type="text" 
                        value={formData.weights}
                        onChange={(e) => setFormData({...formData, weights: e.target.value})}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                        placeholder="e.g. 1KG, 2KG, 5KG"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50 flex gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-grow bg-white text-gray-900 py-4 rounded-2xl font-bold border border-gray-200 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProduct}
                  disabled={loading}
                  className="flex-grow-[2] bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-2 disabled:bg-orange-400"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminProducts;
