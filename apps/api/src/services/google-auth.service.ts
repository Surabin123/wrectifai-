import { OAuth2Client } from 'google-auth-library';
import { getEnv } from '../config/env';

export interface GoogleUserPayload {
  email: string;
  name: string;
  sub: string;
}

export async function verifyGoogleIdToken(token: string): Promise<GoogleUserPayload> {
  const { googleClientId } = getEnv();
  const isProduction = process.env.NODE_ENV === 'production';
  const hasPlaceholderClientId = !googleClientId || googleClientId === 'your-google-client-id-here';

  // Mock OAuth is strictly development-only. Production must fail closed when
  // OAuth is not configured or a mock token is supplied.
  if (isProduction && (hasPlaceholderClientId || token.startsWith('mock_'))) {
    throw new Error('Google OAuth is not configured for production');
  }

  if (!isProduction && (hasPlaceholderClientId || token.startsWith('mock_'))) {
    console.warn('[auth] Using Google OAuth ID Token verification MOCK mode.');
    let email = 'google-user@wrectifai.com';
    let name = 'Google User';
    let sub = 'mock-google-sub-id';

    if (token.startsWith('mock_')) {
      const parts = token.split('_');
      if (parts[1]) {
        email = `${parts[1]}@wrectifai.com`;
        name = parts[1].charAt(0).toUpperCase() + parts[1].slice(1) + ' User';
        sub = `mock-google-sub-${parts[1]}`;
      }
    }
    return { email, name, sub };
  }

  // If the token is not a JWT (doesn't have 3 parts separated by dots), treat it as an access token.
  if (token.split('.').length !== 3) {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google using access token');
    }
    const payload = await response.json() as { email?: string; name?: string; sub?: string };
    if (!payload || !payload.email || !payload.name || !payload.sub) {
      throw new Error('Invalid Google UserInfo payload');
    }
    return {
      email: payload.email,
      name: payload.name,
      sub: payload.sub,
    };
  }

  const client = new OAuth2Client(googleClientId);
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email || !payload.name || !payload.sub) {
    throw new Error('Invalid Google ID Token payload');
  }

  return {
    email: payload.email,
    name: payload.name,
    sub: payload.sub,
  };
}
