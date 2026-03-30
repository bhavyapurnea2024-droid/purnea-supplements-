export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  isProfileComplete?: boolean;
  role: UserRole;
  couponCode: string;
  commissionRate: number; // Default commission rate for this user
  customCommissionRate?: number; // Override commission rate if set
  isBlocked?: boolean;
  isCouponDisabled?: boolean;
  wallet: {
    pending: number;
    withdrawable: number;
    totalEarned: number;
  };
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
  rating: number;
  numReviews: number;
  commissionRate?: number; // Custom commission rate for this specific product
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  discountAmount: number;
  referralAmount?: number; // Commission amount generated for the referrer
  couponUsed?: string;
  referralUserId?: string;
  status: OrderStatus;
  paymentStatus: 'pending' | 'completed' | 'failed';
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
  status: 'pending' | 'earned' | 'cancelled';
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  upiId?: string;
  bankDetails?: string;
  createdAt: string;
  processedAt?: string;
}
