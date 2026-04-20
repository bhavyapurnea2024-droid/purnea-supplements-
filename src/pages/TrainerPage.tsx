import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  Utensils, 
  MessageSquare, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Star, 
  ChevronRight, 
  Send, 
  Clock, 
  AlertCircle,
  User,
  ShieldCheck,
  Check,
  Loader2,
  MessageCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, orderBy, limit, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { TrainerSession, TrainerMessage, TrainerProfile, UserProfile } from '../types';
import { TRAINER_PRICE, TRAINER_DISCOUNTED_PRICE, WHATSAPP_NUMBER, TRAINER_CHAT_DURATION, ADMIN_REPLY_TIMEOUT } from '../constants';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const REVIEWS = [
  { name: "Rahul Sharma", text: "Bhai sach me mast plan mila 🔥 1 month me visible results!", rating: 5 },
  { name: "Amit Patel", text: "Diet follow karna easy ho gaya, trainer ne simple bana diya 🙌", rating: 5 },
  { name: "Suresh Kumar", text: "Paise vasool hai 💯 recommend karunga sabko", rating: 5 },
  { name: "Vikram Singh", text: "Workout aur diet dono perfect mila, thanks bhai!", rating: 5 },
  { name: "Priya Das", text: "Best decision for my fitness journey. Manual support is great!", rating: 5 },
  { name: "Ankit Verma", text: "Highly professional and effective plans. Worth every rupee.", rating: 5 }
];

const SECTIONS = [
  {
    title: "Section 1: Basic Details",
    questions: [
      { id: 'full_name', type: 'fill', question: 'Full Name', placeholder: 'Enter your full name' },
      { id: 'age_height_weight', type: 'fill', question: 'Age, Height, Weight', placeholder: 'e.g., 22 yrs, 5\'8", 70 kg' },
      { id: 'city_routine', type: 'paragraph', question: 'City & Daily Routine', placeholder: 'Include job/student + activity level' },
    ]
  },
  {
    title: "Section 2: Personal Details",
    questions: [
      { id: 'gender', type: 'radio', question: 'Gender', options: ['Male', 'Female'] },
    ]
  },
  {
    title: "Section 3: Fitness Goal",
    questions: [
      { id: 'primary_goal', type: 'checkbox', question: 'What is your primary goal? (Select one or more)', options: ['Weight Loss', 'Muscle Gain', 'Fat Loss + Lean Body', 'Strength Building', 'General Fitness', 'Body Recomposition'] },
    ]
  },
  {
    title: "Section 4: Workout Background",
    questions: [
      { id: 'workout_experience', type: 'checkbox', question: 'Your workout experience?', options: ['Beginner (0–3 months)', 'Intermediate (3–12 months)', 'Advanced (1+ year)', 'Never worked out'] },
      { id: 'workout_preference', type: 'fill', question: 'Where do you prefer to workout?', placeholder: 'Gym / Home / Both / Other' },
    ]
  },
  {
    title: "Section 5: Health & Lifestyle",
    questions: [
      { id: 'medical_conditions', type: 'checkbox', question: 'Do you have any medical conditions?', options: ['None', 'Thyroid', 'Diabetes', 'PCOS', 'Back Pain', 'Knee Pain', 'Other'] },
      { id: 'medical_description', type: 'fill', question: 'If yes, please describe briefly', placeholder: 'Describe your condition' },
      { id: 'daily_activity', type: 'checkbox', question: 'How active are you daily?', options: ['Sedentary (desk job, low movement)', 'Lightly active', 'Moderately active', 'Very active'] },
    ]
  },
  {
    title: "Section 6: Diet & Eating Habits",
    questions: [
      { id: 'diet_preference', type: 'checkbox', question: 'Your diet preference?', options: ['Vegetarian', 'Eggetarian', 'Non-Vegetarian', 'Vegan'] },
      { id: 'food_allergies', type: 'fill', question: 'Any food allergies or restrictions?', placeholder: 'Describe any allergies' },
    ]
  },
  {
    title: "Section 7: Commitment & Preferences",
    questions: [
      { id: 'training_days', type: 'checkbox', question: 'How many days can you train per week?', options: ['3 days', '4 days', '5 days', '6 days', 'Flexible'] },
      { id: 'extra_notes', type: 'fill', question: 'Anything else you want the trainer to know?', placeholder: 'Optional notes' },
    ]
  }
];

const TrainerPage = () => {
  const { user, profile } = useAuth();
  const [session, setSession] = useState<TrainerSession | null>(null);
  const [trainerProfile, setTrainerProfile] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [newMessage, setNewMessage] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [referralUserId, setReferralUserId] = useState<string | null>(null);
  const [isCouponValid, setIsCouponValid] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch trainer profile
    const unsubProfile = onSnapshot(doc(db, 'settings', 'trainer'), (docSnap) => {
      if (docSnap.exists()) {
        setTrainerProfile(docSnap.data() as TrainerProfile);
      }
    });

    // Fetch user's trainer session
    const q = query(collection(db, 'trainer_sessions'), where('userId', '==', user.uid), limit(1));
    const unsubSession = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setSession({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TrainerSession);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'trainer_sessions');
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubSession();
    };
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const q = query(collection(db, 'users'), where('couponCode', '==', couponCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('Invalid coupon code');
        setReferralUserId(null);
        setIsCouponValid(false);
      } else {
        const couponOwner = querySnapshot.docs[0].data() as UserProfile;
        if (couponOwner.isCouponDisabled) {
          toast.error('This coupon code is currently disabled');
          setReferralUserId(null);
          setIsCouponValid(false);
        } else if (couponOwner.uid === user?.uid) {
          toast.error('You cannot use your own coupon code');
          setReferralUserId(null);
          setIsCouponValid(false);
        } else {
          setReferralUserId(couponOwner.uid);
          setIsCouponValid(true);
          toast.success('Coupon applied! Price reduced to ₹500.');
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'users');
    }
  };

  const handleBuy = async () => {
    if (!user) {
      toast.error('Please login to buy the trainer program');
      return;
    }

    const price = isCouponValid ? TRAINER_DISCOUNTED_PRICE : TRAINER_PRICE;
    const message = `Namaste! I want to buy the Trainer Program.\n\nName: ${user.displayName}\nPhone: ${profile?.phoneNumber || 'N/A'}\nUser ID: ${user.uid}\nPrice: ₹${price}${isCouponValid ? `\nCoupon: ${couponCode.toUpperCase()}` : ''}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
    
    // Create a pending session if it doesn't exist
    if (!session) {
      const sessionData: any = {
        userId: user.uid,
        userName: user.displayName || '',
        userEmail: user.email || '',
        userPhone: profile?.phoneNumber || '',
        status: 'pending_payment',
        paymentVerified: false,
        formSubmitted: false,
        messages: [],
        referralUserId: referralUserId || null,
        couponUsed: isCouponValid ? couponCode.toUpperCase() : null,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'trainer_sessions'), sessionData);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    // Validate all fields (except extra_notes which is optional)
    const allQuestions = SECTIONS.flatMap(s => s.questions);
    const missing = allQuestions.filter(q => {
      if (q.id === 'extra_notes') return false;
      const val = formData[q.id];
      return !val || (Array.isArray(val) && val.length === 0);
    });

    if (missing.length > 0) {
      toast.error('Please answer all mandatory questions');
      return;
    }

    setSubmittingForm(true);
    try {
      await updateDoc(doc(db, 'trainer_sessions', session.id), {
        formData,
        formSubmitted: true,
        messages: [
          {
            role: 'admin',
            text: 'Trainer will review your details. You will receive your workout plan and diet plan within 2 hours.',
            timestamp: new Date().toISOString()
          }
        ]
      });
      toast.success('Form submitted successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainer_sessions/${session.id}`);
    } finally {
      setSubmittingForm(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !session) return;

    const message: TrainerMessage = {
      role: 'user',
      text: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'trainer_sessions', session.id), {
        messages: [...session.messages, message]
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trainer_sessions/${session.id}`);
    }
  };

  const isExpired = session?.expiresAt ? new Date(session.expiresAt).getTime() < Date.now() : false;
  const lastUserMessage = [...(session?.messages || [])].reverse().find(m => m.role === 'user');
  const lastAdminMessage = [...(session?.messages || [])].reverse().find(m => m.role === 'admin');
  const showFallback = lastUserMessage && (!lastAdminMessage || new Date(lastAdminMessage.timestamp) < new Date(lastUserMessage.timestamp)) && 
    (Date.now() - new Date(lastUserMessage.timestamp).getTime() > ADMIN_REPLY_TIMEOUT);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
      </div>
    );
  }

  // 1. Landing Page (Not purchased or pending)
  if (!session || session.status === 'pending_payment') {
    return (
      <div className="space-y-20 pb-20">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-gray-900 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-600/20 via-transparent to-transparent"></div>
          </div>
          <div className="max-w-7xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block px-4 py-1.5 bg-orange-600/10 border border-orange-600/20 rounded-full mb-8"
            >
              <span className="text-xs font-black text-orange-500 uppercase tracking-widest">Personal Coaching</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-8 uppercase"
            >
              Get Your Personal <br /> <span className="text-orange-600">Trainer Now 💪</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 font-medium"
            >
              Stop guessing. Get a custom workout and diet plan designed specifically for your body and goals. Direct 1-on-1 support.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-left">
                    <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Limited Time Offer</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-white tracking-tighter">₹{isCouponValid ? TRAINER_DISCOUNTED_PRICE : TRAINER_PRICE}</span>
                      {!isCouponValid && <span className="text-lg text-gray-500 line-through font-bold">₹599</span>}
                    </div>
                  </div>
                  <div className="bg-orange-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {isCouponValid ? 'Coupon Applied' : `Save ₹${599 - TRAINER_PRICE}`}
                  </div>
                </div>

                <div className="flex gap-2 mb-6">
                  <div className="relative flex-grow">
                    <input 
                      type="text" 
                      placeholder="Coupon Code" 
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:ring-2 ring-orange-500/50 outline-none uppercase text-sm"
                    />
                    {isCouponValid && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={handleApplyCoupon}
                    className="bg-white text-gray-900 px-4 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all text-sm"
                  >
                    Apply
                  </button>
                </div>
                
                <button 
                  onClick={handleBuy}
                  className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  BUY TRAINER PROGRAM <ArrowRight className="w-6 h-6" />
                </button>
                
                <p className="text-gray-500 text-[10px] mt-4 uppercase font-black tracking-widest">Redirects to WhatsApp for manual payment</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Dumbbell, title: "Custom Workout", desc: "Tailored exercises based on your equipment and schedule." },
              { icon: Utensils, title: "Custom Diet", desc: "Indian diet plans that fit your taste and lifestyle." },
              { icon: MessageSquare, title: "1-on-1 Chat", desc: "Direct access to your trainer for any questions." },
              { icon: Zap, title: "Fast Response", desc: "Get your plans within 2 hours of submission." }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">{feature.title}</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Trainer Profile Section */}
        {trainerProfile && (
          <section className="max-w-7xl mx-auto px-4 py-24">
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center">
              <div className="w-full md:w-1/2 h-[400px] md:h-[600px] overflow-hidden">
                <img 
                  src={trainerProfile.photoURL || "https://picsum.photos/seed/trainer/800/1200"} 
                  alt={trainerProfile.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="w-full md:w-1/2 p-12 md:p-20 space-y-8">
                <div>
                  <span className="inline-block px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-4">Meet Your Coach</span>
                  <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tighter mb-4 uppercase leading-none">
                    {trainerProfile.name}
                  </h2>
                  <p className="text-orange-600 font-black uppercase tracking-widest text-sm">{trainerProfile.experience}</p>
                </div>
                <p className="text-gray-500 text-lg leading-relaxed font-medium italic">
                  "{trainerProfile.bio}"
                </p>
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-gray-900">500+</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Clients Helped</span>
                  </div>
                  <div className="w-px h-12 bg-gray-100"></div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-gray-900">4.9/5</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Rating</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <section className="bg-gray-50 py-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 mb-16 text-center">
            <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-4">What Our <span className="text-orange-600">Clients Say</span></h2>
            <p className="text-gray-500 font-bold">Real results from real people.</p>
          </div>
          
          <div className="relative flex overflow-hidden">
            <div className="flex animate-scroll whitespace-nowrap gap-8 py-4">
              {[...REVIEWS, ...REVIEWS].map((review, i) => (
                <div key={i} className="inline-block bg-white p-8 rounded-3xl border border-gray-100 shadow-sm min-w-[350px] whitespace-normal">
                  <div className="flex gap-1 mb-4">
                    {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-orange-500 text-orange-500" />)}
                  </div>
                  <p className="text-gray-900 font-bold text-lg mb-4 italic">"{review.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="font-black text-gray-900 uppercase tracking-tight text-sm">{review.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // 2. Form Submission (Active but form not submitted)
  if (session.status === 'active' && !session.formSubmitted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
          <div className="bg-gray-900 p-10 text-white">
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Complete Your <span className="text-orange-600">Profile</span></h2>
            <p className="text-gray-400 font-medium">Tell us about yourself so we can create your perfect plan.</p>
          </div>
          
          <form onSubmit={handleFormSubmit} className="p-10 space-y-12">
            {SECTIONS.map((section, sIdx) => (
              <div key={sIdx} className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-grow bg-gray-100"></div>
                  <h3 className="text-xs font-black text-orange-600 uppercase tracking-[0.2em] whitespace-nowrap">{section.title}</h3>
                  <div className="h-px flex-grow bg-gray-100"></div>
                </div>

                <div className="space-y-10">
                  {section.questions.map((q) => (
                    <div key={q.id} className="space-y-4">
                      <label className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        {q.question}
                        {q.id !== 'extra_notes' && <span className="text-orange-600">*</span>}
                      </label>
                      
                      {q.type === 'checkbox' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.options?.map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                const current = formData[q.id] || [];
                                const next = current.includes(option) 
                                  ? current.filter((o: string) => o !== option)
                                  : [...current, option];
                                setFormData({ ...formData, [q.id]: next });
                              }}
                              className={cn(
                                "px-4 py-3 rounded-xl text-xs font-bold border-2 transition-all text-left flex items-center justify-between",
                                formData[q.id]?.includes(option)
                                  ? "bg-orange-50 border-orange-600 text-orange-600"
                                  : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                              )}
                            >
                              {option}
                              {formData[q.id]?.includes(option) && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      ) : q.type === 'radio' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.options?.map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setFormData({ ...formData, [q.id]: option })}
                              className={cn(
                                "px-4 py-3 rounded-xl text-xs font-bold border-2 transition-all text-left flex items-center justify-between",
                                formData[q.id] === option
                                  ? "bg-orange-50 border-orange-600 text-orange-600"
                                  : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                              )}
                            >
                              {option}
                              {formData[q.id] === option && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      ) : q.type === 'paragraph' ? (
                        <textarea 
                          rows={3}
                          value={formData[q.id] || ''}
                          onChange={(e) => setFormData({ ...formData, [q.id]: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20 resize-none"
                          placeholder={q.placeholder}
                        />
                      ) : (
                        <input 
                          type="text"
                          value={formData[q.id] || ''}
                          onChange={(e) => setFormData({ ...formData, [q.id]: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20"
                          placeholder={q.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <button 
              type="submit"
              disabled={submittingForm}
              className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submittingForm ? <Loader2 className="w-6 h-6 animate-spin" /> : 'SUBMIT ASSESSMENT'} <ArrowRight className="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Chat Interface (Active and form submitted)
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-120px)] flex flex-col">
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl flex-grow flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white overflow-hidden">
              {trainerProfile?.photoURL ? (
                <img src={trainerProfile.photoURL} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{trainerProfile?.name || 'Personal Trainer'}</h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Always Here to Help</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <div className="flex items-center gap-1 text-orange-600">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">Session Expires:</span>
              </div>
              <span className="text-xs font-bold text-gray-900">
                {session.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-gray-50/30">
          {session.messages.map((msg, i) => (
            <div key={i} className={cn(
              "flex flex-col max-w-[80%]",
              msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}>
              <div className={cn(
                "p-4 rounded-2xl text-sm font-medium shadow-sm",
                msg.role === 'user' 
                  ? "bg-gray-900 text-white rounded-tr-none" 
                  : "bg-white text-gray-900 border border-gray-100 rounded-tl-none"
              )}>
                {msg.text}
              </div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          
          {showFallback && (
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3 max-w-md mx-auto">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-orange-900">Trainer is currently unavailable.</p>
                <p className="text-[10px] text-orange-700 mt-1">Please contact on WhatsApp: <a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="underline font-black">{WHATSAPP_NUMBER}</a></p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-6 bg-white border-t border-gray-100">
          {isExpired ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center text-xs font-black uppercase tracking-widest">
              This session has expired. Please purchase a new session to continue.
            </div>
          ) : (
            <div className="flex gap-3">
              <input 
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-grow bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 ring-orange-500/20"
              />
              <button 
                onClick={sendMessage}
                className="bg-orange-600 text-white p-4 rounded-2xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainerPage;
