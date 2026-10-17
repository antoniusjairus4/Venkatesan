// Hardcoded admin username (case-insensitive)
export const ADMIN_USERNAME = 'venkatesan';

// Secure cryptographic SHA-256 hash of 'MahiVenkat@1722'
// Plaintext password is NEVER stored directly in the source code
export const ADMIN_PASSWORD_HASH = 'f36eee1643ad01e7b1921681b4c43d43461435761bec09312e0be1992f402959';

const SESSION_KEY = 'rajamanickam_admin_auth';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyCredentials(username: string, passwordAttempt: string): Promise<boolean> {
  const trimmedUser = username.trim().toLowerCase();
  if (trimmedUser !== ADMIN_USERNAME) {
    return false;
  }
  const attemptHash = await hashPassword(passwordAttempt);
  return attemptHash === ADMIN_PASSWORD_HASH;
}

export function saveSession(rememberMe: boolean = false): void {
  const sessionData = JSON.stringify({
    authenticated: true,
    user: 'Venkatesan',
    timestamp: new Date().toISOString(),
  });
  if (rememberMe) {
    localStorage.setItem(SESSION_KEY, sessionData);
  } else {
    sessionStorage.setItem(SESSION_KEY, sessionData);
  }
}

export function getSession(): boolean {
  try {
    const session = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!session) return false;
    const parsed = JSON.parse(session);
    return Boolean(parsed.authenticated);
  } catch {
    return false;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

