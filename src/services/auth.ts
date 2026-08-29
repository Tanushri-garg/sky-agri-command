/**
 * Authentication service.
 *
 * Demo mode: a local session stored in localStorage so the dashboard route
 * guard is fully functional without a backend.
 *
 * To switch to Supabase auth, replace the three functions below with
 * `supabase.auth.signInWithPassword`, `signOut` and `getSession`. No route or
 * component change is required.
 */

const KEY = "agridrone.session.v1";

export interface Session {
  email: string;
  signedInAt: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let cached: Session | null | undefined;

function emit() {
  listeners.forEach((l) => l());
}

export const authService = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSession(): Session | null {
    if (typeof window === "undefined") return null;
    if (cached !== undefined) return cached;
    try {
      const raw = window.localStorage.getItem(KEY);
      cached = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cached = null;
    }
    return cached;
  },
  async signIn(email: string, password: string): Promise<Session> {
    if (!email.includes("@")) throw new Error("Enter a valid email address");
    if (password.length < 4) throw new Error("Password must be at least 4 characters");
    const session: Session = { email, signedInAt: new Date().toISOString() };
    cached = session;
    window.localStorage.setItem(KEY, JSON.stringify(session));
    emit();
    return session;
  },
  async signOut() {
    cached = null;
    window.localStorage.removeItem(KEY);
    emit();
  },
};
