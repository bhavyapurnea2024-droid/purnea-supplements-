import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { TrainerSession } from '../types';
import { cn } from '../lib/utils';

const AdminTrainerSessions = () => {
  const [sessions, setSessions] = useState<TrainerSession[]>([]);
  const [loading, setLoading] = useState(true);

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
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Messages</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Created At</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Expires At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.map(session => (
                <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{session.userId.slice(0, 8)}...</td>
                  <td className="px-6 py-4 text-sm font-black text-gray-900">₹{session.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{session.messages.length}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      session.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {session.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(session.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(session.expiresAt).toLocaleString()}</td>
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
