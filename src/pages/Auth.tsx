
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { UserRole, AuthFormData, Firm } from '@/types/auth';
import { AuthProgress } from '@/components/auth/AuthProgress';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { EmailVerification } from '@/components/auth/EmailVerification';
import { useAuth } from '@/components/auth/AuthProvider';
import { Loader2, AlertCircle, CheckCircle, Building2 } from 'lucide-react';

type AuthStep = 'form' | 'verification' | 'success';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [authStep, setAuthStep] = useState<AuthStep>('form');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [formData, setFormData] = useState<AuthFormData>({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    role: 'Photographer',
    firmId: '',
    adminPin: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isEmailVerified } = useAuth();

  // Redirect authenticated users with verified emails
  useEffect(() => {
    if (user && isEmailVerified) {
      navigate('/');
    }
  }, [user, isEmailVerified, navigate]);

  // Load firms for non-admin registration
  useEffect(() => {
    const loadFirms = async () => {
      try {
        const { data, error } = await supabase.from('firms').select('*');
        if (error) throw error;
        setFirms(data || []);
      } catch (error: any) {
        console.error('Error loading firms:', error);
        toast({
          title: "Error loading firms",
          description: "Unable to load available firms. Please refresh the page.",
          variant: "destructive",
        });
      }
    };
    loadFirms();
  }, [toast]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (!/^\d{10}$/.test(formData.mobileNumber)) newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters long';
    
    // Role-specific validation
    if (formData.role !== 'Admin' && !formData.firmId) {
      newErrors.firmId = 'Please select a firm';
    }
    if (formData.role === 'Admin' && !formData.adminPin) {
      newErrors.adminPin = 'Admin PIN is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Verify admin PIN if admin role
      if (formData.role === 'Admin') {
        console.log('Verifying admin PIN...');
        const { data: secretData, error: pinError } = await supabase.functions.invoke('verify-admin-pin', {
          body: { pin: formData.adminPin }
        });
        
        console.log('Admin PIN verification result:', { secretData, pinError });
        
        if (pinError || !secretData?.valid) {
          console.error('Admin PIN verification failed:', pinError);
          setErrors({ adminPin: 'Invalid admin PIN. Please check and try again.' });
          setIsLoading(false);
          return;
        }
      }

      console.log('Starting user signup...');
      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
            mobile_number: formData.mobileNumber,
            role: formData.role
          }
        }
      });

      console.log('Signup result:', { authData, authError });

      if (authError) {
        console.error('Auth signup error:', authError);
        throw authError;
      }
      if (!authData.user) {
        console.error('No user returned from signup');
        throw new Error('Account creation failed. Please try again.');
      }

      console.log('Creating profile for user:', authData.user.id);
      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        full_name: formData.fullName,
        mobile_number: formData.mobileNumber,
        role: formData.role,
        firm_id: formData.role === 'Admin' ? null : formData.firmId
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }

      console.log('Account creation successful, moving to verification step');
      // If admin, we'll handle firm creation after email verification
      setVerificationEmail(formData.email);
      setAuthStep('verification');

      toast({
        title: "Account created successfully!",
        description: "Please check your email to verify your account before continuing.",
      });

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        throw error;
      }

      toast({
        title: "Welcome back!",
        description: "You've been signed in successfully.",
      });

    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Sign in failed",
        description: error.message || "Unable to sign in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationComplete = () => {
    setAuthStep('success');
    toast({
      title: "Email verified successfully!",
      description: "Welcome to Studio Management System!",
    });
    
    // Redirect after a short delay
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  if (authStep === 'verification') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <AuthProgress currentStep="verification" className="mb-8" />
          <EmailVerification 
            email={verificationEmail} 
            onVerificationComplete={handleVerificationComplete}
          />
        </div>
      </div>
    );
  }

  if (authStep === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <AuthProgress currentStep="complete" className="mb-8" />
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-green-700">Welcome to Studio Management!</CardTitle>
              <CardDescription>
                Your account has been successfully verified. Redirecting you to the dashboard...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <AuthProgress currentStep="signup" className="mb-8" />
        
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">Studio Management System</CardTitle>
            <CardDescription>Professional Photography Studio Authentication</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signup" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="signin">Sign In</TabsTrigger>
              </TabsList>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="space-y-6">
                <div className="space-y-4">
                  {/* Role Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="role">Role Selection *</Label>
                    <Select 
                      value={formData.role} 
                      onValueChange={(value: UserRole) => {
                        setFormData({ ...formData, role: value, firmId: value === 'Admin' ? '' : formData.firmId });
                        setErrors({ ...errors, role: '' });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Admin (Firm Owner)
                          </div>
                        </SelectItem>
                        <SelectItem value="Photographer">Photographer</SelectItem>
                        <SelectItem value="Videographer">Videographer</SelectItem>
                        <SelectItem value="Editor">Editor</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
                  </div>

                  {/* Conditional Second Row */}
                  {formData.role === 'Admin' ? (
                    <div className="space-y-2">
                      <Label htmlFor="adminPin">Admin PIN *</Label>
                      <Input
                        id="adminPin"
                        type="password"
                        placeholder="Enter admin PIN"
                        value={formData.adminPin}
                        onChange={(e) => {
                          setFormData({ ...formData, adminPin: e.target.value });
                          setErrors({ ...errors, adminPin: '' });
                        }}
                      />
                      {errors.adminPin && <p className="text-sm text-destructive">{errors.adminPin}</p>}
                      <p className="text-xs text-muted-foreground">
                        Admin PIN is required to create firms and manage the system
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="firmId">Firm Selection *</Label>
                      <Select 
                        value={formData.firmId} 
                        onValueChange={(value) => {
                          setFormData({ ...formData, firmId: value });
                          setErrors({ ...errors, firmId: '' });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your firm" />
                        </SelectTrigger>
                        <SelectContent>
                          {firms.map((firm) => (
                            <SelectItem key={firm.id} value={firm.id}>
                              {firm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.firmId && <p className="text-sm text-destructive">{errors.firmId}</p>}
                      {firms.length === 0 && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            No firms are currently available. Please contact an admin to create a firm, 
                            or register as an Admin to create your own firm.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        placeholder="Enter your full name"
                        value={formData.fullName}
                        onChange={(e) => {
                          setFormData({ ...formData, fullName: e.target.value });
                          setErrors({ ...errors, fullName: '' });
                        }}
                      />
                      {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            setErrors({ ...errors, email: '' });
                          }}
                        />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile Number *</Label>
                        <Input
                          id="mobile"
                          placeholder="10 digit mobile number"
                          value={formData.mobileNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setFormData({ ...formData, mobileNumber: value });
                            setErrors({ ...errors, mobileNumber: '' });
                          }}
                        />
                        {errors.mobileNumber && <p className="text-sm text-destructive">{errors.mobileNumber}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={(e) => {
                            setFormData({ ...formData, password: e.target.value });
                            setErrors({ ...errors, password: '' });
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </Button>
                      </div>
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                      <PasswordStrength password={formData.password} />
                    </div>
                  </div>

                  <Button 
                    onClick={handleSignUp} 
                    disabled={isLoading || (formData.role !== 'Admin' && firms.length === 0)}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* Sign In Tab */}
              <TabsContent value="signin" className="space-y-4">
                <SignInForm onSubmit={handleSignIn} isLoading={isLoading} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Enhanced Sign In Form Component
const SignInForm = ({ onSubmit, isLoading }: { onSubmit: (email: string, password: string) => void; isLoading: boolean }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateSignIn = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email address';
    if (!password) newErrors.password = 'Password is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateSignIn()) {
      onSubmit(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email Address</Label>
        <Input
          id="signin-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors({ ...errors, email: '' });
          }}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <div className="relative">
          <Input
            id="signin-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors({ ...errors, password: '' });
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </Button>
        </div>
        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing In...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  );
};

export default Auth;
