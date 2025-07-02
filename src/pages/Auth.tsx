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

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [firms, setFirms] = useState<Firm[]>([]);
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
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load firms for non-admin registration
  useEffect(() => {
    const loadFirms = async () => {
      const { data, error } = await supabase.from('firms').select('*');
      if (data) {
        setFirms(data);
      }
    };
    loadFirms();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!/^\d{10}$/.test(formData.mobileNumber)) newErrors.mobileNumber = 'Mobile number must be 10 digits';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.role !== 'Admin' && !formData.firmId) newErrors.firmId = 'Firm selection is required for non-admin users';
    if (formData.role === 'Admin' && !formData.adminPin) newErrors.adminPin = 'Admin PIN is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Verify admin PIN if admin role
      if (formData.role === 'Admin') {
        const { data: secretData } = await supabase.functions.invoke('verify-admin-pin', {
          body: { pin: formData.adminPin }
        });
        
        if (!secretData?.valid) {
          setErrors({ adminPin: 'Invalid admin PIN' });
          setIsLoading(false);
          return;
        }
      }

      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        full_name: formData.fullName,
        mobile_number: formData.mobileNumber,
        role: formData.role,
        firm_id: formData.role === 'Admin' ? null : formData.firmId
      });

      if (profileError) throw profileError;

      toast({
        title: "Account created successfully!",
        description: "Please check your email to verify your account.",
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
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

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've been signed in successfully.",
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
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
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-4">
                {/* Role Selection */}
                <div className="grid grid-cols-1 gap-4">
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
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Photographer">Photographer</SelectItem>
                        <SelectItem value="Videographer">Videographer</SelectItem>
                        <SelectItem value="Editor">Editor</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
                  </div>
                </div>

                {/* Conditional Second Row */}
                <div className="grid grid-cols-1 gap-4">
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
                          <AlertDescription>
                            No firms available. Please contact an admin to create a firm first.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>

                {/* Full Name */}
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

                {/* Email and Mobile */}
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

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password (minimum 6 characters)"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setErrors({ ...errors, password: '' });
                    }}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <Button 
                  onClick={handleSignUp} 
                  disabled={isLoading || (formData.role !== 'Admin' && firms.length === 0)}
                  className="w-full"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
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
  );
};

// Separate Sign In Form Component
const SignInForm = ({ onSubmit, isLoading }: { onSubmit: (email: string, password: string) => void; isLoading: boolean }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
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
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  );
};

export default Auth;