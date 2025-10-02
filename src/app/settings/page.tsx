"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsIcon, Info } from "lucide-react";
import { useReminders } from "@/context/reminders-context";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { AMBER_PERSONALITY_OPTIONS, DEFAULT_AMBER_PERSONALITY_KEY, type AmberPersonalityKey } from "@/lib/personalities";

export default function SettingsPage() {
  const { 
    defaultReminderTime, 
    setDefaultReminderTime, 
    areNotificationsGloballyEnabled,
    setAreNotificationsGloballyEnabled,
    isLoading,
    fcmToken,
    defaultPersonality,
    setDefaultPersonality,
  } = useReminders();
  const { toast } = useToast();
  const { logout } = useAuth();
  const router = useRouter();

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  };

  const handleDefaultTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDefaultReminderTime(event.target.value);
    toast({
      title: "Amber Noted!",
      description: "Default reminder time updated.",
    });
  };

  const handleDefaultPersonalityChange = (value: AmberPersonalityKey) => {
    void setDefaultPersonality(value);
    const selected = AMBER_PERSONALITY_OPTIONS.find(option => option.key === value) || AMBER_PERSONALITY_OPTIONS.find(option => option.key === DEFAULT_AMBER_PERSONALITY_KEY);
    toast({
      title: "Amber will change her vibe",
      description: selected ? `New default: ${selected.label}.` : 'Default personality updated.',
    });
  };

  const handleNotificationToggle = (enabled: boolean) => {
    setAreNotificationsGloballyEnabled(enabled);
    // Toast for enabling/disabling is handled in context
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login'); // Redirect to login page after logout
    } catch (error: unknown) {
      toast({ title: "Logout Error", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <Card className="bg-background shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div>
              <div className="h-8 w-40 bg-muted rounded" />
              <div className="h-4 w-60 bg-muted rounded mt-1" />
            </div>
          </CardHeader>
        </Card>
         <Card><CardContent className="h-48 bg-muted rounded-lg" /></Card>
         <Card><CardContent className="h-32 bg-muted rounded-lg" /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="bg-background shadow-lg">
        <CardHeader className="flex flex-row items-center gap-4">
          <SettingsIcon className="w-10 h-10 text-primary" />
          <div>
            <CardTitle className="font-headline text-3xl text-foreground">Settings</CardTitle>
            <CardDescription>Tailor Amber&apos;s help to be just right for you, Honey!</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-xl">Notification Preferences</CardTitle>
          <CardDescription>How would you like Amber to remind you?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
            <Label htmlFor="enable-notifications" className="font-semibold flex flex-col space-y-1">
              <span>Enable Gentle Barks (Push Notifications)</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Allow Amber to send you reminders via push notifications.
              </span>
            </Label>
            <Switch 
              id="enable-notifications" 
              aria-label="Enable push notifications" 
              checked={areNotificationsGloballyEnabled}
              onCheckedChange={handleNotificationToggle}
            />
          </div>

          {areNotificationsGloballyEnabled && !fcmToken && !isLoading && (
            <Alert variant="default" className="border-primary/50 bg-primary/10">
              <Info className="h-4 w-4 text-primary-foreground" />
              <AlertTitle className="text-primary-foreground">Action Needed for Barks!</AlertTitle>
              <AlertDescription className="text-primary-foreground/80">
                Amber needs your permission to send barks (notifications). Please allow notifications in your browser when prompted. If you&apos;ve previously denied permission, you may need to adjust your browser&apos;s site settings for this app.
              </AlertDescription>
            </Alert>
          )}
          {process.env.NODE_ENV === 'development' && fcmToken && (
             <div className="p-4 border rounded-lg bg-muted/50 text-xs">
                <p className="font-semibold text-muted-foreground">Dev Info: FCM Token</p>
                <p className="break-all text-muted-foreground/80">{fcmToken}</p>
             </div>
          )}
          
          <div className="space-y-2 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
            <Label htmlFor="default-reminder-time" className="font-semibold">Default Reminder Time</Label>
            <Input 
              id="default-reminder-time" 
              type="time" 
              value={defaultReminderTime}
              onChange={handleDefaultTimeChange}
              className="bg-background/50"
            />
            <p className="text-sm text-muted-foreground">
              When no time is specified, Amber will use this.
            </p>
          </div>

          <div className="space-y-2 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
            <Label htmlFor="default-personality" className="font-semibold">Amber&apos;s Default Personality</Label>
            <Select
              value={defaultPersonality || DEFAULT_AMBER_PERSONALITY_KEY}
              onValueChange={(value) => handleDefaultPersonalityChange(value as AmberPersonalityKey)}
            >
              <SelectTrigger id="default-personality" className="bg-background/50">
                <SelectValue placeholder="Choose Amber's voice" />
              </SelectTrigger>
              <SelectContent>
                {AMBER_PERSONALITY_OPTIONS.map(option => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Set Amber&apos;s default voice for new reminders. You can still change it per reminder later.
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleLogout}>Logout</Button>
      </div>
    </div>
  );
}
