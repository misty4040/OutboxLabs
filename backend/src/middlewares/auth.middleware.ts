import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../utils/jwt';
import { userRepository } from '../repositories/user.repository';
import { sendError } from '../utils/response';

export const COOKIE_NAME = 'reachinbox_token';

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token = req.cookies?.[COOKIE_NAME];

    // Fallback to Bearer token in Authorization header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      sendError(res, 'Invalid or expired session', 401);
      return;
    }

    const user = await userRepository.findById(payload.userId);
    if (!user) {
      sendError(res, 'User no longer exists', 401);
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    sendError(res, 'Authentication failed', 401);
  }
};
