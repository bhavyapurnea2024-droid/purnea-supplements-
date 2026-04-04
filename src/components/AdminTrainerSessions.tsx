import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { TrainerSession, TrainerMessage } from '../types';
import { cn } from '../lib/utils';
import { CheckCircle2, Clock, AlertCircle, MessageSquare, X, Send, Bot, User, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';

const AdminTrainerSessions = () => {
  const [sessions, setSessions] = useState<TrainerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrainerSession | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'trainer_sessions'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainerSession));
      setSessions(docs);
      
      // Update selected session if it's open
      if (selectedSession) {
        const updated = docs.find(s => s.id === selectedSession.id);
        if (updated) setSelectedSession(updated);
      }
      
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trainer_sessions');
      setLoading(false);
    });
    return () => unsub();
  }, [selectedSession?.id]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedSession?.messages]);

  const handleConfirmPayment = async (session: TrainerSession) => {
    if (!session.id) return;
    setProcessingId(session.id);
    try {
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      const updates: any = {
        status: 'active',
        paymentStatus: 'completed',
        isAiEnabled: true // Enable AI by default on confirmation
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

  const handleToggleAi = async (session: TrainerSession) => {
    if (!session.id) return;
    const newState = session.isAiEnabled === false; // Default to true if undefined
    try {
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      await updateDoc(sessionRef, { isAiEnabled: newState });
      toast.success(`AI Replies ${newState ? 'Enabled' : 'Disabled'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'trainer_sessions');
      toast.error('Failed to toggle AI');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSession || !adminMessage.trim()) return;
    
    const newMessage: TrainerMessage = {
      role: 'model',
      text: adminMessage.trim(),
      timestamp: new Date().toISOString()
    };

    try {
      const sessionRef = doc(db, 'trainer_sessions', selectedSession.id);
      await updateDoc(sessionRef, {
        messages: arrayUnion(newMessage),
        lastTrainerMessageAt: new Date().toISOString()
      });
      setAdminMessage('');
      toast.success('Message sent as Trainer');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'trainer_sessions');
      toast.error('Failed to send message');
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
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">AI Status</th>
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
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleAi(session)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                        session.isAiEnabled !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}
                    >
                      {session.isAiEnabled !== false ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                      {session.isAiEnabled !== false ? 'AI ON' : 'AI OFF'}
                    </button>
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
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="bg-gray-100 text-gray-700 p-2 rounded-xl hover:bg-gray-200 transition-all"
                        title="View Chat"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chat Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl border border-white/20">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 uppercase tracking-tight">Chat with Client</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">User: {selectedSession.userId.slice(0, 8)}...</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSession(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
              {selectedSession.messages.map((msg, idx) => (
                <div key={idx} className={cn(
                  "flex flex-col max-w-[80%]",
                  msg.role === 'user' ? "mr-auto" : "ml-auto items-end"
                )}>
                  <div className={cn(
                    "flex items-center gap-2 mb-1",
                    msg.role === 'user' ? "flex-row" : "flex-row-reverse"
                  )}>
                    {msg.role === 'user' ? (
                      <User className="w-3 h-3 text-gray-400" />
                    ) : (
                      <Bot className="w-3 h-3 text-orange-600" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {msg.role === 'user' ? 'Client' : 'Trainer'}
                    </span>
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm",
                    msg.role === 'user' 
                      ? "bg-white text-gray-900 border border-gray-100 rounded-tl-none" 
                      : "bg-orange-600 text-white rounded-tr-none"
                  )}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-gray-400 mt-1 font-bold">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-white border-t border-gray-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Reply as the Trainer..."
                  className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-orange-600/20 transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!adminMessage.trim()}
                  className="bg-orange-600 text-white p-4 rounded-2xl hover:bg-orange-700 transition-all disabled:opacity-50 shadow-lg shadow-orange-600/20"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-widest text-center">
                Your message will appear as coming from the AI Trainer
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTrainerSessions;
