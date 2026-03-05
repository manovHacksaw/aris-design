/**
 * Authentication request with signature
 */
export interface AuthRequest {
  address: string;
  signature: string;
  message: string;
  nonce: string;
}

/**
 * Authentication response
 */
export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    username?: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    bio?: string | null;
    walletAddress: string | null;
    preferredBrands: string[];
    preferredCategories: string[];
    isOnboarded: boolean;
    xp: number;
    level: number;
    socialLinks?: any;
    lastLoginAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    emailVerified: boolean;
    phoneNumber?: string | null;
    phoneVerified: boolean;
    role?: string;
  };
  message?: string;
}

/**
 * Nonce response
 */
export interface NonceResponse {
  nonce: string;
  message: string;
}

