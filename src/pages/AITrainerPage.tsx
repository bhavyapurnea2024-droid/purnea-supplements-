import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db, handleFirestoreError, OperationType, logAction } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, orderBy, limit, increment, getDoc } from 'firebase/firestore';
import { TrainerSession, TrainerMessage } from '../types';
import { AI_TRAINER_PRICE, AI_TRAINER_SESSION_DURATION, WHATSAPP_NUMBER } from '../constants';
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
  MessageCircle
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
  const [isTyping, setIsTyping] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
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
      
      const timeSinceLastUserMessage = lastUserMessage ? now - new Date(lastUserMessage.timestamp).getTime() : 0;
      const timeSinceLastError = currentSession.lastErrorAt ? now - new Date(currentSession.lastErrorAt).getTime() : Infinity;
      const timeSincePlanPending = currentSession.planPendingAt ? now - new Date(currentSession.planPendingAt).getTime() : Infinity;
      const timeSinceExcuse = currentSession.excuseSentAt ? now - new Date(currentSession.excuseSentAt).getTime() : Infinity;

      const sessionRef = doc(db, 'trainer_sessions', currentSession.id);

      // 1. Escalation: If no reply for 2 hours due to API failure
      if (currentSession.lastErrorAt && timeSinceLastError > 2 * 60 * 60 * 1000 && !currentSession.messages.some(m => m.text?.includes(WHATSAPP_NUMBER))) {
        const escalationMessage: TrainerMessage = {
          role: 'model',
          text: `I'm deeply sorry for the delay. It seems I'm having some technical issues with my connection today. Please directly message me on WhatsApp at ${WHATSAPP_NUMBER} so I can help you immediately!`,
          timestamp: new Date().toISOString()
        };
        await updateDoc(sessionRef, { 
          messages: [...currentSession.messages, escalationMessage],
          lastTrainerMessageAt: new Date().toISOString()
        });
        return;
      }

      // 2. Plan delivery: Send plan after 30 mins of being pending
      if (currentSession.isPlanPending && !currentSession.planSent && timeSincePlanPending > 30 * 60 * 1000) {
        const planMessage: TrainerMessage = {
          role: 'model',
          text: `Namaste! Your personalized Indian Diet and Workout plan is ready! \n\n${currentSession.dietPlan}`,
          timestamp: new Date().toISOString()
        };
        await updateDoc(sessionRef, { 
          messages: [...currentSession.messages, planMessage],
          planSent: true,
          isPlanPending: false,
          lastTrainerMessageAt: new Date().toISOString()
        });
        return;
      }

      // 3. Retry AI Response if excuse was sent (check after 15 mins)
      if (currentSession.excuseSentAt && timeSinceExcuse > 15 * 60 * 1000 && !isProcessingRef.current) {
        console.log('Retrying AI response after excuse (15 mins)...');
        // Clear excuseSentAt so we don't keep retrying every minute
        await updateDoc(sessionRef, { excuseSentAt: null });
        getAIResponse(currentSession.messages);
      }

      // 4. Retry AI Response if it failed previously (check every 5 mins)
      if (currentSession.lastErrorAt && timeSinceLastError > 5 * 60 * 1000 && !isProcessingRef.current) {
        console.log('Retrying AI response after error...');
        getAIResponse(currentSession.messages);
      }

      // 5. General Auto-reply for unanswered messages (1 min check)
      if (lastMessage && lastMessage.role === 'user' && !isTyping && !isConnecting && !isProcessingRef.current && timeSinceLastUserMessage > 60000) {
        console.log('Auto-reply check: Last message was from user, triggering reply...');
        getAIResponse(currentSession.messages);
      }
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [session?.id, user?.uid, isTyping, isConnecting]);

  // Track user activity for "offline" logic
  useEffect(() => {
    const updateActivity = async () => {
      if (!session || !user) return;
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      await updateDoc(sessionRef, { lastUserActivityAt: new Date().toISOString() });
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

Current User Profile:
- Goal: ${session?.userProfile?.goal || 'Not specified'}
- Activity: ${session?.userProfile?.activityLevel || 'Not specified'}
- Diet: ${session?.userProfile?.dietType || 'Not specified'}
- Workout Days: ${session?.userProfile?.workoutDays || 'Not specified'}
- Location: ${session?.userProfile?.workoutLocation || 'Not specified'}
- Stats: ${session?.userProfile?.age}y, ${session?.userProfile?.height}cm, ${session?.userProfile?.weight}kg
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
        
        if (now < expiresAt && latestSession.paymentStatus === 'completed') {
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
  }, [session?.messages, isTyping, isConnecting]);

  const handleWalletPayment = async () => {
    if (!user || !profile) return;
    
    if ((profile.wallet?.withdrawable || 0) < AI_TRAINER_PRICE) {
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
        amount: AI_TRAINER_PRICE,
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
        'wallet.withdrawable': increment(-AI_TRAINER_PRICE)
      });

      await logAction(user.uid, user.email || '', user.displayName || '', 'PURCHASE_AI_TRAINER', `Purchased Your Trainer session for ₹${AI_TRAINER_PRICE} (Wallet Payment)`, 'user');
      
      // Send WhatsApp notification for Wallet Payment
      const whatsappMessage = `*New AI Trainer Session (Wallet Pay)!*%0A%0A` +
        `*User ID:* ${user.uid}%0A` +
        `*Customer:* ${profile?.displayName || user.displayName || 'Customer'}%0A` +
        `*Phone:* ${profile?.phoneNumber || 'N/A'}%0A` +
        `*Amount:* ₹${AI_TRAINER_PRICE}%0A%0A` +
        `_Please check the dashboard for the new session._`;

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${whatsappMessage}`;
      window.open(whatsappUrl, '_blank');

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
        amount: AI_TRAINER_PRICE,
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
      await logAction(user.uid, user.email || '', user.displayName || '', 'INITIATE_TRAINER_WHATSAPP_PAYMENT', `Initiated WhatsApp payment for AI Trainer session for ₹${AI_TRAINER_PRICE}`, 'user');

      // 2. Generate WhatsApp message
      const message = `*Personal Trainer Request*%0A%0A` +
        `I want to chat with my personal trainer.%0A%0A` +
        `*User ID:* ${user.uid}%0A` +
        `*Phone:* ${profile?.phoneNumber || 'N/A'}%0A` +
        `*Name:* ${profile?.displayName || user.displayName || 'Customer'}%0A` +
        `*Amount:* ₹${AI_TRAINER_PRICE}`;

      const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${message}`;
      
      // 3. Redirect
      window.open(whatsappUrl, '_blank');
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
    
    isProcessingRef.current = true;
    setIsTyping(true);

    try {
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      
      // 4 API Key Logic - Prioritizing Key 3
      const apiKeys = [
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_4
      ].filter(Boolean) as string[];

      if (apiKeys.length === 0) {
        throw new Error('No Gemini API Keys found.');
      }

      let aiText = "";
      let success = false;

      for (const key of apiKeys) {
        try {
          const ai = new GoogleGenAI({ apiKey: key });
          const model = "gemini-flash-latest";
          
          const chatHistory = messages.filter(m => m.text).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          }));

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
        // API failed - give excuse
        const aiMessage: TrainerMessage = {
          role: 'model',
          text: "I'm just finishing up a client session right now. I'll get back to you with all the details in about 15-20 minutes! Thanks for your patience.",
          timestamp: new Date().toISOString()
        };

        await updateDoc(sessionRef, { 
          messages: [...messages, aiMessage],
          lastErrorAt: new Date().toISOString(),
          excuseSentAt: new Date().toISOString(),
          lastTrainerMessageAt: new Date().toISOString()
        });
        return;
      }

      // Check if AI response is a plan
      const isPlan = aiText.toLowerCase().includes('diet plan') || aiText.toLowerCase().includes('workout plan');
      
      if (isPlan && !session.isPlanPending && !session.planSent) {
        // Intercept plan
        const interceptMessage: TrainerMessage = {
          role: 'model',
          text: "I have all the information I need! I will take around 1-2 hours to design your personalized diet and workout plan. Please check back after an hour, it will be ready for you!",
          timestamp: new Date().toISOString()
        };

        await updateDoc(sessionRef, { 
          messages: [...messages, interceptMessage],
          isPlanPending: true,
          planPendingAt: new Date().toISOString(),
          dietPlan: aiText, // Store the actual plan for later
          lastTrainerMessageAt: new Date().toISOString()
        });
      } else {
        const aiMessage: TrainerMessage = {
          role: 'model',
          text: aiText,
          timestamp: new Date().toISOString()
        };

        await updateDoc(sessionRef, { 
          messages: [...messages, aiMessage],
          lastTrainerMessageAt: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Gemini Error:', error);
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      const aiMessage: TrainerMessage = {
        role: 'model',
        text: "Sorry, I'm just in a meeting with my head trainer right now and the network is a bit patchy. I'll have your answer ready in about 30 minutes!",
        timestamp: new Date().toISOString()
      };
      await updateDoc(sessionRef, { 
        messages: [...messages, aiMessage],
        lastErrorAt: new Date().toISOString(),
        excuseSentAt: new Date().toISOString(),
        lastTrainerMessageAt: new Date().toISOString()
      });
    } finally {
      setIsTyping(false);
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

    // Calculate delay
    const userMessageCount = session.messages.filter(m => m.role === 'user').length;
    const isFirstMessage = userMessageCount === 0;
    
    // Offline check: if last activity was > 5 mins ago
    const now = Date.now();
    const lastActivity = session.lastUserActivityAt ? new Date(session.lastUserActivityAt).getTime() : now;
    const isOffline = now - lastActivity > 5 * 60 * 1000;

    // First message: 4 mins delay (240000ms)
    // Subsequent questions: 1 min delay (60000ms)
    // If offline > 5 mins: 4 mins delay (240000ms)
    let delay = isFirstMessage ? 240000 : 60000;
    if (isOffline) delay = 240000;

    setIsConnecting(true);

    try {
      // Update Firestore with user message immediately
      const sessionRef = doc(db, 'trainer_sessions', session.id);
      await updateDoc(sessionRef, { 
        messages: updatedMessages,
        lastUserMessageAt: new Date().toISOString(),
        lastUserActivityAt: new Date().toISOString()
      });

      // Wait for the specified delay
      await new Promise(resolve => setTimeout(resolve, delay));

      // Get AI Response
      await getAIResponse(updatedMessages);

    } catch (error) {
      console.error('Send Message Error:', error);
      setIsTyping(false);
      setIsConnecting(false);
    }
  };

  const handleFormSubmit = async (formData: any) => {
    if (!session || !user) return;
    
    // Update session with user profile
    const sessionRef = doc(db, 'trainer_sessions', session.id);
    await updateDoc(sessionRef, {
      userProfile: formData
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
- Height: ${formData.height} cm
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
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div>
                      <div className="flex items-center gap-2 text-orange-600 font-black uppercase tracking-widest text-xs mb-2">
                        <Sparkles className="w-4 h-4" /> Limited Time Offer
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-gray-900">₹{AI_TRAINER_PRICE}</span>
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
                        disabled={(profile?.wallet?.withdrawable || 0) < AI_TRAINER_PRICE}
                        className={cn(
                          "flex-1 md:w-48 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                          paymentMethod === 'wallet' ? "border-orange-500 bg-orange-50" : "border-gray-200 bg-white",
                          (profile?.wallet?.withdrawable || 0) < AI_TRAINER_PRICE && "opacity-50 grayscale cursor-not-allowed"
                        )}
                      >
                        <Wallet className="w-6 h-6 text-orange-600" />
                        <span className="font-bold text-xs uppercase tracking-widest">Wallet (₹{profile?.wallet?.withdrawable || 0})</span>
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={paymentMethod === 'whatsapp' ? handleWhatsAppPayment : handleWalletPayment}
                    disabled={(paymentMethod === 'wallet' && (profile?.wallet?.withdrawable || 0) < AI_TRAINER_PRICE)}
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
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-4">Namaste! Payment Successful</h2>
              <p className="text-gray-500 mb-8">{trainerProfile.name} is waiting for you in the chat.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const timeLeft = new Date(session.expiresAt).getTime() - new Date().getTime();
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));

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
                            window.open(whatsappUrl, '_blank');
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
                          disabled={isTyping}
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
          {isConnecting && (
            <div className="flex gap-4 max-w-[85%]">
              <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">A</div>
              <div className="bg-white p-6 rounded-3xl rounded-tl-none border border-gray-100 shadow-sm">
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                    {session.messages.length <= 2 ? "Connecting you to the best trainer..." : "Trainer is typing..."}
                  </p>
                </div>
              </div>
            </div>
          )}
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
                disabled={!inputText.trim() || isTyping || isConnecting}
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
