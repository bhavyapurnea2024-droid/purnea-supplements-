import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { WithdrawalRequest } from '../types';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const AdminWithdrawals = () => {
  const { user: authUser, profile: adminProfile } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc')), (snapshot) => {
      const allWithdrawals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest));
      // Only show requests that are visible (12h delay)
      const visibleWithdrawals = allWithdrawals.filter(w => !w.visibleAt || new Date(w.visibleAt) <= new Date());
      setWithdrawals(visibleWithdrawals);
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
        <div className="overflow-x-auto">
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
    </div>
  );
};

export default AdminWithdrawals;
