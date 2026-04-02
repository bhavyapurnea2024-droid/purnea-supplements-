import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';
import { CATEGORIES } from '../constants';
import { Save, Image as ImageIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

const AdminCategoryImages = () => {
  const { user: adminUser } = useAuth();
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const docRef = doc(db, 'settings', 'category_images');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCategoryImages(docSnap.data() as Record<string, string>);
        } else {
          // Initialize with empty strings for all categories
          const initial: Record<string, string> = {};
          CATEGORIES.forEach(cat => initial[cat] = '');
          setCategoryImages(initial);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings/category_images');
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'category_images'), categoryImages);
      await logAction(adminUser!.uid, adminUser!.email, adminUser!.displayName, 'UPDATE_CATEGORY_IMAGES', 'Updated home page category images', 'admin');
      toast.success('Category images updated successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/category_images');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Category <span className="text-orange-600">Images</span></h1>
        <p className="text-gray-500 mt-2">Customize the photos displayed for each category on the home page.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="space-y-4 p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-gray-900 uppercase tracking-tight">{cat}</h3>
                <ImageIcon className="w-4 h-4 text-gray-400" />
              </div>
              
              <div className="aspect-video rounded-2xl overflow-hidden bg-white border border-gray-200 flex items-center justify-center relative group">
                {categoryImages[cat] ? (
                  <img 
                    src={categoryImages[cat]} 
                    alt={cat} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${cat}/400/225`;
                    }}
                  />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Custom Image</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white text-[10px] font-black uppercase tracking-widest">Preview</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Image URL</label>
                <input 
                  type="text" 
                  value={categoryImages[cat] || ''}
                  onChange={(e) => setCategoryImages({ ...categoryImages, [cat]: e.target.value })}
                  className="w-full bg-white border-none rounded-xl px-4 py-2 text-xs font-medium focus:ring-2 ring-orange-500/20 transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-gray-500">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <p className="text-xs font-medium">If left empty, a default placeholder image will be used.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-64 bg-orange-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:bg-orange-400"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Images
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminCategoryImages;
