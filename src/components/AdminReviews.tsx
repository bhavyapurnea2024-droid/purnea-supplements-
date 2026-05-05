import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, orderBy, getDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Review, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Trash2, Search, ExternalLink, User } from 'lucide-react';
import { toast } from 'sonner';

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reviews');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDeleteReview = async (review: Review) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      // 1. Delete the review
      await deleteDoc(doc(db, 'reviews', review.id));

      // 2. Update product rating
      const productRef = doc(db, 'products', review.productId);
      const productSnap = await getDoc(productRef);
      
      if (productSnap.exists()) {
        const product = productSnap.data() as Product;
        const currentRatingTotal = product.rating * product.numReviews;
        const newNumReviews = Math.max(0, product.numReviews - 1);
        
        let newRating = 5;
        if (newNumReviews > 0) {
          newRating = (currentRatingTotal - review.rating) / newNumReviews;
        }

        await updateDoc(productRef, {
          rating: Math.round(newRating * 10) / 10,
          numReviews: Math.max(0, newNumReviews)
        });
      }

      toast.success('Review deleted successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reviews/${review.id}`);
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.productId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Customer <span className="text-orange-600">Reviews</span></h1>
          <p className="text-gray-500 mt-2">Monitor and manage all product feedback.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search reviews..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 ring-orange-500/20"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Rating</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Comment</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {filteredReviews.map((review) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={review.id} 
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 overflow-hidden">
                          {review.userPhoto ? (
                            <img src={review.userPhoto} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-gray-900">{review.userName}</p>
                          <p className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">ID: {review.userId.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-orange-500 fill-current" />
                        <span className="text-sm font-bold text-gray-900">{review.rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="text-sm text-gray-600 italic line-clamp-2">"{review.comment}"</p>
                      <button 
                        onClick={() => window.open(`/product/${review.productId}`, '_blank')}
                        className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1 flex items-center gap-1 hover:underline"
                      >
                        View Product <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteReview(review)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {!loading && filteredReviews.length === 0 && (
          <div className="p-20 text-center">
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No reviews found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReviews;
