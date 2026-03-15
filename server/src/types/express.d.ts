import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        address: string;
        sessionId?: string;
        role?: UserRole;
        walletAddress?: string;
        privyId?: string;
      };
    }
  }
}

export { };
