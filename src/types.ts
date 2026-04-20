export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  isProfileComplete?: boolean;
  role: UserRole;
  couponCode: string;
  commissionRate: number; // Default commission rate for this user
  customCommissionRate?: number; // Override commission rate if set
  customDiscountRate?: number; // Override discount rate for users using this coupon
  isBlocked?: boolean;
  isCouponDisabled?: boolean;
  allowedCouponCategories?: string[];
  password?: string;
  upiId?: string;
  wallet: {
    pending: number;
    withdrawable: number;
    totalEarned: number;
  };
  createdAt: string;
}

export interface Coupon {
  id: string; // The code itself (unique)
  ownerId: string;
  discountRate: number;
  commissionRate: number;
  allowedCategories: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  brand: string;
  goal: 'muscle-gain' | 'fat-loss' | 'general-health' | 'performance';
  stock: number;
  images: string[];
  flavors?: string[];
  weights?: string[];
  rating: number;
  numReviews: number;
  commissionRate?: number; // Custom commission rate for this specific product
  specialOffer?: string; // Text for special offer badge
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
  flavor?: string;
  weight?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  discountAmount: number;
  referralAmount?: number; // Commission amount generated for the referrer
  couponUsed?: string | null;
  referralUserId?: string | null;
  status: OrderStatus;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentMethod?: 'cashfree' | 'wallet' | 'whatsapp';
  paymentId?: string;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Referral {
  id: string;
  couponOwnerId: string;
  orderId: string;
  amount: number;
  orderTotal?: number;
  customerName?: string;
  status: 'pending' | 'earned' | 'matured' | 'cancelled';
  maturesAt?: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  upiId?: string;
  bankDetails?: string;
  visibleAt?: string;
  createdAt: string;
  processedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'user' | 'admin';
}

export interface TrainerSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  status: 'pending_payment' | 'active' | 'completed' | 'expired';
  paymentVerified: boolean;
  activatedAt?: string;
  expiresAt?: string;
  formSubmitted: boolean;
  formData?: Record<string, string | string[]>;
  messages: TrainerMessage[];
  lastAdminReplyAt?: string;
  dietPlan?: string;
  workoutPlan?: string;
  referralUserId?: string;
  couponUsed?: string;
  createdAt: string;
}

export interface TrainerMessage {
  role: 'user' | 'admin';
  text: string;
  timestamp: string;
}

export interface TrainerProfile {
  name: string;
  bio: string;
  experience: string;
  photoURL?: string;
  updatedAt: string;
}
