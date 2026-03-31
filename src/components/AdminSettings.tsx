import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { cn } from '../lib/utils';

const AdminSettings = () => {
  const { profile: adminProfile } = useAuth();
  const [settings, setSettings] = useState({
    defaultCommission: 10,
    defaultDiscount: 10,
    minWithdrawal: 500,
    whatsappAlerts: true,
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSettings({
          defaultCommission: (data.defaultCommissionRate || 0.1) * 100,
          defaultDiscount: (data.defaultDiscountRate || 0.1) * 100,
          minWithdrawal: data.minWithdrawalAmount || 500,
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
        defaultDiscountRate: settings.defaultDiscount / 100,
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
            <label className="block text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Default Coupon Discount (%)</label>
            <input 
              type="number" 
              value={settings.defaultDiscount}
              onChange={(e) => setSettings({...settings, defaultDiscount: Number(e.target.value)})}
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

export default AdminSettings;
