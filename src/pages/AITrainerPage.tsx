import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, orderBy, limit, increment, getDoc, getDocs } from 'firebase/firestore';
import { TrainerSession, TrainerMessage } from '../types';
import { AI_TRAINER_BASE_PRICE, AI_TRAINER_COUPON_PRICE, AI_TRAINER_SESSION_DURATION, WHATSAPP_NUMBER } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  User, 
  Dumbbell, 
  Utensils, 
  Sparkles,
  Send,
  AlertCircle,
  IndianRupee,
  Copy,
  Wallet,
  MessageCircle,
  Ticket,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

const SelectableGrid = ({ options, value, onChange, label }: { options: string[], value: string, onChange: (val: string) => void, label: string }) => (
  <div className="space-y-3">
    <label className="text-xs font-black uppercase tracking-widest text-gray-400 block">{label}</label>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "px-4 py-3 rounded-xl text-sm font-bold text-left transition-all border-2",
            value === opt 
              ? "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/20" 
              : "bg-gray-50 text-gray-600 border-transparent hover:border-gray-200"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const TrainerForm = ({ onSubmit, isSubmitting }: { onSubmit: (data: any) => void, isSubmitting: boolean }) => {
  const [formData, setFormData] = useState({
    goal: '',
    activityLevel: '',
    dietType: '',
    workoutDays: '',
    workoutLocation: '',
    routine: '',
    gender: '',
    age: '',
    height: '',
    heightFeet: '',
    heightInches: '',
    weight: '',
    sleep: '',
    medical: '',
    language: 'English'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelect = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const isFormValid = Object.values(formData).every(val => val.trim() !== '');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 max-w-2xl mx-auto"
    >
      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-orange-600" /> Complete Your Profile
      </h2>
      
      <div className="space-y-8">
        <SelectableGrid 
          label="What is your primary fitness goal?"
          options={["Fat loss", "Muscle gain", "Maintain weight", "Improve endurance"]}
          value={formData.goal}
          onChange={(val) => handleSelect('goal', val)}
        />

        <SelectableGrid 
          label="What is your current activity level?"
          options={[
            "Sedentary (little to no exercise)",
            "Lightly active (1–3 days/week)",
            "Moderately active (3–5 days/week)",
            "Very active (6–7 days/week)"
          ]}
          value={formData.activityLevel}
          onChange={(val) => handleSelect('activityLevel', val)}
        />

        <SelectableGrid 
          label="What type of diet do you follow?"
          options={["Vegetarian", "Vegan", "Non-vegetarian", "Eggetarian"]}
          value={formData.dietType}
          onChange={(val) => handleSelect('dietType', val)}
        />

        <SelectableGrid 
          label="How many days per week can you work out?"
          options={["1–2 days", "3–4 days", "5–6 days", "Every day"]}
          value={formData.workoutDays}
          onChange={(val) => handleSelect('workoutDays', val)}
        />

        <SelectableGrid 
          label="Where do you prefer to work out?"
          options={["Gym", "Home", "Outdoor (running, sports)", "Mix of all"]}
          value={formData.workoutLocation}
          onChange={(val) => handleSelect('workoutLocation', val)}
        />

        <SelectableGrid 
          label="How would you describe your daily routine?"
          options={[
            "Mostly sitting (desk job/student)",
            "Standing/walking job",
            "Physically demanding job",
            "Mixed activity"
          ]}
          value={formData.routine}
          onChange={(val) => handleSelect('routine', val)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Gender</label>
            <select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 ring-orange-500/20">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Current Age (Years)</label>
            <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="e.g. 25" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 ring-orange-500/20" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Height (cm)</label>
            <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="e.g. 175" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 ring-orange-500/20" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Height (Feet & Inches)</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" name="heightFeet" value={formData.heightFeet} onChange={handleChange} placeholder="Feet" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 ring-orange-500/20" />
              <input type="number" name="heightInches" value={formData.heightInches} onChange={handleChange} placeholder="Inches" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 ring-orange-500/20" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Weight (kg)</label>
            <input type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="e.g. 70" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 ring-orange-500/20" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Sleep (Hours/Night)</label>
            <input type="number" name="sleep" value={formData.sleep} onChange={handleChange} placeholder="e.g. 8" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 ring-orange-500/20" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400">Medical Conditions / Injuries</label>
          <textarea name="medical" value={formData.medical} onChange={handleChange} placeholder="e.g. None, or Lower back pain" className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 ring-orange-500/20 h-24 resize-none" />
        </div>

        <SelectableGrid 
          label="Preferred Communication Language"
          options={["English", "Hindi", "Hinglish"]}
          value={formData.language}
          onChange={(val) => handleSelect('language', val)}
        />

        <button 
          onClick={() => onSubmit(formData)}
          disabled={!isFormValid || isSubmitting}
          className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 shadow-xl shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>Submit Details <Send className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </motion.div>
  );
};

const AITrainerPage = () => {
  const { user, profile } = useAuth();
  const [session, setSession] = useState<TrainerSession | null>(null);
  const [previousSession, setPreviousSession] = useState<TrainerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStep, setPaymentStep] = useState<'landing' | 'processing' | 'success'>('landing');
  const [paymentMethod, setPaymentMethod] = useState<'whatsapp' | 'wallet'>('whatsapp');
  const [inputText, setInputText] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, ownerId: string } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [trainerProfile, setTrainerProfile] = useState({
    name: 'Personal Trainer',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1000',
    bio: 'Your Personal Fitness Expert specializing in Indian Diet & Workouts.',
  });
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!session?.id || !user?.uid) return;

    const interval = setInterval(async () => {
      const now = Date.now();
      // Fetch latest session data to avoid stale closures
      const sessionDoc = await getDoc(doc(db, 'trainer_sessions', session.id));
      if (!sessionDoc.exists()) return;
      const currentSession = sessionDoc.data() as TrainerSession;

      const lastMessage = currentSession.messages[currentSession.messages.length - 1];
      const lastUserMessage = [...currentSession.messages].reverse().find(m => m.role === 'user');
      const lastTrainerMessage = [...currentSession.messages].reverse().find(m => m.role === 'model');
      
      const timeSinceLastUserMessage = lastUserMessage ? now - new Date(lastUserMessage.timestamp).getTime() : 0;
      const timeSinceLastTrainerMessage = lastTrainerMessage ? now - new Date(lastTrainerMessage.timestamp).getTime() : 0;
      const timeSincePlanPending = currentSession.planPendingAt ? now - new Date(currentSession.planPendingAt).getTime() : Infinity;
      const timeSinceLastActivity = currentSession.lastUserActivityAt ? now - new Date(currentSession.lastUserActivityAt).getTime() : Infinity;

      const sessionRef = doc(db, 'trainer_sessions', currentSession.id);

      // 1. Plan generation & delivery: within 5 mins (4.5 mins for human-like timing)
      if (currentSession.isPlanPending && !currentSession.planSent) {
        // If plan not generated yet, generate it
        if (!currentSession.dietPlan && !isProcessingRef.current) {
          generatePlan(currentSession);
          return;
        }

        // If plan generated, wait for 5 mins to send
        if (currentSession.dietPlan && timeSincePlanPending > 4.5 * 60 * 1000) {
          const planMessage: TrainerMessage = {
            role: 'model',
            text: `Namaste! Your personalized Indian Diet and Workout plan is ready! \n\n${currentSession.dietPlan}`,
            timestamp: new Date().toISOString()
          };
          await updateDoc(sessionRef, { 
            messages: [...currentSession.messages, planMessage],
            planSent: true,
            planSentAt: new Date().toISOString(),
            isPlanPending: false,
            isFirstReply: true, // Next interaction will be "first reply" (2 mins)
            lastTrainerMessageAt: new Date().toISOString()
          });
          return;
        }
      }

      // 2. Inactivity Reset: If no messages for > 5 mins
      if (timeSinceLastUserMessage > 5 * 60 * 1000 && timeSinceLastTrainerMessage > 5 * 60 * 1000 && currentSession.isFirstReply === false) {
        await updateDoc(sessionRef, { isFirstReply: true });
        return;
      }

      // 3. AI Response Logic
      if (lastMessage && lastMessage.role === 'user' && !isProcessingRef.current) {
        const isFirst = currentSession.isFirstReply !== false;
        const delay = isFirst ? 2 * 60 * 1000 : 5000;

        if (timeSinceLastUserMessage >= delay) {
          getAIResponse(currentSession.messages);
        }
      }
    }, 5000); // Check every 5 seconds for strict timing

    return () => clearInterval(interval);
  }, [session?.id, user?.uid, isConnecting]);

  const generatePlan = async (currentSession: TrainerSession) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      const apiKeys = [process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];
      if (apiKeys.length === 0) return;

      const ai = new GoogleGenAI({ apiKey: apiKeys[0] });
      const model = "gemini-3-flash-preview";
      
      const prompt = `Based on the user profile, generate a detailed Indian Diet and Workout plan. 
      Format it clearly using Markdown. 
      Only return the plan content, no other text.`;

      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: getTrainerPrompt(trainerProfile.name, previousSession?.dietPlan),
          maxOutputTokens: 2048,
        }
      });

      const planText = response.text || "";
      if (planText) {
        const sessionRef = doc(db, 'trainer_sessions', currentSession.id);
        await updateDoc(sessionRef, { dietPlan: planText });
      }
    } catch (error) {
      console.error('Generate Plan Error:', error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Track user activity for "offline" logic - Throttled to prevent quota exhaustion
  useEffect(() => {
    let lastUpdate = 0;
    const updateActivity = async () => {
      if (!session || !user) return;
      const now = Date.now();
      if (now - lastUpdate < 60000) return; // Only update once per minute
      
      lastUpdate = now;
      try {
        const sessionRef = doc(db, 'trainer_sessions', session.id);
        await updateDoc(sessionRef, { lastUserActivityAt: new Date().toISOString() });
      } catch (e) {
        console.error("Activity update failed:", e);
      }
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
    };
  }, [session?.id, user?.uid]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'trainer'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTrainerProfile({
          name: data.name || 'Personal Trainer',
          image: data.image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1000',
          bio: data.bio || 'Your Personal Fitness Expert specializing in Indian Diet & Workouts.',
        });
      }
    });
    return () => unsub();
  }, []);

  const getTrainerPrompt = (name: string, previousPlan?: string) => `You are "${name}", a professional Indian Fitness & Nutrition Expert. 
Your goal is to provide a highly personalized Indian Diet and Workout plan based on the detailed profile provided by the user.

${previousPlan ? `PREVIOUS PLAN CONTEXT:
The user has a previous plan from a past session:
${previousPlan}

If the user is returning for a follow-up (after 2 weeks), your goal is to:
1. Ask them about the changes they've noticed in their body (weight, energy, strength, etc.).
2. Make SLIGHT adjustments to this previous plan based on their feedback.
3. DO NOT change everything; focus on small tweaks to keep them on track.
` : ''}

CRITICAL GUIDELINES:
1. BE CONCISE. Avoid long introductions or fluff. Get straight to the point.
2. Use Indian foods (Paneer, Dal, Roti, Poha, Idli, etc.) and specify quantities in grams or bowls.
3. For workouts, specify Exercises, Sets, and Reps clearly.
4. If the user asks for a plan, provide a detailed one.
5. Always include relevant product links from Purnea Supps if they help the user's goal:
   - Whey Protein: /product/whey-protein
   - Creatine: /product/creatine
   - Pre-workout: /product/pre-workout
   - Multivitamin: /product/multivitamin
   - Fish Oil: /product/fish-oil
6. Format your response using Markdown.
7. **IMPORTANT**: When you deliver a full diet or workout plan, ALWAYS tell the user that they should follow this plan for 2 weeks and then come back for a slight adjustment to keep their progress optimal.
8. **FOLLOW-UP LOGIC**: If a user mentions they are returning after 2 weeks or that this is a follow-up session:
   - Ask them about the changes they've noticed in their body (weight, energy, strength, etc.).
   - Make SLIGHT adjustments to their current plan based on their feedback.
   - DO NOT change everything; focus on small tweaks to keep them on track.
9. If you are providing options for the user to click, end your message with:
   OPTIONS: ["Option 1", "Option 2", "Option 3"]
10. Keep your responses under 500 words unless generating a full plan.
11. **PERSONALIZATION & EXCLUSIVITY**: 
    - Explicitly state that this diet and workout plan is specially designed ONLY for them and will not work for anyone else.
    - If the user tries to provide different height/weight stats mid-conversation or asks for a plan for someone else (friend, family), politely decline. 
    - Say something like: "I'm sorry, but I can only provide a plan for one person per session as it's highly customized to your specific body metrics. If your friend needs a plan, they should purchase a session from their own account to get accurate results."
    - Vary your phrasing so you don't sound like a bot. Use different ways to say "no" or "this is only for you" to maintain a human-like persona.
12. **HUMAN-LIKE VARIATION**: Do not use the exact same phrases for every user. Change your greetings, closing statements, and how you explain things to look like a real human trainer.

Current User Profile:
- Goal: ${session?.userProfile?.goal || 'Not specified'}
- Activity: ${session?.userProfile?.activityLevel || 'Not specified'}
- Diet: ${session?.userProfile?.dietType || 'Not specified'}
- Workout Days: ${session?.userProfile?.workoutDays || 'Not specified'}
- Location: ${session?.userProfile?.workoutLocation || 'Not specified'}
- Stats: ${session?.userProfile?.age}y, ${session?.userProfile?.height}cm (${session?.userProfile?.heightFeet}'${session?.userProfile?.heightInches}"), ${session?.userProfile?.weight}kg
- Medical: ${session?.userProfile?.medical || 'None'}
- PREFERRED LANGUAGE: ${session?.userProfile?.language || 'English'}

You MUST respond in the PREFERRED LANGUAGE specified above. If the language is "Hinglish", use a mix of Hindi and English written in Latin script.
`;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'trainer_sessions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const allSessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainerSession));
        const latestSession = allSessions[0];
        
        // Check if latest session is still active (within 24h)
        const now = new Date().getTime();
        const expiresAt = new Date(latestSession.expiresAt).getTime();
        
        if (now < expiresAt && latestSession.paymentStatus === 'completed' && latestSession.status === 'active') {
          setSession(latestSession);
          // Previous session is the next one in the list (if it exists)
          if (allSessions.length > 1) {
            setPreviousSession(allSessions[1]);
          }
        } else {
          setSession(null);
          // If no active session, the latest one IS the previous session
          setPreviousSession(latestSession);
        }
      } else {
        setSession(null);
        setPreviousSession(null);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trainer_sessions');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (session?.messages && chatContainerRef.current) {
      const container = chatContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [session?.messages, isConnecting]);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const q = query(collection(db, 'users'), where('couponCode', '==', couponCode.trim().toUpperCase()));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const couponOwner = snapshot.docs[0].data();
        if (couponOwner.isCouponDisabled) {
          toast.error('This coupon code is currently disabled');
          setAppliedCoupon(null);
        } else if (couponOwner.uid === user?.uid) {
          toast.error('You cannot use your own coupon code');
          setAppliedCoupon(null);
        } else {
          setAppliedCoupon({
            code: couponCode.trim().toUpperCase(),
            ownerId: snapshot.docs[0].id
          });
          toast.success('Coupon applied successfully!');
        }
      } else {
        toast.error('Invalid coupon code');
        setAppliedCoupon(null);
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast.error('Failed to validate coupon');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const currentPrice = appliedCoupon ? AI_TRAINER_COUPON_PRICE : AI_TRAINER_BASE_PRICE;

  const handleWalletPayment = async () => {
    if (!user || !profile) return;
    
    if ((profile.wallet?.withdrawable || 0) < currentPrice) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setPaymentStep('processing');
    
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + AI_TRAINER_SESSION_DURATION);

      const initialMessage = previousSession 
        ? `Namaste ${profile?.displayName || 'Friend'}! Welcome back! I see we worked together on a plan previously. I'm excited to help you with your 2-week follow-up and make the necessary adjustments to your plan. \n\nPlease fill out the form below with your current stats so I can see your progress and update your plan!`
        : `Namaste ${profile?.displayName || 'Friend'}! I am ${trainerProfile.name}. I'm honored to help you on your fitness journey. To create the perfect Indian diet and workout plan for you, I need to understand you better. \n\nPlease fill out the form below so I can get started on your transformation!`;

      const sessionData: Omit<TrainerSession, 'id'> = {
        userId: user.uid,
        status: 'active',
        paymentStatus: 'completed',
        amount: currentPrice,
        couponUsed: appliedCoupon?.code || null,
        referralUserId: appliedCoupon?.ownerId || null,
        messages: [
          {
            role: 'model',
            text: initialMessage,
            timestamp: new Date().toISOString()
          }
        ],
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      const docRef = await addDoc(collection(db, 'trainer_sessions'), sessionData);
      
      // Deduct from wallet
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'wallet.withdrawable': increment(-currentPrice)
      });

      await logAction(user.uid, user.email || '', user.displayName || '', 'PURCHASE_AI_TRAINER', `Purchased Your Trainer session for ₹${currentPrice} (Wallet Payment)`, 'user');
      
      // Send WhatsApp notification for Wallet Payment
      const whatsappMessage = `*New AI Trainer Session (Wallet Pay)!*%0A%0A` +
        `*User ID:* ${user.uid}%0A` +
        `*Customer:* ${profile?.displayName || user.displayName || 'Customer'}%0A` +
        `*Phone:* ${profile?.phoneNumber || 'N/A'}%0A` +
        `*Amount:* ₹${currentPrice}%0A` +
        `${appliedCoupon ? `*Coupon Used:* ${appliedCoupon.code}%0A` : ''}` +
        `%0A_Please check the dashboard for the new session._`;

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${whatsappMessage}`;
      
      // Use window.location.href for more reliable redirect in iframes/mobile
      try {
        window.location.href = whatsappUrl;
      } catch (e) {
        window.open(whatsappUrl, '_blank');
      }

      setPaymentStep('success');
      toast.success('Payment Successful via Wallet! Your Trainer is ready.');
      
      setTimeout(() => {
        setPaymentStep('landing');
      }, 1500);
    } catch (error) {
      setPaymentStep('landing');
      handleFirestoreError(error, OperationType.CREATE, 'trainer_sessions');
    }
  };

  const handleWhatsAppPayment = async () => {
    if (!user) return;
    setPaymentStep('processing');
    
    const orderId = `trainer_${Date.now()}`;

    try {
      // 1. Save a pending session request in Firestore
      const now = new Date();
      const expiresAt = new Date(now.getTime() + AI_TRAINER_SESSION_DURATION);

      const initialMessage = previousSession 
        ? `Namaste ${profile?.displayName || 'Friend'}! Welcome back! I see we worked together on a plan previously. I'm excited to help you with your 2-week follow-up and make the necessary adjustments to your plan. \n\nPlease fill out the form below with your current stats so I can see your progress and update your plan!`
        : `Namaste ${profile?.displayName || 'Friend'}! I am ${trainerProfile.name}. I'm honored to help you on your fitness journey. To create the perfect Indian diet and workout plan for you, I need to understand you better. \n\nPlease fill out the form below so I can get started on your transformation!`;

      const sessionData: any = {
        userId: user.uid,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'whatsapp',
        amount: currentPrice,
        couponUsed: appliedCoupon?.code || null,
        referralUserId: appliedCoupon?.ownerId || null,
        paymentId: orderId,
        messages: [
          {
            role: 'model',
            text: initialMessage,
            timestamp: new Date().toISOString()
          }
        ],
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      await addDoc(collection(db, 'trainer_sessions'), sessionData);
      await logAction(user.uid, user.email || '', user.displayName || '', 'INITIATE_TRAINER_WHATSAPP_PAYMENT', `Initiated WhatsApp payment for AI Trainer session for ₹${currentPrice}`, 'user');

      // 2. Generate WhatsApp message
      const message = `*AI Trainer Request*%0A%0A` +
        `*Request ID:* ${orderId}%0A` +
        `*Name:* ${profile?.displayName || user.displayName || 'Customer'}%0A` +
        `*Phone:* ${profile?.phoneNumber || 'N/A'}%0A` +
        `*Email:* ${user.email || 'N/A'}%0A` +
        `*Amount:* ₹${currentPrice}%0A` +
        `${appliedCoupon ? `*Coupon Used:* ${appliedCoupon.code}%0A` : ''}` +
        `%0A_I want to start my transformation with ${trainerProfile.name}. Please approve my payment._`;

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${message}`;
      
      // 3. Redirect
      try {
        window.location.href = whatsappUrl;
      } catch (e) {
        window.open(whatsappUrl, '_blank');
      }
      
      setPaymentStep('success');
      toast.success("Request sent! Redirecting to WhatsApp...");
    } catch (error) {
      console.error("Payment Error:", error);
      toast.error("Payment initiation failed.");
      setPaymentStep('landing');
    }
  };

  const getAIResponse = async (messages: TrainerMessage[]) => {
    if (!session || !user || isProcessingRef.current) return;
    
    // Check if AI is enabled for this session
    if (session.isAiEnabled === false) {
      return;
    }
    
    isProcessingRef.current = true;

    try {
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      
      const apiKeys = [
        process.env.GEMINI_API_KEY_3
      ].filter(Boolean) as string[];

      if (apiKeys.length === 0) {
        throw new Error('No Gemini API Keys found.');
      }

      let aiText = "";
      let success = false;

      // Filter out fallback messages from chat history
      const fallbackTexts = [
        "The trainer will reply shortly. It usually takes 5–10 minutes.",
        "I'll be back within 30 mins"
      ];

      const chatHistory = messages
        .filter(m => m.text && !fallbackTexts.some(fallback => m.text.includes(fallback)))
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      for (const key of apiKeys) {
        try {
          const ai = new GoogleGenAI({ apiKey: key });
          const model = "gemini-3-flash-preview";
          
          const response = await ai.models.generateContent({
            model,
            contents: chatHistory,
            config: {
              systemInstruction: getTrainerPrompt(trainerProfile.name, previousSession?.dietPlan),
              maxOutputTokens: 2048,
            }
          });

          aiText = response.text || "";
          if (aiText) {
            success = true;
            break;
          }
        } catch (err) {
          console.error(`API Key failed:`, err);
          continue; // Try next key
        }
      }

      if (!success) {
        // API failed - send fallback message
        const hasFallback = messages.some(m => m.text.includes("The trainer will reply shortly"));
        
        if (!hasFallback) {
          const fallbackMessage: TrainerMessage = {
            role: 'model',
            text: "The trainer will reply shortly. It usually takes 5–10 minutes.",
            timestamp: new Date().toISOString()
          };

          await updateDoc(sessionRef, { 
            messages: [...messages, fallbackMessage],
            lastErrorAt: new Date().toISOString(),
            lastTrainerMessageAt: new Date().toISOString()
          });
          
          // Also log for admin monitoring
          await logAction(user.uid, user.email || '', user.displayName || '', 'TRAINER_API_FAILURE', 'AI Trainer API failed, sent fallback message to client', 'admin');
        } else {
          await updateDoc(sessionRef, { 
            lastErrorAt: new Date().toISOString()
          });
        }
        return;
      }

      // Success! Clear error states
      await updateDoc(sessionRef, {
        lastErrorAt: null,
        excuseSentAt: null,
        isFirstReply: false // Set to false after successful reply
      });

      const aiMessage: TrainerMessage = {
        role: 'model',
        text: aiText,
        timestamp: new Date().toISOString()
      };

      await updateDoc(sessionRef, { 
        messages: [...messages, aiMessage],
        lastTrainerMessageAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Gemini Error:', error);
    } finally {
      setIsConnecting(false);
      isProcessingRef.current = false;
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim() || !session || !user || isProcessingRef.current) return;

    const userMessage: TrainerMessage = {
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...session.messages, userMessage];
    if (!textOverride) setInputText('');

    setIsConnecting(true);

    try {
      // Update Firestore with user message immediately
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      await updateDoc(sessionRef, { 
        messages: updatedMessages,
        lastUserMessageAt: new Date().toISOString(),
        lastUserActivityAt: new Date().toISOString()
      });

      // The useEffect interval will handle the AI response timing (2min or 5sec)
      setIsConnecting(false);

    } catch (error) {
      console.error('Send Message Error:', error);
      setIsConnecting(false);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    if (!session || !user) return;
    
    // Update session with user profile and set plan pending
    const sessionRef = doc(db, 'trainer_sessions', session.id);
    await updateDoc(sessionRef, {
      userProfile: formData,
      isPlanPending: true,
      planPendingAt: new Date().toISOString()
    });

    const formattedAnswers = `
FITNESS PROFILE:
- Goal: ${formData.goal}
- Activity Level: ${formData.activityLevel}
- Diet Type: ${formData.dietType}
- Workout Days: ${formData.workoutDays}
- Location: ${formData.workoutLocation}
- Routine: ${formData.routine}
- Gender: ${formData.gender}
- Age: ${formData.age} years
- Height: ${formData.height} cm (${formData.heightFeet}'${formData.heightInches}")
- Weight: ${formData.weight} kg
- Sleep: ${formData.sleep} hours
- Medical: ${formData.medical}
- Preferred Language: ${formData.language}
    `.trim();

    await sendMessage(formattedAnswers);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4">
          {paymentStep === 'landing' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100"
            >
              <div className="relative h-80">
                <img 
                  src={trainerProfile.image} 
                  alt={trainerProfile.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-end p-12">
                  <div className="mt-auto">
                    <span className="bg-orange-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">Premium Service</span>
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none mb-4">Meet <span className="text-orange-500">{trainerProfile.name}</span></h1>
                    <p className="text-gray-200 text-lg font-medium max-w-xl">{trainerProfile.bio}</p>
                  </div>
                </div>
              </div>

              <div className="p-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
                      <Utensils className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">Indian Diet Plan</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Customized meal plans featuring Ghar ka Khana, optimized for your fitness goals.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Dumbbell className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">Personalized Workout</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Training routines designed for your body type, equipment access, and schedule.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">24h Expert Access</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Talk to {trainerProfile.name} anytime for 24 hours to refine and adjust your plans instantly.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">2-Week Updates</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">We optimize your plan every 2 weeks based on your body's response for consistent results.</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-3xl p-8 flex flex-col gap-8">
                  {/* Coupon Section */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 mb-4">
                      <Ticket className="w-4 h-4" /> Have a coupon code?
                    </div>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-100 px-4 py-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-bold text-green-700">Coupon "{appliedCoupon.code}" Applied!</span>
                        </div>
                        <button 
                          onClick={() => setAppliedCoupon(null)}
                          className="p-1 hover:bg-green-100 rounded-lg text-green-600 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="ENTER CODE"
                          className="flex-grow bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-orange-500/20 uppercase"
                        />
                        <button 
                          onClick={validateCoupon}
                          disabled={!couponCode.trim() || isValidatingCoupon}
                          className="bg-gray-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50"
                        >
                          {isValidatingCoupon ? '...' : 'Apply'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                      <div className="flex items-center gap-2 text-orange-600 font-black uppercase tracking-widest text-xs mb-2">
                        <Sparkles className="w-4 h-4" /> Limited Time Offer
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-gray-900">₹{currentPrice}</span>
                        <span className="text-gray-400 line-through font-bold">₹999</span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium mt-1">Get your personalized plan in minutes.</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                      <button 
                        onClick={() => setPaymentMethod('whatsapp')}
                        className={cn(
                          "flex-1 md:w-48 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                          paymentMethod === 'whatsapp' ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white"
                        )}
                      >
                        <MessageCircle className="w-6 h-6 text-green-600" />
                        <span className="font-bold text-xs uppercase tracking-widest">WhatsApp</span>
                      </button>
                      <button 
                        onClick={() => setPaymentMethod('wallet')}
                        disabled={(profile?.wallet?.withdrawable || 0) < currentPrice}
                        className={cn(
                          "flex-1 md:w-48 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                          paymentMethod === 'wallet' ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white",
                          (profile?.wallet?.withdrawable || 0) < currentPrice && "opacity-50 grayscale cursor-not-allowed"
                        )}
                      >
                        <Wallet className="w-6 h-6 text-orange-600" />
                        <span className="font-bold text-xs uppercase tracking-widest">Wallet (₹{profile?.wallet?.withdrawable || 0})</span>
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={paymentMethod === 'whatsapp' ? handleWhatsAppPayment : handleWalletPayment}
                    disabled={(paymentMethod === 'wallet' && (profile?.wallet?.withdrawable || 0) < currentPrice)}
                    className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-orange-700 shadow-2xl shadow-orange-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    Start My Transformation <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : paymentStep === 'processing' ? (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-8"></div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4">Processing Payment</h2>
              <p className="text-gray-500 max-w-sm">Please do not refresh. We are connecting you with {trainerProfile.name}...</p>
            </div>
          ) : (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4">
                {paymentMethod === 'whatsapp' ? 'Request Sent!' : 'Namaste! Payment Successful'}
              </h2>
              <p className="text-gray-500 mb-8">
                {paymentMethod === 'whatsapp' 
                  ? "We've received your request. Please complete the payment on WhatsApp to start your transformation."
                  : `${trainerProfile.name} is waiting for you in the chat.`}
              </p>
              
              {paymentMethod === 'whatsapp' && (
                <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                  <a 
                    href={`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(`Hi, I just initiated a payment for AI Trainer session. My User ID is ${user?.uid}. Please approve my access.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-green-500 text-white py-4 rounded-2xl font-bold text-sm hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Chat on WhatsApp
                  </a>
                  <button 
                    onClick={() => setPaymentStep('landing')}
                    className="text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-all"
                  >
                    Go Back
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const timeLeft = new Date(session.expiresAt).getTime() - new Date().getTime();
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));

  const userMessageCount = session.messages.filter(m => m.role === 'user').length;
  const isFirstMessage = userMessageCount === 0;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      {/* 24h Warning Banner */}
      <div className="bg-orange-600 text-white py-2.5 px-4 text-center text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
        <AlertCircle className="w-3.5 h-3.5" />
        Important: Your session with {trainerProfile.name} is valid for exactly 24 hours after payment.
      </div>

      {/* Chat Header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xl overflow-hidden">
                <img 
                  src={trainerProfile.image} 
                  alt={trainerProfile.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <h2 className="font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{trainerProfile.name}</h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <Clock className="w-3 h-3" /> {hoursLeft}h {minutesLeft}m access remaining
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" /> Verified Expert
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto p-4 sm:p-8 scroll-smooth"
      >
        <div className="max-w-4xl mx-auto space-y-8">
          {session.messages.length === 1 && session.messages[0]?.role === 'model' && (
            <TrainerForm onSubmit={handleFormSubmit} isSubmitting={isConnecting} />
          )}

          {session.messages.map((msg, i) => {
            if (!msg.text) return null;
            
            // Skip the first message if we are showing the form, or show it above the form
            // Actually, let's show the first message then the form
            const optionsMatch = msg.text.match(/OPTIONS:\s*(\[.*\])/);
            const options = optionsMatch ? JSON.parse(optionsMatch[1]) : null;
            const cleanText = msg.text.replace(/OPTIONS:\s*\[.*\]/, '').trim();
            const isPlan = msg.text.toLowerCase().includes('diet plan') || msg.text.toLowerCase().includes('workout plan');
            
            // Check if this is an escalation message with WhatsApp link
            const isEscalation = msg.text.includes(WHATSAPP_NUMBER);

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className={cn(
                  "flex gap-4 max-w-[90%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-xs",
                  msg.role === 'user' ? "bg-gray-900 text-white" : "bg-orange-100 text-orange-600"
                )}>
                  {msg.role === 'user' ? profile?.displayName?.charAt(0) || 'U' : 'A'}
                </div>
                <div className="flex flex-col gap-2 flex-grow">
                  <div className={cn(
                    "p-6 rounded-3xl shadow-sm relative group",
                    msg.role === 'user' ? "bg-gray-900 text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                  )}>
                    {isPlan && (
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(cleanText);
                            toast.success('Plan copied to clipboard!');
                          }}
                          className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-all"
                          title="Copy Plan"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest animate-pulse">
                          Copy now! Vanishes in 24h
                        </div>
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none prose-headings:text-inherit prose-p:text-inherit prose-strong:text-inherit prose-ul:text-inherit">
                      <Markdown>{cleanText}</Markdown>
                    </div>
                    
                    {isEscalation && (
                      <div className="mt-6">
                        <button 
                          onClick={() => {
                            const details = session.messages.find(m => m.role === 'user')?.text || 'No details provided';
                            const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodeURIComponent(`*Personal Trainer Escalation*%0A%0A${details}`)}`;
                            try {
                              window.location.href = whatsappUrl;
                            } catch (e) {
                              window.open(whatsappUrl, '_blank');
                            }
                          }}
                          className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-5 h-5" /> Connect via WhatsApp
                        </button>
                      </div>
                    )}

                    <p className={cn(
                      "text-[10px] mt-4 font-bold uppercase tracking-widest opacity-40",
                      msg.role === 'user' ? "text-right" : ""
                    )}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  
                  {options && msg.role === 'model' && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {options.map((opt: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage(opt)}
                          className="bg-orange-50 hover:bg-orange-100 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold border border-orange-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="bg-white border-t border-gray-100 p-4 sm:p-8 sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          {session.messages.length > 1 && (
            <div className="relative flex items-center gap-4">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={`Type your message to ${trainerProfile.name}...`}
                className="flex-grow bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 ring-orange-500/20 transition-all"
              />
              <button 
                onClick={() => sendMessage()}
                disabled={!inputText.trim() || isConnecting}
                className="bg-orange-600 text-white p-4 rounded-2xl hover:bg-orange-700 transition-all active:scale-95 disabled:bg-gray-200 disabled:scale-100"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
          <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-4">
            {trainerProfile.name} will help you with Indian Diet & Workout Plans
          </p>
        </div>
      </div>
    </div>
  );
};

export default AITrainerPage;
