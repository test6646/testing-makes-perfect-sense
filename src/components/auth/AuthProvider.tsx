
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  currentFirmId: string | null;
  checkEmailVerification: () => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>;
  isEmailVerified: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  currentFirmId: null,
  checkEmailVerification: async () => false,
  resendVerificationEmail: async () => {},
  isEmailVerified: false
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const { toast } = useToast();

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        if (error.code !== 'PGRST116') { // Not found error
          toast({
            title: "Error loading profile",
            description: error.message,
            variant: "destructive",
          });
        }
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    }
  };

  const checkEmailVerification = async (): Promise<boolean> => {
    if (!user) return false;
    
    const verified = user.email_confirmed_at !== null;
    setIsEmailVerified(verified);
    return verified;
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) return;
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      toast({
        title: "Verification email sent",
        description: "Please check your email for the verification link.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send verification email",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    
    const profileData = await loadProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check email verification
          setIsEmailVerified(session.user.email_confirmed_at !== null);
          
          // Load profile data
          const profileData = await loadProfile(session.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
          setIsEmailVerified(false);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setIsEmailVerified(session.user.email_confirmed_at !== null);
        const profileData = await loadProfile(session.user.id);
        setProfile(profileData);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsEmailVerified(false);
  };

  const currentFirmId = profile?.current_firm_id || profile?.firm_id || null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      signOut, 
      refreshProfile,
      currentFirmId,
      checkEmailVerification,
      resendVerificationEmail,
      isEmailVerified
    }}>
      {children}
    </AuthContext.Provider>
  );
};
