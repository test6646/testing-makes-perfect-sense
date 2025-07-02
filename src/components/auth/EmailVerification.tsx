
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface EmailVerificationProps {
  email: string;
  onVerificationComplete: () => void;
}

export const EmailVerification = ({ email, onVerificationComplete }: EmailVerificationProps) => {
  const [isResending, setIsResending] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const { resendVerificationEmail, checkEmailVerification } = useAuth();

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      await resendVerificationEmail();
      setLastSent(new Date());
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    const isVerified = await checkEmailVerification();
    if (isVerified) {
      onVerificationComplete();
    }
  };

  const canResend = !lastSent || (Date.now() - lastSent.getTime()) > 60000; // 1 minute cooldown

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <CardTitle>Check Your Email</CardTitle>
        <CardDescription>
          We've sent a verification link to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Click the verification link in your email to activate your account. 
            You may need to check your spam folder.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button 
            onClick={handleCheckVerification}
            className="w-full"
            variant="default"
          >
            I've Verified My Email
          </Button>

          <Button
            onClick={handleResendEmail}
            disabled={isResending || !canResend}
            variant="outline"
            className="w-full"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Verification Email'
            )}
          </Button>

          {lastSent && (
            <p className="text-sm text-muted-foreground text-center">
              Last sent {new Date(lastSent).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Wrong email address?{' '}
            <Button variant="link" className="p-0 h-auto text-sm" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
