import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export class GoogleAuthService {
  private client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_CALLBACK_URL
    );
  }

  /**
   * Generates Google OAuth authorization URL
   */
  getAuthUrl(customCallbackUrl?: string, state?: string): string {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID is not configured in environment variables');
    }

    const redirectUri = customCallbackUrl || env.GOOGLE_CALLBACK_URL;

    const client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'profile', 'email'],
      prompt: 'consent',
      state,
    });
  }

  /**
   * Exchanges an authorization code for tokens and extracts user profile
   */
  async getUserProfileFromCode(code: string, customCallbackUrl?: string): Promise<GoogleUserProfile> {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured in environment');
    }

    const redirectUri = customCallbackUrl || env.GOOGLE_CALLBACK_URL;

    const client = new OAuth2Client(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    if (!tokens.id_token) {
      throw new Error('No ID token returned by Google');
    }

    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new Error('Invalid user payload received from Google');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture || null,
    };
  }

  /**
   * Directly verifies a Google ID Token (e.g. from Google One-Tap or Google Sign-In button)
   */
  async verifyIdToken(idToken: string): Promise<GoogleUserProfile> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new Error('Invalid user payload from Google ID token');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      avatarUrl: payload.picture || null,
    };
  }
}

export const googleAuthService = new GoogleAuthService();
