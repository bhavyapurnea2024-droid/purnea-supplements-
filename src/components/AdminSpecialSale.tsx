import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { Sparkles, Clock, Save, Trash2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface SpecialSale {
  active: boolean;
  title: string;
  subtitle: string;
  discountText: string;
  endTime: string; // ISO string
}

const AdminSpecialSale = () => {
  const { user: adminUser } = useAuth();
  const [sale, setSale] = useState<SpecialSale>({
    active: false,
    title: 'Flash Sale!',
    subtitle: 'Limited time offer on all supplements',
    discountText: 'UP TO 50% OFF',
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const saleDoc = await getDoc(doc(db, 'settings', 'special_sale'));
        if (saleDoc.exists()) {
          setSale(saleDoc.data() as SpecialSale);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings/special_sale');
      } finally {
        setLoading(false);
      }
    };
    fetchSale();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'settings', 'special_sale'), sale);
      await logAction(adminUser!.uid, adminUser!.email, adminUser!.displayName, 'UPDATE_SPECIAL_SALE', `Updated special sale: ${sale.title} (${sale.active ? 'Active' : 'Inactive'})`, 'admin');
      toast.success('Special sale updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'settings/special_sale');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Special <span className="text-orange-600">Sale</span></h1>
        <p className="text-gray-500 mt-2">Manage flash sales and countdown timers for customers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Configuration Form */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Sale Configuration</h2>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={sale.active}
                onChange={(e) => setSale({ ...sale, active: e.target.checked })}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              <span className="ml-3 text-sm font-bold text-gray-900 uppercase tracking-widest">{sale.active ? 'Active' : 'Inactive'}</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sale Title</label>
              <input 
                type="text" 
                value={sale.title}
                onChange={(e) => setSale({ ...sale, title: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 ring-orange-500/20 transition-all"
                placeholder="e.g. Flash Sale!"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Subtitle / Description</label>
              <input 
                type="text" 
                value={sale.subtitle}
                onChange={(e) => setSale({ ...sale, subtitle: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 ring-orange-500/20 transition-all"
                placeholder="e.g. Limited time offer on all supplements"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Discount Text</label>
              <input 
                type="text" 
                value={sale.discountText}
                onChange={(e) => setSale({ ...sale, discountText: e.target.value })}
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 ring-orange-500/20 transition-all"
                placeholder="e.g. UP TO 50% OFF"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sale End Time</label>
              <div className="relative">
                <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="datetime-local" 
                  value={sale.endTime.slice(0, 16)}
                  onChange={(e) => setSale({ ...sale, endTime: new Date(e.target.value).toISOString() })}
                  className="w-full bg-gray-50 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-medium focus:ring-2 ring-orange-500/20 transition-all"
                />
              </div>
              <p className="text-[10px] text-gray-400 font-bold mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> The timer will count down to this time.
              </p>
            </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Live Preview</h2>
          <div className="bg-gray-100 rounded-[2.5rem] p-8 border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[300px]">
            {sale.active ? (
              <div className="w-full bg-orange-600 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Limited Time</span>
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-1">{sale.title}</h3>
                  <p className="text-orange-100 font-medium mb-6">{sale.subtitle}</p>
                  <div className="flex items-center gap-8">
                    <div>
                      <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest mb-1">Discount</p>
                      <p className="text-2xl font-black">{sale.discountText}</p>
                    </div>
                    <div className="h-10 w-px bg-orange-500/50"></div>
                    <div>
                      <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest mb-1">Ends In</p>
                      <div className="flex gap-2 text-xl font-black">
                        <span>00</span>:<span>00</span>:<span>00</span>:<span>00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 font-bold uppercase tracking-widest">No active sale to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSpecialSale;
