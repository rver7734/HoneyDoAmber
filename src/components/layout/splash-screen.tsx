
"use client";

import Image from 'next/image';
import { useEffect } from 'react';

interface SplashScreenProps {
  onFinished: () => void;
}

export default function SplashScreen({ onFinished }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 2500); // Splash screen duration: 2.5 seconds

    return () => clearTimeout(timer); // Cleanup timer on component unmount
  }, [onFinished]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <Image
        src="/HoneyDoByAmberLogo.png" 
        alt="HoneyDo by Amber Splash Screen featuring Honey and Amber"
        width={200}
        height={200}
        className="animate-pulse"
        data-ai-hint="Honey Amber app splash"
        priority
      />
      <p className="mt-4 text-xl font-headline text-primary-foreground">
        HoneyDo by Amber
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Getting things ready for you...
      </p>
    </div>
  );
}
