
"use client";

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useReminders } from '@/context/reminders-context';
import type { Reminder, RecurrenceFrequency } from '@/types/reminder';
import { Loader2, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { AMBER_PERSONALITY_OPTIONS, DEFAULT_AMBER_PERSONALITY_KEY, type AmberPersonalityKey } from '@/lib/personalities';

const priorityEnum = z.enum(['low', 'medium', 'high']);
const personalityEnum = z.enum(['sweet', 'funny', 'sarcastic', 'angry', 'raging', 'random']);
const recurrenceFrequencyEnum = z.enum(['daily', 'weekdays', 'weekly']);

const reminderSchema = z.object({
  id: z.string().optional(),
  task: z.string().min(1, "Amber needs to know what the task is!"),
  details: z
    .string()
    .max(400, "Amber likes to keep notes short and sweet (400 characters max).")
    .optional(),
  date: z.string().min(1, "Don&apos;t forget the date!"),
  time: z.string().min(1, "What time should Amber remind you?"),
  priority: priorityEnum.optional().default('medium'),
  personality: personalityEnum.default(DEFAULT_AMBER_PERSONALITY_KEY),
  recurrenceEnabled: z.boolean().optional().default(false),
  recurrenceFrequency: recurrenceFrequencyEnum.optional(),
  recurrenceWeeklyDays: z.array(z.number().min(0).max(6)).optional(),
});

type ReminderFormData = {
  id?: string;
  task: string;
  details?: string | null;
  date: string;
  time: string;
  priority: 'low' | 'medium' | 'high';
  personality: AmberPersonalityKey;
  recurrenceEnabled?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceWeeklyDays?: number[];
};


export function ReminderForm({ reminderId: propReminderId }: { reminderId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isFormProcessing, startFormTransition] = useTransition();
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const { getReminderById, addReminder, updateReminder, defaultReminderTime, defaultPersonality } = useReminders();

  const reminderId = propReminderId || searchParams.get('id');

  const { register, handleSubmit, reset, setValue, control, watch, formState: { errors } } = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      task: searchParams.get('task') || '',
      details: searchParams.get('details') || '',
      date: searchParams.get('date') || new Date().toISOString().split('T')[0],
      time: searchParams.get('time') || defaultReminderTime || '09:00',
      priority: (searchParams.get('priority') as 'low' | 'medium' | 'high' | null) || 'medium',
      personality: (searchParams.get('personality') as AmberPersonalityKey | null) || defaultPersonality || DEFAULT_AMBER_PERSONALITY_KEY,
      recurrenceEnabled: false,
      recurrenceFrequency: undefined,
      recurrenceWeeklyDays: [],
    }
  });

  const watchRecurrenceEnabled = watch('recurrenceEnabled');
  const watchRecurrenceFrequency = watch('recurrenceFrequency');

  useEffect(() => {
    if (reminderId) {
      setIsLoadingData(true);
      const reminder = getReminderById(reminderId);
      if (reminder) {
        reset({
          id: reminder.id,
          task: reminder.task,
          details: reminder.details || '',
          date: reminder.date,
          time: reminder.time,
          priority: reminder.priority || 'medium',
          personality: reminder.personality || defaultPersonality || DEFAULT_AMBER_PERSONALITY_KEY,
          recurrenceEnabled: Boolean(reminder.recurrence),
          recurrenceFrequency: reminder.recurrence?.frequency,
          recurrenceWeeklyDays: reminder.recurrence?.daysOfWeek || [],
        });
      } else {
        toast({ title: "Oops!", description: "Amber couldn&apos;t find that reminder.", variant: "destructive" });
        router.push('/');
      }
      setIsLoadingData(false);
    } else {
        const task = searchParams.get('task');
        const date = searchParams.get('date');
        const time = searchParams.get('time');
        const priority = searchParams.get('priority') as 'low' | 'medium' | 'high' | null;

        setValue('task', task || '');
        setValue('details', searchParams.get('details') || '');
        setValue('date', date || new Date().toISOString().split('T')[0]);
        setValue('time', time || defaultReminderTime || '09:00');
        setValue('priority', priority || 'medium');
        setValue('personality', (searchParams.get('personality') as AmberPersonalityKey | null) || defaultPersonality || DEFAULT_AMBER_PERSONALITY_KEY);
        setValue('recurrenceEnabled', false);
        setValue('recurrenceFrequency', undefined);
        setValue('recurrenceWeeklyDays', []);
        setValue('id', undefined);
    }
  }, [reminderId, reset, toast, router, searchParams, setValue, getReminderById, defaultReminderTime, defaultPersonality]);


  const onSubmit: SubmitHandler<ReminderFormData> = (data) => {
    startFormTransition(async () => {
      console.log("🚀 Form submission started", data);
      try {
        const trimmedDetails = data.details?.trim();
        const detailsForStorage = trimmedDetails && trimmedDetails.length > 0 ? trimmedDetails : null;

        let recurrence: Reminder['recurrence'] = null;
        if (data.recurrenceEnabled) {
          if (!data.recurrenceFrequency) {
            throw new Error("Pick how often Amber should repeat this reminder.");
          }
          if (data.recurrenceFrequency === 'weekly') {
            const days = Array.from(new Set(data.recurrenceWeeklyDays || [])).filter(day => day >= 0 && day <= 6).sort();
            if (!days.length) {
              throw new Error("Choose at least one day for a weekly reminder.");
            }
            recurrence = { frequency: data.recurrenceFrequency, daysOfWeek: days };
          } else if (data.recurrenceFrequency === 'weekdays') {
            recurrence = { frequency: 'weekdays' };
          } else {
            recurrence = { frequency: data.recurrenceFrequency };
          }
        }

        const reminderDataToSave: Omit<Reminder, "id" | "completed"> = {
          task: data.task, 
          details: detailsForStorage,
          date: data.date, 
          time: data.time,
          priority: data.priority, // data.priority is now guaranteed by form type
          personality: data.personality,
          recurrence,
        };
        console.log("📝 Reminder data prepared", reminderDataToSave);
        
        let resultData: Reminder | null = null;
        let isUpdate = false;

        if (data.id) {
          console.log("🔄 Updating existing reminder", data.id);
          resultData = await updateReminder(data.id, reminderDataToSave);
          isUpdate = true;
          if (!resultData) {
            throw new Error("Hmm, Amber couldn&apos;t find that reminder to update.");
          }
        } else {
          console.log("➕ Adding new reminder");
          // Add timeout protection
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out after 30 seconds")), 30000)
          );
          resultData = await Promise.race([addReminder(reminderDataToSave), timeoutPromise]) as Reminder;
          console.log("✅ Reminder added successfully", resultData);
        }

        toast({
          title: isUpdate ? "Reminder Updated!" : "Reminder Added!",
          description: "Amber will remember: " + resultData.task,
        });
        console.log("🏠 Navigating to home");
        router.push('/');
      } catch (error: unknown) {
        console.error("❌ Form submission error", error);
        const message = error instanceof Error ? error.message : "Something went a bit sideways. Try again?";
        toast({
          title: "Oh noes!",
          description: message,
          variant: "destructive",
        });
      }
    });
  };
  
  if (isLoadingData && reminderId) {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl text-primary-foreground">Loading Reminder...</CardTitle>
          <CardDescription>Amber is fetching the details for you!</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center max-w-7xl mx-auto">
      <Card className="w-full max-w-xl shadow-xl bg-primary/10 border-primary/30 flex-shrink-0">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-primary-foreground">{reminderId ? "Edit Reminder" : "Add a New Reminder"}</CardTitle>
        <CardDescription className="text-muted-foreground">{reminderId ? "Let&apos;s tweak this for Amber!" : "Tell Amber what you&apos;d like to remember!"}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        {reminderId && <input type="hidden" {...register('id')} value={reminderId} />}
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="task" className="text-primary-foreground font-semibold">Task</Label>
            <Input
              id="task"
              {...register('task')}
              placeholder="e.g., Feed the unicorn"
              className="bg-background"
              data-testid="reminder-form-task"
            />
            {errors.task && <p className="text-sm text-destructive">{errors.task.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="details" className="text-primary-foreground font-semibold">Notes & Extras (Optional)</Label>
            <Textarea
              id="details"
              {...register('details')}
              placeholder="Amber suggests quick bullets: • Bring chopsticks\n• Try the miso soup"
              className="bg-background min-h-[120px]"
              data-testid="reminder-form-details"
            />
            {errors.details && <p className="text-sm text-destructive">{errors.details.message}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-primary-foreground font-semibold">Date</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
                className="bg-background"
                data-testid="reminder-form-date"
              />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-primary-foreground font-semibold">Time</Label>
              <Input
                id="time"
                type="time"
                {...register('time')}
                className="bg-background"
                data-testid="reminder-form-time"
              />
              {errors.time && <p className="text-sm text-destructive">{errors.time.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-primary-foreground font-semibold flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-primary/80" /> Priority
              </Label>
              <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || 'medium'} // ensure value is controlled
                      >
                          <SelectTrigger className="w-full bg-background">
                              <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                      </Select>
                  )}
              />
              {errors.priority && <p className="text-sm text-destructive">{errors.priority.message}</p>}
            </div>

          <div className="space-y-2">
            <Label htmlFor="personality" className="text-primary-foreground font-semibold">Amber&apos;s Mood</Label>
            <Controller
              name="personality"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || DEFAULT_AMBER_PERSONALITY_KEY}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Choose a personality" />
                  </SelectTrigger>
                  <SelectContent>
                    {AMBER_PERSONALITY_OPTIONS.map(option => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Amber can be sweet, sassy, or even over-the-top. Pick her vibe for this reminder.
            </p>
            {errors.personality && <p className="text-sm text-destructive">{errors.personality.message}</p>}
          </div>
        </div>

          <div className="space-y-4 p-4 border rounded-lg bg-background/50">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-primary-foreground font-semibold">Repeat this reminder</Label>
                <p className="text-xs text-muted-foreground">
                  Amber can nudge you on a schedule without re-entering it every time.
                </p>
              </div>
              <Switch
                data-testid="recurrence-toggle"
                checked={Boolean(watchRecurrenceEnabled)}
                onCheckedChange={(checked) => {
                  setValue('recurrenceEnabled', checked, { shouldValidate: true });
                  if (!checked) {
                    setValue('recurrenceFrequency', undefined, { shouldValidate: true });
                    setValue('recurrenceWeeklyDays', [], { shouldValidate: true });
                  } else {
                    setValue('recurrenceFrequency', 'daily', { shouldValidate: true });
                  }
                }}
                aria-label="Toggle recurring reminder"
              />
            </div>

            {watchRecurrenceEnabled && (
              <div className="space-y-4">
                <Controller
                  name="recurrenceFrequency"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="recurrence-frequency" className="text-sm font-semibold text-muted-foreground">
                        How often should Amber repeat this?
                      </Label>
                     <Select
                        onValueChange={(value) => field.onChange(value as RecurrenceFrequency)}
                        value={field.value}
                      >
                        <SelectTrigger
                          id="recurrence-frequency"
                          data-testid="recurrence-frequency-trigger"
                          className="w-full bg-background"
                        >
                          <SelectValue placeholder="Choose frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily" data-testid="recurrence-option-daily">Every day</SelectItem>
                          <SelectItem value="weekdays" data-testid="recurrence-option-weekdays">Weekdays (Mon–Fri)</SelectItem>
                          <SelectItem value="weekly" data-testid="recurrence-option-weekly">Specific days each week</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />

                {watchRecurrenceFrequency === 'weekly' && (
                  <Controller
                    name="recurrenceWeeklyDays"
                    control={control}
                    render={({ field }) => {
                      const selected = field.value || [];
                      const toggleDay = (day: number, checked: boolean) => {
                        const next = checked
                          ? Array.from(new Set([...selected, day]))
                          : selected.filter(value => value !== day);
                        field.onChange(next);
                      };
                      const dayOptions = [
                        { label: 'Sun', value: 0 },
                        { label: 'Mon', value: 1 },
                        { label: 'Tue', value: 2 },
                        { label: 'Wed', value: 3 },
                        { label: 'Thu', value: 4 },
                        { label: 'Fri', value: 5 },
                        { label: 'Sat', value: 6 },
                      ];
                      return (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-muted-foreground">Choose days</Label>
                          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                            {dayOptions.map(option => (
                              <label
                                key={option.value}
                                className={`flex items-center justify-center gap-2 rounded-md border p-2 text-sm ${selected.includes(option.value) ? 'bg-primary/20 border-primary' : 'bg-background border-muted'}`}
                              >
                                <Checkbox
                                  data-testid={`recurrence-day-${option.value}`}
                                  checked={selected.includes(option.value)}
                                  onCheckedChange={(checked) => toggleDay(option.value, Boolean(checked))}
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                )}
              </div>
            )}
          </div>

        </CardContent>
        <CardFooter className="flex justify-end gap-2">
           <Button type="button" variant="outline" onClick={() => router.back()} disabled={isFormProcessing}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isFormProcessing || (isLoadingData && !!reminderId) }
            data-testid="reminder-form-submit"
          >
            {isFormProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {reminderId ? 'Save Changes' : 'Add Reminder'}
          </Button>
        </CardFooter>
      </form>
    </Card>
    
    {/* Illustration Image */}
    <div className="hidden lg:block flex-1 max-w-lg">
      <Image
        src="/add-reminder-illustration.png"
        alt="Honey and Amber planning reminders together"
        width={500}
        height={600}
        className="w-full h-auto rounded-lg opacity-90"
        data-ai-hint="add reminder form illustration"
      />
    </div>
  </div>
  );
}
