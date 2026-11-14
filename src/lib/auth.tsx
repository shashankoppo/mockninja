import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type AppRole = 'STUDENT' | 'ADMIN';

export interface ProfileData {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  birth_year: number | null;
  guardian_email: string | null;
  guardian_consent_at: string | null;
  consent_version: string | null;
  entry_source: string | null;
  referral_code: string | null;
  avatar_url: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileData | null;
  loading: boolean;
  needsOnboarding: boolean;
  mfaPending: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshMfaStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaPending, setMfaPending] = useState(false);

  const refreshMfaStatus = async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setMfaPending(data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2');
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, birth_year, guardian_email, guardian_consent_at, consent_version, entry_source, referral_code, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to load profile:', error.message);
      setProfile(null);
      return;
    }
    setProfile(data as ProfileData | null);
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user?.id) {
        Promise.all([fetchProfile(data.session.user.id), refreshMfaStatus()]).then(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        (async () => {
          await fetchProfile(newSession.user.id);
          await refreshMfaStatus();
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setMfaPending(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setMfaPending(false);
    setSession(null);
  };

  const needsOnboarding = !!session?.user && !!profile && !profile.full_name && profile.birth_year === null;

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, needsOnboarding, mfaPending, signOut, refreshProfile, refreshMfaStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
