import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { Save, RefreshCw } from 'lucide-react';

const AdminTrainerProfile = () => {
  const { profile: adminProfile } = useAuth();
  const [profile, setProfile] = useState({
    name: 'Personal Trainer',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1000',
    bio: 'Your Personal Fitness Expert specializing in Indian Diet & Workouts.',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'trainer'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProfile({
          name: data.name || 'Personal Trainer',
          image: data.image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1000',
          bio: data.bio || 'Your Personal Fitness Expert specializing in Indian Diet & Workouts.',
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/trainer');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'trainer'), {
        ...profile,
        updatedAt: new Date().toISOString(),
      });
      if (adminProfile) {
        await logAction(adminProfile.uid, adminProfile.email, adminProfile.displayName, 'UPDATE_TRAINER_PROFILE', 'Updated Your Trainer profile', 'admin');
      }
      toast.success('Trainer profile updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/trainer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-12 pb-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Your Trainer <span className="text-orange-600">Profile</span></h1>
        <p className="text-gray-500 mt-2">Customize Your Trainer's public appearance.</p>
      </div>

      <div className="max-w-2xl bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Trainer Name</label>
            <input 
              type="text" 
              value={profile.name}
              onChange={(e) => setProfile({...profile, name: e.target.value})}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
              placeholder="e.g. Personal Trainer"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Profile Image URL</label>
            <div className="flex gap-4">
              <input 
                type="text" 
                value={profile.image}
                onChange={(e) => setProfile({...profile, image: e.target.value})}
                className="flex-grow bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20"
                placeholder="https://..."
              />
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                <img src={profile.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Bio / Description</label>
            <textarea 
              value={profile.bio}
              onChange={(e) => setProfile({...profile, bio: e.target.value})}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 ring-orange-500/20 min-h-[120px]"
              placeholder="Describe the trainer..."
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Profile
        </button>
      </div>
    </div>
  );
};

export default AdminTrainerProfile;
