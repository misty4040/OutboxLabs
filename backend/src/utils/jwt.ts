import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
}

const JWT_EXPIRES_IN = '7d';

export const generateSessionToken = (payload: SessionPayload): string => {
  return jwt.sign(payload, env.SESSION_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifySessionToken = (token: string): SessionPayload | null => {
  try {
    const decoded = jwt.verify(token, env.SESSION_SECRET) as SessionPayload;
    return decoded;
  } catch {
    return null;
  }
};
