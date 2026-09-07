import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { Car, Loader2, Sparkles, Shield, Lock, Building2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  role: z.enum(['customer', 'owner']),
});

export default function Auth() {
  const { user, role, signIn, signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupRole, setSignupRole] = useState<'customer' | 'owner'>('customer');

  if (user && role) {
    const redirectPath = role === 'customer' 
      ? '/customer/booking' 
      : role === 'driver' 
        ? '/driver/trips' 
        : '/owner/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
      
      const { error } = await signIn(loginEmail, loginPassword);
      
      if (error) {
        toast({
          title: 'Login Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in.',
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      signupSchema.parse({
        email: signupEmail,
        password: signupPassword,
        full_name: signupName,
        phone: signupPhone,
        role: signupRole,
      });

      const { error } = await signUp(signupEmail, signupPassword, {
        full_name: signupName,
        phone: signupPhone,
        role: signupRole,
      });

      if (error) {
        let message = error.message;
        if (message.includes('already registered')) {
          message = 'This email is already registered. Please log in instead.';
        }
        toast({
          title: 'Signup Failed',
          description: message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Account Created!',
          description: 'Welcome to TaxiRank. You can now start using the app.',
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <div className="glass rounded-3xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh p-4">
      {/* Floating decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="glass rounded-3xl w-full max-w-md p-8 animate-scale-in relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 glow-primary">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">TaxiRank</h1>
          <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Sparkles className="h-4 w-4" />
            Book your taxi rides with ease
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass-subtle rounded-xl p-1 mb-6">
            <TabsTrigger 
              value="login" 
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              Login
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="animate-fade-in">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-base font-medium glow-primary hover:opacity-90 transition-opacity" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup" className="animate-fade-in">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-phone" className="text-sm font-medium">Phone Number</Label>
                <Input
                  id="signup-phone"
                  type="tel"
                  placeholder="+27 123 456 7890"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/50"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium">I am a...</Label>
                <RadioGroup
                  value={signupRole}
                  onValueChange={(v) => setSignupRole(v as 'customer' | 'owner')}
                  className="flex gap-3"
                >
                  <label 
                    htmlFor="customer" 
                    className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl cursor-pointer transition-all ${
                      signupRole === 'customer' 
                        ? 'bg-primary text-primary-foreground shadow-lg' 
                        : 'bg-secondary/50 hover:bg-secondary'
                    }`}
                  >
                    <RadioGroupItem value="customer" id="customer" className="sr-only" />
                    <span className="font-medium">Customer</span>
                  </label>
                  <label 
                    htmlFor="owner" 
                    className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl cursor-pointer transition-all ${
                      signupRole === 'owner' 
                        ? 'bg-primary text-primary-foreground shadow-lg' 
                        : 'bg-secondary/50 hover:bg-secondary'
                    }`}
                  >
                    <RadioGroupItem value="owner" id="owner" className="sr-only" />
                    <span className="font-medium">Taxi Owner</span>
                  </label>
                </RadioGroup>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-base font-medium glow-primary hover:opacity-90 transition-opacity" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Trust indicators */}
        <div className="mt-8 pt-6 border-t border-border/30 space-y-4">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-success" />
              <span>256-bit SSL</span>
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span>PCI Compliant</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5 mb-2">
              <Building2 className="h-3 w-3" />
              Trusted by major banks
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['FNB', 'Standard Bank', 'ABSA', 'Nedbank', 'Capitec'].map((bank) => (
                <span
                  key={bank}
                  className="px-2 py-1 rounded-md bg-secondary/50 text-[10px] font-medium text-muted-foreground"
                >
                  {bank}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
