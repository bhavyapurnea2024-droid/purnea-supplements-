import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  orderBy, 
  getDoc, 
  getDocs,
  setDoc, 
  increment,
  where,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { TrainerSession, TrainerProfile, UserProfile, TrainerMessage } from '../types';
import { TRAINER_CHAT_DURATION, TRAINER_REFERRAL_COMMISSION, TRAINER_PRICE, TRAINER_DISCOUNTED_PRICE } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Settings, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  BarChart3, 
  ChevronRight, 
  X, 
  Send, 
  FileText, 
  CreditCard,
  TrendingUp,
  Users,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Search,
  Wallet,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const AdminTrainerManager = () => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'profile' | 'analytics'>('sessions');
  const [sessions, setSessions] = useState<TrainerSession[]>([]);
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<TrainerSession | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch sessions
    const unsubSessions = onSnapshot(query(collection(db, 'trainer_sessions'), orderBy('createdAt', 'desc')), (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainerSession)));
      setLoading(false);
    });

    // Fetch trainer profile
    const unsubProfile = onSnapshot(doc(db, 'settings', 'trainer'), (docSnap) => {
      if (docSnap.exists()) {
        setTrainerProfile(docSnap.data() as TrainerProfile);
      }
    });

    return () => {
      unsubSessions();
      unsubProfile();
    };
  }, []);

  const handleActivate = async (session: TrainerSession) => {
    if (!window.confirm('Are you sure you want to verify payment and activate this session?')) return;

    try {
      const now = new Date();
      const expires = new Date(now.getTime() + TRAINER_CHAT_DURATION);

      await updateDoc(doc(db, 'trainer_sessions', session.id), {
        status: 'active',
        paymentVerified: true,
        activatedAt: now.toISOString(),
        expiresAt: expires.toISOString()
      });

      // Handle referral commission if applicable
      if (session.referralUserId) {
        const referrerDoc = doc(db, 'users', session.referralUserId);
        await updateDoc(referrerDoc, {
          'wallet.pending': increment(TRAINER_REFERRAL_COMMISSION),
          'wallet.totalEarned': increment(TRAINER_REFERRAL_COMMISSION)
        });
        
        await logAction(
          'system',
          'system@purneasupps.com',
          'System',
          'TRAINER_REFERRAL_COMMISSION',
          `₹${TRAINER_REFERRAL_COMMISSION} credited to ${session.referralUserId} for trainer purchase by ${session.userId}`,
          'admin'
        );
      }

      toast.success('Session activated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainer_sessions/${session.id}`);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.userPhone?.includes(searchQuery)
  );

  const handleRevoke = async (session: TrainerSession) => {
    if (!window.confirm('Are you sure you want to revoke access? This will end the session immediately.')) return;

    try {
      await updateDoc(doc(db, 'trainer_sessions', session.id), {
        status: 'expired',
        expiresAt: new Date().toISOString()
      });

      await logAction(
        'admin',
        'admin@purneasupps.com',
        'Admin',
        'TRAINER_ACCESS_REVOKED',
        `Access revoked for session ${session.id} (User: ${session.userName})`,
        'admin'
      );

      toast.success('Access revoked successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainer_sessions/${session.id}`);
    }
  };

  const [showGrantModal, setShowGrantModal] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Trainer <span className="text-orange-600">Manager</span></h1>
          <p className="text-gray-500 mt-2">Manage manual trainer sessions, profile, and view analytics.</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowGrantModal(true)}
            className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg shadow-gray-900/10"
          >
            <Zap className="w-4 h-4 text-orange-500" />
            Grant Access
          </button>
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
            {[
              { id: 'sessions', label: 'Sessions', icon: MessageSquare },
              { id: 'profile', label: 'Profile', icon: Settings },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                  activeTab === tab.id ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border-none rounded-2xl shadow-sm focus:ring-2 ring-orange-500/20 font-bold text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredSessions.map(session => (
              <div key={session.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{session.userName}</h3>
                    <p className="text-xs text-gray-500 font-bold">{session.userEmail} • {session.userPhone}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      session.status === 'active' ? "bg-green-100 text-green-700" :
                      session.status === 'pending_payment' ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {session.status.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {session.status === 'pending_payment' && (
                      <button 
                        onClick={() => handleActivate(session)}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                      >
                        Activate
                      </button>
                    )}
                    <button 
                      onClick={() => setSelectedSession(session)}
                      className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                    >
                      Manage
                    </button>
                    {session.status === 'active' && (
                      <button 
                        onClick={() => handleRevoke(session)}
                        className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="max-w-2xl">
          <AdminTrainerProfileEditor initialProfile={trainerProfile} />
        </div>
      )}

      {activeTab === 'analytics' && (
        <AdminTrainerAnalytics sessions={sessions} />
      )}

      <AnimatePresence>
        {selectedSession && (
          <AdminSessionModal 
            session={selectedSession} 
            onClose={() => setSelectedSession(null)} 
          />
        )}
        {showGrantModal && (
          <ManualGrantModal onClose={() => setShowGrantModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const ManualGrantModal = ({ onClose }: { onClose: () => void }) => {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setLoading(true);
    try {
      // 1. Fetch user profile to verify existence
      const userDoc = await getDoc(doc(db, 'users', userId.trim()));
      if (!userDoc.exists()) {
        toast.error('User not found. Please check the User ID.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data() as UserProfile;

      // 2. Check if active session already exists
      const q = query(collection(db, 'trainer_sessions'), where('userId', '==', userId.trim()), where('status', '==', 'active'));
      const existing = await getDocs(q);
      if (!existing.empty) {
        toast.error('User already has an active trainer session');
        setLoading(false);
        return;
      }

      // 3. Create new active session
      const now = new Date();
      const expires = new Date(now.getTime() + TRAINER_CHAT_DURATION);

      await addDoc(collection(db, 'trainer_sessions'), {
        userId: userData.uid,
        userName: userData.displayName || 'User',
        userEmail: userData.email,
        userPhone: userData.phoneNumber || '',
        status: 'active',
        paymentVerified: true,
        formSubmitted: false,
        messages: [],
        activatedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        createdAt: now.toISOString()
      });

      await logAction(
        'admin',
        'admin@purneasupps.com',
        'Admin',
        'TRAINER_ACCESS_GRANTED_MANUALLY',
        `Manual access granted to ${userData.displayName} (${userData.uid})`,
        'admin'
      );

      toast.success('Access granted successfully!');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trainer_sessions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
        className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Manual <span className="text-orange-600">Grant</span></h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleGrant} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">User ID</label>
            <input 
              type="text"
              required
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter User UID"
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-orange-500/20"
            />
            <p className="text-[10px] text-gray-400 italic">You can find the User ID in the Manage Users section.</p>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-orange-500" />}
            Grant Access
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const AdminTrainerProfileEditor = ({ initialProfile }: { initialProfile: TrainerProfile | null }) => {
  const [profile, setProfile] = useState<Partial<TrainerProfile>>(initialProfile || {
    name: '',
    bio: '',
    experience: '',
    photoURL: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'trainer'), {
        ...profile,
        updatedAt: new Date().toISOString()
      });
      toast.success('Trainer profile updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/trainer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-8">Edit Trainer <span className="text-orange-600">Profile</span></h2>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Trainer Name</label>
          <input 
            type="text"
            required
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-orange-500/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Photo URL</label>
          <div className="flex gap-4">
            <input 
              type="text"
              value={profile.photoURL}
              onChange={(e) => setProfile({ ...profile, photoURL: e.target.value })}
              className="flex-grow bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-orange-500/20"
            />
            {profile.photoURL && (
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100">
                <img src={profile.photoURL} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Experience</label>
          <input 
            type="text"
            required
            value={profile.experience}
            onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-orange-500/20"
            placeholder="e.g., 5+ Years Certified Trainer"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Bio</label>
          <textarea 
            required
            rows={4}
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-orange-500/20 resize-none"
          />
        </div>
        <button 
          type="submit"
          disabled={saving}
          className="w-full bg-orange-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
};

const AdminSessionModal = ({ session, onClose }: { session: TrainerSession, onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'form' | 'plans'>('chat');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [plans, setPlans] = useState({ diet: session.dietPlan || '', workout: session.workoutPlan || '' });
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages, activeTab]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const message: TrainerMessage = {
        role: 'admin',
        text: newMessage.trim(),
        timestamp: new Date().toISOString()
      };
      await updateDoc(doc(db, 'trainer_sessions', session.id), {
        messages: [...session.messages, message],
        lastAdminReplyAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainer_sessions/${session.id}`);
    } finally {
      setSending(false);
    }
  };

  const savePlans = async () => {
    try {
      await updateDoc(doc(db, 'trainer_sessions', session.id), {
        dietPlan: plans.diet,
        workoutPlan: plans.workout
      });
      toast.success('Plans updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainer_sessions/${session.id}`);
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
        className="bg-white w-full max-w-5xl h-[90vh] rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{session.userName}</h3>
              <p className="text-sm text-gray-500 font-bold">{session.userEmail} • {session.userPhone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 px-8 bg-white">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'form', label: 'Form Data', icon: FileText },
            { id: 'plans', label: 'Plans', icon: Calendar }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-8 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2",
                activeTab === tab.id ? "border-orange-600 text-orange-600" : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-grow overflow-hidden flex flex-col">
          {activeTab === 'chat' && (
            <div className="flex-grow flex flex-col overflow-hidden">
              <div className="flex-grow overflow-y-auto p-8 space-y-6 bg-gray-50/30 custom-scrollbar">
                {session.messages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex flex-col max-w-[80%]",
                    msg.role === 'admin' ? "ml-auto items-end" : "mr-auto items-start"
                  )}>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm font-medium shadow-sm",
                      msg.role === 'admin' 
                        ? "bg-orange-600 text-white rounded-tr-none" 
                        : "bg-white text-gray-900 border border-gray-100 rounded-tl-none"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-6 bg-white border-t border-gray-100 flex gap-3">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your reply..."
                  className="flex-grow bg-gray-50 border-none rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20"
                />
                <button 
                  onClick={sendMessage}
                  disabled={sending}
                  className="bg-gray-900 text-white p-4 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'form' && (
            <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {!session.formSubmitted ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <FileText className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-black uppercase tracking-widest">Form not submitted yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {Object.entries(session.formData || {}).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{key.replace(/_/g, ' ')}</p>
                      <p className="text-sm font-bold text-gray-900">
                        {Array.isArray(value) ? value.join(', ') : value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Diet Plan</label>
                  <textarea 
                    rows={12}
                    value={plans.diet}
                    onChange={(e) => setPlans({ ...plans, diet: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20 resize-none"
                    placeholder="Enter diet plan details..."
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Workout Plan</label>
                  <textarea 
                    rows={12}
                    value={plans.workout}
                    onChange={(e) => setPlans({ ...plans, workout: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20 resize-none"
                    placeholder="Enter workout plan details..."
                  />
                </div>
              </div>
              <button 
                onClick={savePlans}
                className="w-full bg-orange-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all"
              >
                Save Plans
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const AdminTrainerAnalytics = ({ sessions }: { sessions: TrainerSession[] }) => {
  const verifiedSessions = sessions.filter(s => s.paymentVerified);
  
  // Calculate average response time
  let totalResponseTime = 0;
  let responseCount = 0;
  
  sessions.forEach(session => {
    session.messages.forEach((msg, i) => {
      if (msg.role === 'user' && i + 1 < session.messages.length && session.messages[i+1].role === 'admin') {
        const userTime = new Date(msg.timestamp).getTime();
        const adminTime = new Date(session.messages[i+1].timestamp).getTime();
        totalResponseTime += (adminTime - userTime);
        responseCount++;
      }
    });
  });

  const avgResponseTime = responseCount > 0 
    ? (totalResponseTime / responseCount / (1000 * 60)).toFixed(0) 
    : 'N/A';

  const stats = {
    totalSales: verifiedSessions.length,
    totalRevenue: verifiedSessions.reduce((acc, s) => acc + (s.couponUsed ? TRAINER_DISCOUNTED_PRICE : TRAINER_PRICE), 0),
    activeUsers: sessions.filter(s => s.status === 'active').length,
    expiredChats: sessions.filter(s => s.status === 'expired' || s.status === 'completed').length,
    formSubmissions: sessions.filter(s => s.formSubmitted).length,
    conversionRate: sessions.length > 0 ? (verifiedSessions.length / sessions.length * 100).toFixed(1) : 0,
    avgResponseTime: avgResponseTime === 'N/A' ? 'N/A' : `${avgResponseTime}m`,
    referralEarnings: verifiedSessions.filter(s => s.referralUserId).length * TRAINER_REFERRAL_COMMISSION
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sales', value: stats.totalSales, icon: CreditCard, color: 'text-gray-900' },
          { label: 'Revenue', value: `₹${stats.totalRevenue}`, icon: TrendingUp, color: 'text-green-600' },
          { label: 'Active', value: stats.activeUsers, icon: Users, color: 'text-orange-600' },
          { label: 'Expired', value: stats.expiredChats, icon: Clock, color: 'text-gray-400' },
          { label: 'Forms', value: stats.formSubmissions, icon: FileText, color: 'text-blue-600' },
          { label: 'Conversion', value: `${stats.conversionRate}%`, icon: BarChart3, color: 'text-purple-600' },
          { label: 'Avg Response', value: stats.avgResponseTime, icon: Zap, color: 'text-yellow-600' },
          { label: 'Referral Paid', value: `₹${stats.referralEarnings}`, icon: Wallet, color: 'text-indigo-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 mb-4">
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h4 className={cn("text-xl font-black", stat.color)}>{stat.value}</h4>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {sessions.slice(0, 5).map(session => (
            <div key={session.id} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{session.userName}</p>
                  <p className="text-[10px] text-gray-500">{new Date(session.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                session.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
              )}>
                {session.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminTrainerManager;
