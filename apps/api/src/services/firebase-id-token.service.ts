interface FirebaseLookupUser {
  localId?: string;
  phoneNumber?: string;
  email?: string;
}

interface FirebaseLookupResponse {
  users?: FirebaseLookupUser[];
  error?: { message?: string };
}

/**
 * Verifies a Firebase ID token through Firebase Auth's server-side lookup API.
 * The API key identifies the Firebase project; the ID token is still validated
 * by Firebase before any account is allowed to authenticate here.
 */
export async function verifyFirebaseIdToken(idToken: string, apiKey: string): Promise<FirebaseLookupUser> {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(5000),
  });

  const payload = await response.json() as FirebaseLookupResponse;
  const user = payload.users?.[0];
  if (!response.ok || !user) {
    throw new Error('Invalid Firebase authentication token');
  }

  return user;
}
