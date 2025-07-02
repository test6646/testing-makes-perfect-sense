
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export const PasswordStrength = ({ password, className }: PasswordStrengthProps) => {
  const getStrengthScore = (pwd: string): number => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const getStrengthText = (score: number): string => {
    if (score === 0) return '';
    if (score <= 2) return 'Weak';
    if (score === 3) return 'Fair';
    if (score === 4) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = (score: number): string => {
    if (score <= 2) return 'bg-red-500';
    if (score === 3) return 'bg-yellow-500';
    if (score === 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const score = getStrengthScore(password);
  const strengthText = getStrengthText(score);
  const strengthColor = getStrengthColor(score);

  if (!password) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Password strength</span>
        <span className={cn(
          "text-sm font-medium",
          score <= 2 && "text-red-600",
          score === 3 && "text-yellow-600",
          score === 4 && "text-blue-600",
          score === 5 && "text-green-600"
        )}>
          {strengthText}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn("h-2 rounded-full transition-all duration-300", strengthColor)}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex flex-wrap gap-2">
          <span className={password.length >= 8 ? "text-green-600" : ""}>
            8+ characters
          </span>
          <span className={/[a-z]/.test(password) ? "text-green-600" : ""}>
            lowercase
          </span>
          <span className={/[A-Z]/.test(password) ? "text-green-600" : ""}>
            uppercase
          </span>
          <span className={/[0-9]/.test(password) ? "text-green-600" : ""}>
            number
          </span>
          <span className={/[^A-Za-z0-9]/.test(password) ? "text-green-600" : ""}>
            symbol
          </span>
        </div>
      </div>
    </div>
  );
};
