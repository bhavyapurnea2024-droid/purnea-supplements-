import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDoc, setDoc, orderBy, getDocs, where, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { Product, Order, UserProfile, WithdrawalRequest, Referral, AuditLog } from '../types';
import { LayoutDashboard, Package, ShoppingBag, Users, Ticket, Wallet, BarChart3, Plus, Search, Filter, Edit2, Trash2, CheckCircle2, XCircle, Clock, ChevronRight, ArrowUpRight, ArrowDownRight, MoreVertical, Save, X, Image as ImageIcon, Star, TrendingUp, RefreshCw, Eye, History, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { CATEGORIES, GOALS, DEFAULT_COMMISSION_RATE, MIN_WITHDRAWAL_AMOUNT } from '../constants';
import { useAuth } from '../AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

const AdminDashboard = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Unauthorized access');
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!isAdmin) return null;

  const sidebarLinks = [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'Products', path: '/admin/products', icon: Package },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Withdrawals', path: '/admin/withdrawals', icon: Wallet },
    { name: 'Referrals', path: '/admin/referrals', icon: Ticket },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: History },
    { name: 'Settings', path: '/admin/settings', icon: MoreVertical },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden lg:flex flex-col sticky top-16 h-[calc(100vh-64px)]">
        <div className="p-6 flex-grow overflow-y-auto space-y-2">
          {sidebarLinks.map(link => (
            <Link 
              key={link.path} 
              to={link.path} 
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                location.pathname === link.path 
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.name}
            </Link>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-8">
        <Routes>
          <Route path="/" element={<AdminOverview />} />
          <Route path="/products" element={<AdminProducts />} />
          <Route path="/orders" element={<AdminOrders />} />
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/withdrawals" element={<AdminWithdrawals />} />
          <Route path="/referrals" element={<AdminReferrals />} />
          <Route path="/analytics" element={<AdminAnalytics />} />
          <Route path="/audit-logs" element={<AdminAuditLogs />} />
          <Route path="/settings" element={<AdminSettings />} />
        </Routes>
      </main>
    </div>
  );
};

const AdminOverview = () => {
  const { user: authUser, profile: adminProfile } = useAuth();
  const [commissionSearch, setCommissionSearch] = useState('');
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalCommission: 0,
    totalProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);

  useEffect(() => {
    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setRecentOrders(orders.slice(0, 5));
      
      const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      setStats(prev => ({ ...prev, totalOrders: orders.length, totalSales }));

      // Prepare chart data (last 7 days)
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const chartData = last7Days.map(date => {
        const dayOrders = orders.filter(o => o.createdAt.startsWith(date));
        return {
          date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }),
          sales: dayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
          orders: dayOrders.length
        };
      });
      setSalesData(chartData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usrs = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as UserProfile));
      setUsers(usrs);
      setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setStats(prev => ({ ...prev, totalProducts: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    const unsubReferrals = onSnapshot(collection(db, 'referrals'), (snapshot) => {
      const refs = snapshot.docs.map(doc => doc.data() as Referral);
      setStats(prev => ({ ...prev, totalCommission: refs.reduce((sum, r) => sum + r.amount, 0) }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'referrals');
    });

    const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'withdrawals');
    });

    return () => {
      unsubOrders();
      unsubUsers();
      unsubReferrals();
      unsubProducts();
      unsubWithdrawals();
    };
  }, []);

  const updateCommission = async (userId: string, rate: number) => {
    try {
      await updateDoc(doc(db, 'users', userId), { customCommissionRate: rate });
      if (adminProfile) {
        await logAction(adminProfile.uid, adminProfile.email, adminProfile.displayName, 'UPDATE_USER_COMMISSION', `Updated commission rate for user ID: ${userId} to ${Math.round(rate * 100)}%`, 'admin');
      }
      toast.success('Commission rate updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Admin <span className="text-orange-600">Overview</span></h1>
          <p className="text-gray-500 mt-2">Business performance at a glance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Sales', value: `₹${stats.totalSales.toLocaleString()}`, icon: ShoppingBag, color: 'orange' },
          { label: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'blue' },
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'purple' },
          { label: 'Commission Paid', value: `₹${stats.totalCommission.toLocaleString()}`, icon: Ticket, color: 'green' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center mb-6",
              stat.color === 'orange' ? "bg-orange-50 text-orange-600" :
              stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
              stat.color === 'purple' ? "bg-purple-50 text-purple-600" :
              "bg-green-50 text-green-600"
            )}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{stat.label}</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Sales Chart */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Sales Trend (Last 7 Days)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 800, color: '#ea580c' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#ea580c" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 flex items-center justify-between border-b border-gray-50">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Recent Orders</h2>
              <Link to="/admin/orders" className="text-orange-600 font-bold text-sm hover:underline">View All</Link>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-4 text-sm font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</td>
                    <td className="px-8 py-4 text-sm font-black text-gray-900">₹{order.totalAmount}</td>
                    <td className="px-8 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        order.status === 'delivered' ? "bg-green-100 text-green-700" : 
                        order.status === 'pending' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="lg:col-span-1 space-y-12">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">Top Referrers</h2>
            <div className="space-y-6">
              {users.sort((a, b) => (b.wallet?.totalEarned || 0) - (a.wallet?.totalEarned || 0)).slice(0, 5).map((user, i) => (
                <div key={user.uid} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center font-black">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 uppercase truncate w-32">{user.displayName || 'User'}</p>
                      <p className="text-[10px] text-gray-400">{user.couponCode}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-orange-600">₹{user.wallet?.totalEarned?.toLocaleString() || 0}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Commission Control</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  className="pl-9 pr-4 py-1.5 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 ring-orange-500/20 w-40"
                  onChange={(e) => setCommissionSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
              {users
                .filter(u => 
                  u.displayName?.toLowerCase().includes(commissionSearch.toLowerCase()) || 
                  u.email?.toLowerCase().includes(commissionSearch.toLowerCase()) ||
                  u.phoneNumber?.includes(commissionSearch)
                )
                .map((user) => (
                <div key={user.uid} className="group p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-orange-100 hover:bg-white hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black">
                        {user.displayName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 uppercase truncate w-32">{user.displayName || 'User'}</p>
                        <div className="flex flex-col">
                          <p className="text-[10px] text-gray-400 font-bold">{user.email}</p>
                          <p className="text-[10px] text-orange-600 font-black">{user.phoneNumber || 'No Phone'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        step="1"
                        min="0"
                        max="100"
                        value={Math.round((user.customCommissionRate !== undefined ? user.customCommissionRate : (user.commissionRate || 0.05)) * 100)}
                        onChange={(e) => updateCommission(user.uid, Number(e.target.value) / 100)}
                        className="w-14 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-black text-center focus:ring-2 ring-orange-500/20"
                      />
                      <span className="text-xs font-black text-gray-400">%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100/50">
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold">
                      <Phone className="w-3 h-3" />
                      <span>{user.phoneNumber || 'No Phone'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Ticket className="w-3 h-3 text-orange-400" />
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{user.couponCode}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 p-8 rounded-3xl text-white shadow-xl shadow-gray-900/20">
            <h2 className="text-xl font-black uppercase tracking-tight mb-8">Quick Actions</h2>
            <div className="space-y-4">
              <Link to="/admin/products" className="flex items-center justify-between p-6 bg-white/10 rounded-3xl hover:bg-white/20 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-bold">Add New Product</span>
                </div>
                <ChevronRight className="w-5 h-5 opacity-30 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link to="/admin/withdrawals" className="flex items-center justify-between p-6 bg-white/10 rounded-3xl hover:bg-white/20 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold block">Review Withdrawals</span>
                    <span className="text-[10px] opacity-60">{withdrawals.filter(w => w.status === 'pending').length} pending requests</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 opacity-30 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    images: [''],
    commissionRate: 0.05,
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
    setLoading(true);
    try {
      const productData = {
        ...formData,
        rating: editingProduct?.rating || 5,
        numReviews: editingProduct?.numReviews || 0,
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
      setFormData({ name: '', description: '', price: 0, discountPrice: 0, category: CATEGORIES[0], brand: '', goal: GOALS[0].id, stock: 0, images: [''] });
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
            setFormData({ name: '', description: '', price: 0, discountPrice: 0, category: CATEGORIES[0], brand: '', goal: GOALS[0].id, stock: 0, images: [''], commissionRate: 0.05 });
            setIsModalOpen(true);
          }}
          className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
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
                          images: product.images,
                          commissionRate: product.commissionRate || 0.05,
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
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 max-h-[90vh] overflow-y-auto scrollbar-hide">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Product Name</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                      placeholder="e.g. Whey Protein Isolate"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20 min-h-[100px]"
                      placeholder="Product details, ingredients, usage..."
                    />
                  </div>
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
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Brand</label>
                    <input 
                      type="text" 
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                      placeholder="e.g. Optimum Nutrition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Goal</label>
                    <select 
                      value={formData.goal}
                      onChange={(e) => setFormData({...formData, goal: e.target.value as any})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                    >
                      {GOALS.map(goal => <option key={goal.id} value={goal.id}>{goal.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Stock</label>
                    <input 
                      type="number" 
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Commission %</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.commissionRate * 100}
                      onChange={(e) => setFormData({...formData, commissionRate: Number(e.target.value) / 100})}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                      placeholder="Default 5%"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Image URL</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={formData.images[0]}
                        onChange={(e) => setFormData({...formData, images: [e.target.value]})}
                        className="flex-grow bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                        placeholder="https://..."
                      />
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-gray-200">
                        {formData.images[0] ? <img src={formData.images[0]} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" /> : <ImageIcon className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex gap-4">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-grow bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProduct}
                    disabled={loading}
                    className="flex-grow bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all active:scale-95 disabled:bg-gray-200"
                  >
                    {loading ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminOrders = () => {
  const { user: adminUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;
      const orderData = orderSnap.data() as Order;
      const oldStatus = orderData.status;

      await updateDoc(orderRef, { status, updatedAt: new Date().toISOString() });
      await logAction(adminUser!.uid, adminUser!.email, adminUser!.displayName, 'UPDATE_ORDER_STATUS', `Updated order #${orderId.slice(-6)} status to ${status}`, 'admin');
      toast.success(`Order status updated to ${status}`);

      // Logic for commission maturity
      if (status === 'delivered' && oldStatus !== 'delivered' && orderData.referralUserId) {
        const q = query(
          collection(db, 'referrals'), 
          where('orderId', '==', orderId),
          where('status', '==', 'pending')
        );
        const refSnapshot = await getDocs(q);
        
        if (!refSnapshot.empty) {
          const refDoc = refSnapshot.docs[0];
          const refData = refDoc.data() as Referral;
          
          await updateDoc(doc(db, 'referrals', refDoc.id), { status: 'earned' });
          
          const userRef = doc(db, 'users', orderData.referralUserId);
          await updateDoc(userRef, {
            'wallet.pending': increment(-refData.amount),
            'wallet.withdrawable': increment(refData.amount),
          });
          toast.success('Referral commission matured!');
        }
      }

      // Logic for cancellation
      if (status === 'cancelled' && oldStatus !== 'cancelled' && orderData.referralUserId) {
        const q = query(
          collection(db, 'referrals'), 
          where('orderId', '==', orderId),
          where('status', '==', 'pending')
        );
        const refSnapshot = await getDocs(q);
        if (!refSnapshot.empty) {
          const refDoc = refSnapshot.docs[0];
          const refData = refDoc.data() as Referral;
          await updateDoc(doc(db, 'referrals', refDoc.id), { status: 'cancelled' });
          const userRef = doc(db, 'users', orderData.referralUserId);
          await updateDoc(userRef, {
            'wallet.pending': increment(-refData.amount),
            'wallet.totalEarned': increment(-refData.amount),
          });
          toast.info('Referral commission cancelled');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Manage <span className="text-orange-600">Orders</span></h1>
        <p className="text-gray-500 mt-2">Track and update customer orders.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Customer</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Items</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Total</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-900">{order.shippingAddress.fullName}</p>
                  <p className="text-[10px] text-gray-500">{order.shippingAddress.phone}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.items.length} items</td>
                <td className="px-6 py-4 text-sm font-black text-gray-900">₹{order.totalAmount}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    order.status === 'delivered' ? "bg-green-100 text-green-700" : 
                    order.status === 'pending' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    className="text-xs font-bold bg-gray-50 border-none rounded-lg focus:ring-2 ring-orange-500/20"
                  >
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UserCampaignModal = ({ user, onClose }: { user: UserProfile, onClose: () => void }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('couponUsed', '==', user.couponCode));
    const unsub = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `orders-for-coupon-${user.couponCode}`);
      setLoading(false);
    });
    return () => unsub();
  }, [user.couponCode]);

  const toggleCouponStatus = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { isCouponDisabled: !user.isCouponDisabled });
      toast.success(user.isCouponDisabled ? 'Coupon enabled' : 'Coupon disabled');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const regenerateCoupon = async () => {
    if (!confirm('Are you sure you want to regenerate this coupon code? The old code will no longer work.')) return;
    setIsRegenerating(true);
    try {
      const newCode = (user.displayName.split(' ')[0].toUpperCase() || 'USER') + Math.floor(1000 + Math.random() * 9000);
      await updateDoc(doc(db, 'users', user.uid), { couponCode: newCode });
      toast.success(`New coupon code generated: ${newCode}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const updateCommission = async (rate: number) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { customCommissionRate: rate });
      toast.success('Custom commission rate updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
      ></motion.div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Campaign Management</h3>
              <p className="text-sm text-gray-500 font-bold">{user.displayName} • {user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8 space-y-12">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Earnings</p>
              <h4 className="text-2xl font-black text-gray-900">₹{user.wallet.totalEarned.toFixed(2)}</h4>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pending</p>
              <h4 className="text-2xl font-black text-blue-600">₹{user.wallet.pending.toFixed(2)}</h4>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Withdrawable</p>
              <h4 className="text-2xl font-black text-green-600">₹{user.wallet.withdrawable.toFixed(2)}</h4>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Orders</p>
              <h4 className="text-2xl font-black text-orange-600">{orders.length}</h4>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Coupon Controls</h5>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Coupon Code</p>
                    <p className="text-2xl font-black text-orange-600 tracking-widest mt-1">{user.couponCode}</p>
                  </div>
                  <button 
                    onClick={regenerateCoupon}
                    disabled={isRegenerating}
                    className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-all active:scale-95 disabled:opacity-50"
                    title="Regenerate Code"
                  >
                    <RefreshCw className={cn("w-5 h-5", isRegenerating && "animate-spin")} />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">Coupon Status</p>
                    <p className="text-xs text-gray-500">{user.isCouponDisabled ? 'Disabled - Users cannot use this code' : 'Enabled - Active for all users'}</p>
                  </div>
                  <button 
                    onClick={toggleCouponStatus}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      user.isCouponDisabled ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                    )}
                  >
                    {user.isCouponDisabled ? 'Enable' : 'Disable'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Commission Override</h5>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6 shadow-sm">
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-4">Referral Commission Rate</p>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="50" 
                      step="1"
                      value={Math.round((user.customCommissionRate !== undefined ? user.customCommissionRate : 0.05) * 100)}
                      onChange={(e) => updateCommission(Number(e.target.value) / 100)}
                      className="flex-grow h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                    <div className="w-16 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-center">
                      <span className="text-sm font-black text-gray-900">{Math.round((user.customCommissionRate !== undefined ? user.customCommissionRate : 0.05) * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-4 italic">
                    {user.customCommissionRate !== undefined ? 'Custom rate is active' : 'Using default system rate (5%)'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Contacts */}
          <div className="space-y-6">
            <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Referral Contacts & Orders</h5>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-400">Loading contacts...</div>
              ) : orders.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">{order.shippingAddress.fullName}</p>
                          <p className="text-[10px] text-gray-500">{order.shippingAddress.phone}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-500">#{order.id.slice(-6).toUpperCase()}</td>
                        <td className="px-6 py-4 text-sm font-black text-gray-900">₹{order.totalAmount}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                            order.status === 'delivered' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-gray-400">No referral orders found for this user.</div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const AdminUsers = () => {
  const { user: authUser, profile: adminProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as unknown as UserProfile)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    const unsubReferrals = onSnapshot(collection(db, 'referrals'), (snapshot) => {
      setReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'referrals');
    });

    return () => {
      unsubUsers();
      unsubReferrals();
    };
  }, []);

  const getReferralCount = (userId: string) => {
    return referrals.filter(r => r.couponOwnerId === userId).length;
  };

  const updateCommission = async (userId: string, rate: number) => {
    try {
      await updateDoc(doc(db, 'users', userId), { customCommissionRate: rate });
      if (adminProfile) {
        await logAction(adminProfile.uid, adminProfile.email, adminProfile.displayName, 'UPDATE_USER_COMMISSION', `Updated commission rate for user ID: ${userId} to ${Math.round(rate * 100)}%`, 'admin');
      }
      toast.success('Custom commission rate updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const updateCouponCode = async (userId: string, newCode: string) => {
    if (!newCode.trim()) return;
    try {
      // Check if code already exists
      const q = query(collection(db, 'users'), where('couponCode', '==', newCode.toUpperCase()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty && snapshot.docs[0].id !== userId) {
        toast.error('Coupon code already in use');
        return;
      }

      await updateDoc(doc(db, 'users', userId), { couponCode: newCode.toUpperCase() });
      if (adminProfile) {
        await logAction(adminProfile.uid, adminProfile.email, adminProfile.displayName, 'UPDATE_USER_COUPON', `Updated coupon code for user ID: ${userId} to ${newCode.toUpperCase()}`, 'admin');
      }
      toast.success('Coupon code updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const toggleBlockStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isBlocked: !currentStatus });
      if (adminProfile) {
        await logAction(adminProfile.uid, adminProfile.email, adminProfile.displayName, !currentStatus ? 'BLOCK_USER' : 'UNBLOCK_USER', `${!currentStatus ? 'Blocked' : 'Unblocked'} user ID: ${userId}`, 'admin');
      }
      toast.success(!currentStatus ? 'User blocked' : 'User unblocked');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Manage <span className="text-orange-600">Users</span></h1>
        <p className="text-gray-500 mt-2">View and manage platform users and their commissions.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Coupon</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Referrals</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Commission</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Wallet</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(user => (
              <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden">
                      <img src={`https://ui-avatars.com/api/?name=${user.displayName}`} alt={user.displayName} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{user.displayName}</p>
                      <p className="text-[10px] text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.phoneNumber || 'N/A'}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        defaultValue={user.couponCode}
                        onBlur={(e) => {
                          if (e.target.value !== user.couponCode) {
                            updateCouponCode(user.uid, e.target.value);
                          }
                        }}
                        className={cn(
                          "w-24 bg-gray-50 border-none rounded-lg px-2 py-1 text-xs font-black tracking-widest focus:ring-2 ring-orange-500/20",
                          user.isCouponDisabled ? "text-gray-400 line-through" : "text-orange-600"
                        )}
                      />
                    </div>
                    {user.isCouponDisabled && <span className="text-[8px] font-black text-red-500 uppercase">Disabled</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">{getReferralCount(user.uid)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="1"
                      value={Math.round((user.customCommissionRate !== undefined ? user.customCommissionRate : (user.commissionRate || 0.05)) * 100)}
                      onChange={(e) => updateCommission(user.uid, Number(e.target.value) / 100)}
                      className="w-16 bg-gray-50 border-none rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 ring-orange-500/20"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-black text-gray-900">₹{user.wallet.withdrawable.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    user.isBlocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  )}>
                    {user.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedUser(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title="Manage Campaign"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => toggleBlockStatus(user.uid, !!user.isBlocked)}
                      className={cn(
                        "p-2 rounded-xl transition-colors",
                        user.isBlocked ? "text-green-600 hover:bg-green-50" : "text-red-600 hover:bg-red-50"
                      )}
                      title={user.isBlocked ? "Unblock User" : "Block User"}
                    >
                      {user.isBlocked ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selectedUser && (
          <UserCampaignModal 
            user={selectedUser} 
            onClose={() => setSelectedUser(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminWithdrawals = () => {
  const { user: authUser, profile: adminProfile } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc')), (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'withdrawals');
    });
    return () => unsub();
  }, []);

  const handleStatusUpdate = async (withdrawal: WithdrawalRequest, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'withdrawals', withdrawal.id), { 
        status, 
        processedAt: new Date().toISOString() 
      });
      if (adminProfile) {
        await logAction(adminProfile.uid, adminProfile.email, adminProfile.displayName, `WITHDRAWAL_${status.toUpperCase()}`, `${status.charAt(0).toUpperCase() + status.slice(1)} withdrawal request #${withdrawal.id.slice(-6)} for ₹${withdrawal.amount}`, 'admin');
      }
      
      // If rejected, refund to withdrawable balance
      if (status === 'rejected') {
        const userRef = doc(db, 'users', withdrawal.userId);
        await updateDoc(userRef, {
          'wallet.withdrawable': increment(withdrawal.amount),
        });
      }
      
      toast.success(`Withdrawal ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `withdrawals/${withdrawal.id}`);
    }
  };

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Manage <span className="text-orange-600">Withdrawals</span></h1>
        <p className="text-gray-500 mt-2">Approve or reject user withdrawal requests.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">User ID</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">UPI ID</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {withdrawals.map(w => (
              <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-xs text-gray-500 font-mono">{w.userId}</td>
                <td className="px-6 py-4 text-sm font-black text-gray-900">₹{w.amount}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{w.upiId}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    w.status === 'approved' ? "bg-green-100 text-green-700" : 
                    w.status === 'pending' ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                  )}>
                    {w.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {w.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleStatusUpdate(w, 'approved')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(w, 'rejected')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminReferrals = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'referrals'), orderBy('createdAt', 'desc')), (snapshot) => {
      setReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'referrals');
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Manage <span className="text-orange-600">Referrals</span></h1>
        <p className="text-gray-500 mt-2">Track all referral commissions generated across the platform.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Referrer ID</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Commission</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {referrals.map(ref => (
              <tr key={ref.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-600">{new Date(ref.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-xs text-gray-500 font-mono">{ref.couponOwnerId}</td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">#{ref.orderId.slice(-6).toUpperCase()}</td>
                <td className="px-6 py-4 text-sm font-black text-orange-600">₹{ref.amount.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    ref.status === 'earned' ? "bg-green-100 text-green-700" : 
                    ref.status === 'pending' ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                  )}>
                    {ref.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminAnalytics = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    const unsubReferrals = onSnapshot(collection(db, 'referrals'), (snapshot) => {
      setReferrals(snapshot.docs.map(doc => doc.data() as Referral));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'referrals');
    });
    setLoading(false);
    return () => {
      unsubOrders();
      unsubUsers();
      unsubReferrals();
    };
  }, []);

  // Process data for charts
  const revenueByMonth = orders.reduce((acc: any, order) => {
    const month = new Date(order.createdAt).toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + order.totalAmount;
    return acc;
  }, {});

  const chartData = Object.keys(revenueByMonth).map(month => ({
    name: month,
    revenue: revenueByMonth[month]
  }));

  const categoryData = orders.reduce((acc: any, order) => {
    order.items.forEach(item => {
      acc[item.category] = (acc[item.category] || 0) + 1;
    });
    return acc;
  }, {});

  const pieData = Object.keys(categoryData).map(cat => ({
    name: cat,
    value: categoryData[cat]
  }));

  const COLORS = ['#ea580c', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-12 pb-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Business <span className="text-orange-600">Analytics</span></h1>
        <p className="text-gray-500 mt-2">In-depth performance reports and metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Revenue Growth</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="revenue" fill="#ea580c" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-tight">Category Distribution</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="text-xs font-bold text-gray-600 uppercase">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc')), (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'audit_logs');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Audit <span className="text-orange-600">Logs</span></h1>
        <p className="text-gray-500 mt-2">Real-time tracking of all user and admin actions.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Details</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading logs...</td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">{log.userName}</p>
                      <p className="text-[10px] text-gray-500">{log.userEmail}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{log.action}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                        log.type === 'admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {log.type}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No activity logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AdminSettings = () => {
  const { user: authUser, profile: adminProfile } = useAuth();
  const [settings, setSettings] = useState({
    defaultCommission: DEFAULT_COMMISSION_RATE * 100,
    minWithdrawal: MIN_WITHDRAWAL_AMOUNT,
    whatsappAlerts: true,
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettings({
          defaultCommission: (data.defaultCommissionRate || DEFAULT_COMMISSION_RATE) * 100,
          minWithdrawal: data.minWithdrawalAmount || MIN_WITHDRAWAL_AMOUNT,
          whatsappAlerts: data.whatsappAlerts ?? true,
          maintenanceMode: data.maintenanceMode ?? false,
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        defaultCommissionRate: settings.defaultCommission / 100,
        minWithdrawalAmount: settings.minWithdrawal,
        whatsappAlerts: settings.whatsappAlerts,
        maintenanceMode: settings.maintenanceMode,
        updatedAt: new Date().toISOString(),
      });
      if (adminProfile) {
        await logAction(adminProfile.uid, adminProfile.email, adminProfile.displayName, 'UPDATE_SETTINGS', 'Updated global platform settings', 'admin');
      }
      toast.success('Settings updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/global');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-12 pb-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Platform <span className="text-orange-600">Settings</span></h1>
        <p className="text-gray-500 mt-2">Configure global platform parameters.</p>
      </div>

      <div className="max-w-2xl bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Default Commission Rate (%)</label>
            <input 
              type="number" 
              value={settings.defaultCommission}
              onChange={(e) => setSettings({...settings, defaultCommission: Number(e.target.value)})}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Minimum Withdrawal (₹)</label>
            <input 
              type="number" 
              value={settings.minWithdrawal}
              onChange={(e) => setSettings({...settings, minWithdrawal: Number(e.target.value)})}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-gray-900">WhatsApp Admin Alerts</p>
              <p className="text-xs text-gray-500">Notify admin on new orders/withdrawals</p>
            </div>
            <button 
              onClick={() => setSettings({...settings, whatsappAlerts: !settings.whatsappAlerts})}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                settings.whatsappAlerts ? "bg-orange-600" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                settings.whatsappAlerts ? "left-7" : "left-1"
              )}></div>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div>
              <p className="text-sm font-bold text-gray-900">Maintenance Mode</p>
              <p className="text-xs text-gray-500">Disable customer-facing website</p>
            </div>
            <button 
              onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                settings.maintenanceMode ? "bg-red-600" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                settings.maintenanceMode ? "left-7" : "left-1"
              )}></div>
            </button>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" /> Save Configuration
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
