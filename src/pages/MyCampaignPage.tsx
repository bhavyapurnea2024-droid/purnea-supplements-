import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, increment, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Referral, WithdrawalRequest } from '../types';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, Users, Copy, Share2, ArrowRight, CheckCircle2, AlertCircle, Clock, ChevronRight, IndianRupee, Plus, Minus, LayoutDashboard, History, CreditCard, X, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { MIN_WITHDRAWAL_AMOUNT } from '../constants';

const MyCampaignPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(300);
  const [upiId, setUpiId] = useState('');
  const [globalSettings, setGlobalSettings] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGlobalSettings(data);
        setWithdrawAmount(data.minWithdrawalAmount || 300);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qReferrals = query(
      collection(db, 'referrals'), 
      where('couponOwnerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const qWithdrawals = query(
      collection(db, 'withdrawals'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubReferrals = onSnapshot(qReferrals, (snapshot) => {
      setReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'referrals'));

    const unsubWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
      setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawals'));

    return () => {
      unsubReferrals();
      unsubWithdrawals();
    };
  }, [user]);

  const handleCopyCoupon = () => {
    if (profile?.couponCode) {
      navigator.clipboard.writeText(profile.couponCode);
      toast.success('Coupon code copied to clipboard!');
    }
  };

  const handleWithdrawRequest = async () => {
    if (!user || !profile) return;
    const minAmount = globalSettings?.minWithdrawalAmount || 300;
    if (withdrawAmount < minAmount) {
      toast.error(`Minimum withdrawal amount is ₹${minAmount}`);
      return;
    }
    if (withdrawAmount > profile.wallet.withdrawable) {
      toast.error('Insufficient withdrawable balance');
      return;
    }
    if (!upiId) {
      toast.error('Please enter your UPI ID');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        amount: withdrawAmount,
        status: 'pending',
        upiId,
        createdAt: new Date().toISOString(),
      });

      // Deduct from withdrawable balance
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'wallet.withdrawable': increment(-withdrawAmount),
      });

      toast.success('Withdrawal request submitted successfully!');
      setIsWithdrawModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'withdrawals');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md w-full">
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <LayoutDashboard className="w-12 h-12 text-orange-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter uppercase leading-none">Join MyCampaign</h2>
          <p className="text-gray-500 mb-10 leading-relaxed">Sign in to unlock your unique referral code and start earning {(profile?.customCommissionRate || globalSettings?.defaultCommissionRate || 0.05) * 100}% commission on every friend's purchase.</p>
          <button className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all active:scale-95">
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-orange-600">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-bold">MyCampaign Dashboard</span>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">MyCampaign <span className="text-orange-600">Dashboard</span></h1>
            <p className="text-gray-500 mt-2">Track your referrals, earnings, and withdrawals.</p>
          </div>
          <button 
            onClick={() => setIsWithdrawModalOpen(true)}
            className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <CreditCard className="w-5 h-5" /> Withdraw Earnings
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-6">
              <Wallet className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Withdrawable</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">₹{profile?.wallet?.withdrawable.toFixed(2)}</h3>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Pending</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">₹{profile?.wallet?.pending.toFixed(2)}</h3>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6">
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Earned</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">₹{profile?.wallet?.totalEarned.toFixed(2)}</h3>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Referrals</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{referrals.length}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Referral History */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Referral History</h2>
                <History className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {referrals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {referrals.map(ref => (
                          <tr key={ref.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-600">{new Date(ref.createdAt).toLocaleDateString()}</td>
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
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-500">No referrals yet. Share your code to start earning!</p>
                  </div>
                )}
              </div>
            </section>

            {/* Withdrawal History */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Withdrawal History</h2>
                <CreditCard className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {withdrawals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">UPI ID</th>
                          <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {withdrawals.map(w => (
                          <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-600">{new Date(w.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm font-black text-gray-900">₹{w.amount.toFixed(2)}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{w.upiId}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                w.status === 'approved' ? "bg-green-100 text-green-700" : 
                                w.status === 'pending' ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                              )}>
                                {w.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-500">No withdrawal requests yet.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            {/* Promo Card */}
            <div className="bg-orange-600 p-8 rounded-3xl shadow-xl shadow-orange-600/20 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              <h3 className="text-2xl font-black tracking-tight mb-6 uppercase leading-none">Your Referral Code</h3>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl mb-8 flex items-center justify-between">
                <span className="text-3xl font-black tracking-widest">{profile?.couponCode}</span>
                <button onClick={handleCopyCoupon} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Copy className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-orange-100 mb-8 leading-relaxed">
                Share this code with your friends. They get a {(profile?.customCommissionRate || globalSettings?.defaultCommissionRate || 0.05) * 100}% discount, and you earn {(profile?.customCommissionRate || globalSettings?.defaultCommissionRate || 0.05) * 100}% commission on every order they place.
              </p>
              <button className="w-full bg-white text-orange-600 py-4 rounded-xl font-bold hover:bg-orange-50 transition-all flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5" /> Share Now
              </button>
            </div>

            {/* How it works */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 mb-8 uppercase tracking-tight">How it works</h3>
              <div className="space-y-8">
                {[
                  { icon: Users, title: 'Share Code', desc: 'Share your unique coupon code with friends.' },
                  { icon: ShoppingBag, title: 'Friend Buys', desc: `Friend gets ${(profile?.customCommissionRate || globalSettings?.defaultCommissionRate || 0.05) * 100}% discount on their purchase.` },
                  { icon: TrendingUp, title: 'Earn Commission', desc: `You earn ${(profile?.customCommissionRate || globalSettings?.defaultCommissionRate || 0.05) * 100}% of the order value as commission.` },
                  { icon: Wallet, title: 'Withdraw', desc: `Withdraw earnings once you reach ₹${globalSettings?.minWithdrawalAmount || 300}.` },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 flex-shrink-0">
                      <step.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{step.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Withdraw Earnings</h3>
                  <button onClick={() => setIsWithdrawModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-gray-50 rounded-2xl">
                    <p className="text-xs text-gray-500 mb-1">Withdrawable Balance</p>
                    <p className="text-3xl font-black text-gray-900">₹{profile?.wallet?.withdrawable.toFixed(2)}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Amount to Withdraw</label>
                    <div className="flex items-center bg-gray-50 rounded-xl p-1">
                      <button 
                        onClick={() => setWithdrawAmount(Math.max(MIN_WITHDRAWAL_AMOUNT, withdrawAmount - 100))}
                        className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-white hover:text-orange-600 rounded-lg transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="flex-grow text-center">
                        <span className="text-xl font-black text-gray-900">₹{withdrawAmount}</span>
                      </div>
                      <button 
                        onClick={() => setWithdrawAmount(Math.min(profile?.wallet?.withdrawable || 0, withdrawAmount + 100))}
                        className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-white hover:text-orange-600 rounded-lg transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">Minimum withdrawal: ₹{globalSettings?.minWithdrawalAmount || 300}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">UPI ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. rahul@okaxis" 
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                    />
                  </div>

                  <button 
                    onClick={handleWithdrawRequest}
                    disabled={loading || withdrawAmount > (profile?.wallet?.withdrawable || 0)}
                    className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all active:scale-95 disabled:bg-gray-200"
                  >
                    {loading ? 'Processing...' : 'Submit Request'}
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

export default MyCampaignPage;
