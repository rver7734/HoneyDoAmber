"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppShell from '@/components/layout/app-shell';
import { RemindersProvider, useReminders } from '@/context/reminders-context';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Inter as FontSans } from "next/font/google"
import { cn } from "@/lib/utils"
import SplashScreen from "@/components/layout/splash-screen";
import { NativeNotificationBridge } from '@/lib/local-notification-bridge';

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

function AuthAndRemindersWrapper({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const { isLoading: isRemindersLoading } = useReminders();
  const router = useRouter();
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(true);

  // Effect to manage splash screen visibility
  useEffect(() => {
    if (!isAuthLoading && !isRemindersLoading) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1000); // Minimum splash screen duration
      return () => clearTimeout(timer);
    }
  }, [isAuthLoading, isRemindersLoading]);

  // Effect to handle redirection based on authentication state
  useEffect(() => {
    if (!isAuthLoading && !currentUser && pathname !== '/login' && pathname !== '/debug') {
      router.push('/login');
    }
  }, [currentUser, isAuthLoading, pathname, router]);

  // Render splash screen if still loading or explicitly set to show
  if (showSplash || isAuthLoading || isRemindersLoading) {
    return <SplashScreen onFinished={() => setShowSplash(false)} />;
  }

  // If not logged in and not on login page or debug page, return null to prevent rendering protected content
  if (!currentUser && pathname !== '/login' && pathname !== '/debug') {
    return null;
  }

  // Render AppShell and children once everything is loaded and user is authenticated (or on login page)
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fontSans.variable
      )}>
        <AuthProvider>
          <RemindersProvider>
            <NativeNotificationBridge />
            <AuthAndRemindersWrapper>
              {children}
            </AuthAndRemindersWrapper>
          </RemindersProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
