import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { User, Phone, Mail, CreditCard, Save, Loader2, ChevronRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'motion/react';

const ProfilePage = () => {
  const { user, profile, loading: authLoading, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: '',
    upiId: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        phoneNumber: profile.phoneNumber || '',
        upiId: profile.upiId || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        upiId: formData.upiId,
      });
      toast.success('Profile updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md w-full">
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <User className="w-12 h-12 text-orange-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter uppercase leading-none">Sign In Required</h2>
          <p className="text-gray-500 mb-10 leading-relaxed">Please sign in to view and manage your profile settings.</p>
          <Link to="/" className="block w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all text-center">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-orange-600">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-bold">My Profile</span>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-orange-600 p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="w-32 h-32 rounded-3xl bg-white/20 backdrop-blur-md border-4 border-white/30 overflow-hidden flex items-center justify-center text-4xl font-black">
                {profile?.displayName?.[0] || user.email?.[0]?.toUpperCase()}
              </div>
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
                    {profile?.displayName || 'User Profile'}
                  </h1>
                  {isAdmin && (
                    <span className="bg-white text-orange-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter">Admin</span>
                  )}
                </div>
                <p className="text-orange-100 font-medium">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                    <input
                      type="text"
                      required
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="Your Name"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-orange-500/20 focus:bg-white focus:ring-0 transition-all font-bold text-gray-900"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                    <input
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-orange-500/20 focus:bg-white focus:ring-0 transition-all font-bold text-gray-900"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address (Locked)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                    <input
                      type="email"
                      disabled
                      value={user.email || ''}
                      className="w-full pl-12 pr-4 py-4 bg-gray-100 border-2 border-transparent rounded-2xl text-gray-400 font-bold cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">UPI ID (For Withdrawals)</label>
                  <div className="relative group">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
                    <input
                      type="text"
                      value={formData.upiId}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      placeholder="e.g. name@okaxis"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-orange-500/20 focus:bg-white focus:ring-0 transition-all font-bold text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-grow bg-orange-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-700 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-orange-600/20"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
                </button>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-800 transition-all"
                  >
                    <ShieldCheck className="w-5 h-5" /> Admin Panel
                  </Link>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/orders" className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2 group-hover:text-orange-600 transition-colors">Order History</h3>
            <p className="text-sm text-gray-500">View and track your previous supplement orders.</p>
          </Link>
          <Link to="/my-campaign" className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2 group-hover:text-orange-600 transition-colors">MyCampaign</h3>
            <p className="text-sm text-gray-500">Manage your referrals and withdrawal earnings.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
