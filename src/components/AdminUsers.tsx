import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { UserProfile, Order, TrainerSession } from '../types';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { X, TrendingUp, RefreshCw, Shield, User as UserIcon, Dumbbell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { DEFAULT_COMMISSION_RATE, DEFAULT_DISCOUNT_RATE, CATEGORIES } from '../constants';

const UserCampaignModal = ({ user, onClose }: { user: UserProfile, onClose: () => void }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [manualCoupon, setManualCoupon] = useState(user.couponCode || '');
  const [isSavingCoupon, setIsSavingCoupon] = useState(false);

  useEffect(() => {
    if (!user.couponCode) {
      setLoading(false);
      return;
    }
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
    const currentStatus = user.isCouponDisabled || false;
    try {
      await updateDoc(doc(db, 'users', user.uid), { isCouponDisabled: !currentStatus });
      toast.success(!currentStatus ? 'Coupon disabled' : 'Coupon enabled');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const saveManualCoupon = async () => {
    if (!manualCoupon.trim()) {
      toast.error('Coupon code cannot be empty');
      return;
    }
    setIsSavingCoupon(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { couponCode: manualCoupon.trim().toUpperCase() });
      toast.success('Coupon code updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSavingCoupon(false);
    }
  };

  const regenerateCoupon = async () => {
    if (!window.confirm('Are you sure you want to regenerate this coupon code? The old code will no longer work.')) return;
    setIsRegenerating(true);
    try {
      const newCode = (user.displayName?.split(' ')[0]?.toUpperCase() || 'USER') + Math.floor(1000 + Math.random() * 9000);
      await updateDoc(doc(db, 'users', user.uid), { couponCode: newCode });
      setManualCoupon(newCode);
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

  const updateDiscount = async (rate: number) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { customDiscountRate: rate });
      toast.success('Custom discount rate updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const toggleCategoryRestriction = async (category: string) => {
    const current = user.allowedCouponCategories || [];
    let updated;
    if (current.includes(category)) {
      updated = current.filter(c => c !== category);
    } else {
      updated = [...current, category];
    }
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { allowedCouponCategories: updated });
      toast.success(`Category ${category} ${current.includes(category) ? 'removed' : 'added'} to restrictions`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const updateWalletBalance = async (field: string, value: number) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { [`wallet.${field}`]: value });
      toast.success(`Wallet ${field} updated to ₹${value.toFixed(2)}`);
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

        <div className="flex-grow overflow-y-auto p-8 space-y-12 custom-scrollbar">
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

          {/* Wallet Management */}
          <div className="space-y-6">
            <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Wallet Balance Management</h5>
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { label: 'Pending', field: 'pending', color: 'text-blue-600' },
                { label: 'Withdrawable', field: 'withdrawable', color: 'text-green-600' },
                { label: 'Total Earned', field: 'totalEarned', color: 'text-gray-900' },
              ].map((item) => (
                <div key={item.field} className="space-y-4">
                  <p className="text-sm font-bold text-gray-900">{item.label} Balance</p>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input 
                        type="number"
                        defaultValue={(user.wallet as any)[item.field]}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val !== (user.wallet as any)[item.field]) {
                            updateWalletBalance(item.field, val);
                          }
                        }}
                        className={cn(
                          "w-full bg-gray-50 border-none rounded-xl pl-8 pr-4 py-3 text-sm font-black focus:ring-2 ring-orange-500/20",
                          item.color
                        )}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">Edit and click outside to save</p>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Coupon Controls</h5>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6 shadow-sm">
                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-900">Referral Code</p>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={manualCoupon}
                      onChange={(e) => setManualCoupon(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="flex-grow bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-black tracking-widest focus:ring-2 ring-orange-500/20"
                    />
                    <button 
                      onClick={saveManualCoupon}
                      disabled={isSavingCoupon || manualCoupon === user.couponCode}
                      className="bg-gray-900 text-white px-4 rounded-xl text-xs font-bold hover:bg-gray-800 disabled:opacity-50 transition-all"
                    >
                      {isSavingCoupon ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={regenerateCoupon}
                      disabled={isRegenerating}
                      className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-all active:scale-95 disabled:opacity-50"
                      title="Generate Random"
                    >
                      <RefreshCw className={cn("w-5 h-5", isRegenerating && "animate-spin")} />
                    </button>
                  </div>
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

              <div className="space-y-6">
                <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Category Restrictions</h5>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4 shadow-sm">
                  <p className="text-sm font-bold text-gray-900">Allowed Categories</p>
                  <p className="text-[10px] text-gray-500 mb-2 font-medium uppercase tracking-wider leading-relaxed">
                    If none selected, coupon works on all categories. If selected, it ONLY works for those categories.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => {
                      const isActive = user.allowedCouponCategories?.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategoryRestriction(cat)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                            isActive 
                              ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20" 
                              : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                          )}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest">Commission & Discount Overrides</h5>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-8 shadow-sm">
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-4">Referral Commission Rate</p>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="50" 
                      step="1"
                      value={Math.round((user.customCommissionRate !== undefined ? user.customCommissionRate : DEFAULT_COMMISSION_RATE) * 100)}
                      onChange={(e) => updateCommission(Number(e.target.value) / 100)}
                      className="flex-grow h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                    <div className="w-16 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-center">
                      <span className="text-sm font-black text-gray-900">{Math.round((user.customCommissionRate !== undefined ? user.customCommissionRate : DEFAULT_COMMISSION_RATE) * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 italic">
                    {user.customCommissionRate !== undefined ? 'Custom commission active' : 'Using default system rate'}
                  </p>
                </div>

                <div className="pt-6 border-t border-gray-50">
                  <p className="text-sm font-bold text-gray-900 mb-4">Customer Discount Rate</p>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="50" 
                      step="1"
                      value={Math.round((user.customDiscountRate !== undefined ? user.customDiscountRate : DEFAULT_DISCOUNT_RATE) * 100)}
                      onChange={(e) => updateDiscount(Number(e.target.value) / 100)}
                      className="flex-grow h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-green-600"
                    />
                    <div className="w-16 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-center">
                      <span className="text-sm font-black text-gray-900">{Math.round((user.customDiscountRate !== undefined ? user.customDiscountRate : DEFAULT_DISCOUNT_RATE) * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 italic">
                    {user.customDiscountRate !== undefined ? 'Custom discount active' : 'Using default system rate'}
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Customer</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.map(order => (
                        <tr key={order.id}>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">#{order.id.slice(-6).toUpperCase()}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{order.shippingAddress.fullName}</td>
                          <td className="px-6 py-4 text-sm font-black text-gray-900">₹{order.totalAmount}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              order.status === 'delivered' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                            )}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">No orders found for this coupon code.</div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const AdminUsers = () => {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [trainerSessions, setTrainerSessions] = useState<TrainerSession[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let usersLoaded = false;
    let trainerLoaded = false;

    const checkLoading = () => {
      if (usersLoaded && trainerLoaded) {
        setLoading(false);
      }
    };

    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snapshot) => {
      const updatedUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(updatedUsers);
      
      // Keep selected user in sync
      if (selectedUser) {
        const updatedSelectedUser = updatedUsers.find(u => u.uid === selectedUser.uid);
        if (updatedSelectedUser) {
          setSelectedUser(updatedSelectedUser);
        }
      }
      
      usersLoaded = true;
      checkLoading();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
      usersLoaded = true;
      checkLoading();
    });

    const unsubTrainer = onSnapshot(collection(db, 'trainer_sessions'), (snapshot) => {
      setTrainerSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainerSession)));
      trainerLoaded = true;
      checkLoading();
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'trainer_sessions');
      trainerLoaded = true;
      checkLoading();
    });

    return () => {
      unsubUsers();
      unsubTrainer();
    };
  }, [selectedUser?.uid]);

  const toggleAdmin = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.uid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.phoneNumber && user.phoneNumber.includes(searchQuery))
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Manage <span className="text-orange-600">Users</span></h1>
          <p className="text-gray-500 mt-2">View and manage user accounts and referral campaigns.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search by name, email, phone or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl focus:border-orange-500/20 focus:ring-0 transition-all font-bold text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Trainer</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Coupon</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Wallet</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(user => {
                const session = trainerSessions.find(s => s.userId === user.uid);
                const isTrainerActive = session?.status === 'active' && new Date(session.expiresAt!) > new Date();
                
                return (
                  <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                          {user.photoURL ? <img src={user.photoURL} className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" /> : <UserIcon className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{user.displayName}</p>
                          <p className="text-[10px] text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        user.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {session ? (
                        <div className="flex items-center gap-2">
                          <Dumbbell className={cn("w-4 h-4", isTrainerActive ? "text-orange-600" : "text-gray-300")} />
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            isTrainerActive ? "text-orange-600" : "text-gray-400"
                          )}>
                            {session.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">No Session</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-orange-600 tracking-widest">{user.couponCode}</span>
                      {user.isCouponDisabled && (
                        <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">Disabled</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-gray-900">₹{user.wallet.withdrawable.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400">₹{user.wallet.pending.toFixed(2)} pending</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                        title="Campaign Management"
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleAdmin(user.uid, user.role)}
                        className={cn(
                          "p-2 transition-colors",
                          user.role === 'admin' ? "text-purple-600 hover:text-purple-700" : "text-gray-400 hover:text-purple-600"
                        )}
                        title={user.role === 'admin' ? "Remove Admin" : "Make Admin"}
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
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

export default AdminUsers;
