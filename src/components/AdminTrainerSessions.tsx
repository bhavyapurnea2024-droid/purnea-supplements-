import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { TrainerSession } from '../types';
import { cn } from '../lib/utils';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminTrainerSessions = () => {
  const [sessions, setSessions] = useState<TrainerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'trainer_sessions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainerSession));
      setSessions(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trainer_sessions');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleConfirmPayment = async (session: TrainerSession) => {
    if (!session.id) return;
    setProcessingId(session.id);
    try {
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      const updates: any = {
        status: 'active',
        paymentStatus: 'completed'
      };

      // If coupon used and not paid yet, transfer 80rs to referral owner
      if (session.referralUserId && !session.referralPaid) {
        const referralOwnerRef = doc(db, 'users', session.referralUserId);
        await updateDoc(referralOwnerRef, {
          'wallet.withdrawable': increment(80),
          'wallet.totalEarned': increment(80)
        });
        await logAction(session.referralUserId, 'N/A', 'N/A', 'TRAINER_REFERRAL_EARNED', `Earned ₹80 from trainer referral (User: ${session.userId})`, 'admin');
        updates.referralPaid = true;
      }

      await updateDoc(sessionRef, updates);
      await logAction('admin', 'admin', 'Admin', 'CONFIRM_TRAINER_SESSION', `Confirmed trainer session ${session.id} for user ${session.userId}`, 'admin');
      toast.success('Session confirmed and referral payout processed!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'trainer_sessions');
      toast.error('Failed to confirm session');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePayReferral = async (session: TrainerSession) => {
    if (!session.id || !session.referralUserId) return;
    setProcessingId(session.id);
    try {
      const referralOwnerRef = doc(db, 'users', session.referralUserId);
      await updateDoc(referralOwnerRef, {
        'wallet.withdrawable': increment(80),
        'wallet.totalEarned': increment(80)
      });
      await logAction(session.referralUserId, 'N/A', 'N/A', 'TRAINER_REFERRAL_EARNED', `Earned ₹80 from trainer referral (User: ${session.userId})`, 'admin');
      
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      await updateDoc(sessionRef, { referralPaid: true });
      
      toast.success('Referral payout processed!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'trainer_sessions');
      toast.error('Failed to process referral payout');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeactivateSession = async (session: TrainerSession) => {
    if (!session.id) return;
    
    setProcessingId(session.id);
    try {
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      await updateDoc(sessionRef, {
        status: 'expired',
        deactivatedAt: new Date().toISOString(),
        deactivatedBy: 'admin'
      });
      await logAction('admin', 'admin', 'Admin', 'DEACTIVATE_TRAINER_SESSION', `Deactivated trainer session ${session.id} for user ${session.userId}`, 'admin');
      toast.success('Session deactivated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'trainer_sessions');
      toast.error('Failed to deactivate session');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Your Trainer <span className="text-orange-600">Sessions</span></h1>
        <p className="text-gray-500 mt-2">Monitor Your Trainer interactions and revenue.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">User ID</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Coupon</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Referral</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Created At</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.map(session => (
                <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{session.userId.slice(0, 8)}...</td>
                  <td className="px-6 py-4 text-sm font-black text-gray-900">₹{session.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {session.couponUsed ? (
                      <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-[10px] font-black uppercase">
                        {session.couponUsed}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit",
                      session.status === 'active' ? "bg-green-100 text-green-700" : 
                      session.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-500"
                    )}>
                      {session.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : 
                       session.status === 'pending' ? <Clock className="w-3 h-3" /> : null}
                      {session.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {session.referralUserId ? (
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        session.referralPaid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      )}>
                        {session.referralPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(session.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {session.status === 'pending' && (
                        <button
                          onClick={() => handleConfirmPayment(session)}
                          disabled={processingId === session.id}
                          className="bg-orange-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all disabled:opacity-50"
                        >
                          {processingId === session.id ? '...' : 'Confirm Pay'}
                        </button>
                      )}
                      {session.status === 'active' && (
                        <button
                          onClick={() => handleDeactivateSession(session)}
                          disabled={processingId === session.id}
                          className="bg-red-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                        >
                          {processingId === session.id ? '...' : 'Deactivate'}
                        </button>
                      )}
                      {session.status === 'active' && session.referralUserId && !session.referralPaid && (
                        <button
                          onClick={() => handlePayReferral(session)}
                          disabled={processingId === session.id}
                          className="bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all disabled:opacity-50"
                        >
                          {processingId === session.id ? '...' : 'Pay Referral'}
                        </button>
                      )}
                    </div>
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

export default AdminTrainerSessions;
