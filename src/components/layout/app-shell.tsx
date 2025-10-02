"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, CheckCircle, PlusCircle, SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Upcoming", icon: Home },
  { href: "/add", label: "Add New", icon: PlusCircle },
  { href: "/completed", label: "Finishes", icon: CheckCircle },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

const BOTTOM_NAV_HEIGHT_CLASS = "h-16"; 

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-background/95 px-4 shadow-sm backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/HoneyDoByAmberLogo.png" 
            alt="HoneyDo by Amber icon" 
            width={32} 
            height={32} 
            className="rounded-full"
            data-ai-hint="girl dog app logo"
          />
          <h1 className="font-headline text-2xl font-bold text-foreground">
            HoneyDo <span className="text-primary-foreground">by Amber</span>
          </h1>
        </Link>
        
        {/* Banner Illustration */}
        <div className="relative flex-1 h-full ml-4 overflow-hidden rounded-md shadow-inner">
          <div
            aria-hidden="true"
            style={{ backgroundImage: "url('/top-bar-banner.png')" }}
            className="absolute inset-0 bg-repeat-x bg-center bg-[length:auto_100%]"
            data-ai-hint="sunset illustration girl and dog"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-background/10 to-background/40" aria-hidden="true" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 pb-20"> 
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-sm",
        BOTTOM_NAV_HEIGHT_CLASS
      )}>
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-2 text-center transition-colors w-1/4 h-full",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6 mb-0.5", isActive ? "text-primary" : "")} />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
