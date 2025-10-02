"use client";

import { useAuth } from '@/context/auth-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { login, signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSigningUp) {
        await signup(email, password);
        toast({ title: "Sign up successful!", description: "You can now log in." });
      } else {
        await login(email, password);
        toast({ title: "Login successful!", description: "Welcome back!" });
        router.push('/'); // Redirect to home page on successful login
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected authentication error.';
      toast({ title: "Authentication Error", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSigningUp ? "Sign Up" : "Login"}</CardTitle>
          <CardDescription>
            {isSigningUp ? "Create an account to get started." : "Log in to your HoneyDo by Amber account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="auth-email"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="auth-password"
              />
            </div>
            <Button type="submit" className="w-full" data-testid="auth-submit">
              {isSigningUp ? "Sign Up" : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isSigningUp ? "Already have an account?" : "Don&apos;t have an account?"}{" "}
            <Button
              variant="link"
              onClick={() => setIsSigningUp(!isSigningUp)}
              className="p-0 h-auto"
              data-testid="auth-toggle"
            >
              {isSigningUp ? "Login" : "Sign Up"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
