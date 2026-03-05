import { Request, Response, NextFunction } from 'express';

/**
 * Extended Express Request with admin info
 */
export interface AdminRequest extends Request {
  admin?: {
    username: string;
  };
}

/**
 * Hardcoded admin credentials
 * WARNING: This is for development/demo purposes only
 * In production, use proper authentication and role-based access control
 */
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

/**
 * Basic Auth middleware for admin routes
 * Expects Authorization header: Basic <base64(username:password)>
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const adminReq = req as AdminRequest;

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide admin credentials in the Authorization header (Basic Auth)'
      });
      return;
    }

    // Check if it's Basic auth
    if (!authHeader.startsWith('Basic ')) {
      res.status(401).json({
        error: 'Invalid authentication method',
        message: 'Please use Basic Authentication'
      });
      return;
    }

    // Extract and decode credentials
    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    // Verify credentials
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Incorrect username or password'
      });
      return;
    }

    // Attach admin info to request
    adminReq.admin = {
      username: username,
    };

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
