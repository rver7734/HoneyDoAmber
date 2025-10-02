
"use client";

import React, { useState, useTransition, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Added for custom icon
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { parseSmartInputAction } from '@/app/actions';
import { useReminders } from '@/context/reminders-context'; 

interface CustomSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface CustomSpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface CustomSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: CustomSpeechRecognition, ev: CustomSpeechRecognitionEvent) => void) | null;
  onerror: ((this: CustomSpeechRecognition, ev: CustomSpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: CustomSpeechRecognition, ev: Event) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => CustomSpeechRecognition;

export function SmartInputBar() {
  const [inputValue, setInputValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const { defaultReminderTime, defaultPersonality } = useReminders(); 

  const [isRecording, setIsRecording] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<CustomSpeechRecognition | null>(null);
  const [supportsSpeechRecognition, setSupportsSpeechRecognition] = useState(true);

  const speechInputRef = useRef(''); 
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null); 

  const processAndSubmitInput = useCallback(async (textToSubmit: string) => {
    if (isPending) return;
    if (!textToSubmit.trim()) {
      return;
    }

    if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
    }

    startTransition(async () => {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

      const result = await parseSmartInputAction(textToSubmit, defaultReminderTime, currentDate, currentTime, defaultPersonality);
      if (result.success && result.data) {
        toast({
          title: result.fallback ? 'Amber guessed the basics' : 'Amber got it!',
          description: result.fallback
            ? result.warning || 'She used your defaults—double-check the details before saving.'
            : "Let's fill in the details for your new reminder.",
        });
        const params = new URLSearchParams({
          task: result.data.task,
          date: result.data.date,
          time: result.data.time,
        });

        const detailLines: string[] = [];
        if (result.data.notes?.length) {
          detailLines.push(...result.data.notes.map(note => `• ${note}`));
        }
        if (result.data.location) {
          detailLines.push(`• Location: ${result.data.location}`);
        }
        if (result.data.amberInsight) {
          detailLines.push(`• Amber says: ${result.data.amberInsight}`);
        }
        if (detailLines.length) {
          params.set('details', detailLines.join('\n'));
        }
        if (result.data.priority) {
          params.set('priority', result.data.priority);
        }
        if (result.data.personality) {
          params.set('personality', result.data.personality);
        } else if (defaultPersonality) {
          params.set('personality', defaultPersonality);
        }

        router.push(`/add?${params.toString()}`);
        setInputValue('');
        speechInputRef.current = '';
      } else {
        toast({
          title: "Uh oh!",
          description: result.error || "Amber had a little trouble understanding. Could you try again?",
          variant: "destructive",
        });
      }
    });
  }, [isPending, router, toast, startTransition, defaultReminderTime, defaultPersonality]);


  const handleSpeechResult = useCallback((event: CustomSpeechRecognitionEvent) => {
    let interimTranscript = '';
    let finalTranscript = '';
    let isFinalResultInEvent = false;

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
        isFinalResultInEvent = true;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    const currentDisplayValue = finalTranscript || interimTranscript;
    setInputValue(currentDisplayValue);
    speechInputRef.current = currentDisplayValue;

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    if (isFinalResultInEvent && finalTranscript.trim()) {
      speechTimeoutRef.current = setTimeout(() => {
        if (speechInputRef.current.trim()) {
          processAndSubmitInput(speechInputRef.current);
        }
        speechTimeoutRef.current = null; 
      }, 3000);
    }
  }, [processAndSubmitInput]);

  const handleSpeechError = useCallback((event: CustomSpeechRecognitionErrorEvent) => {
    console.error('Speech recognition error', event.error);
    let errorMessage = "Amber had trouble hearing that. Try again?";
    if (event.error === 'no-speech') {
      errorMessage = "Amber didn&apos;t hear anything. Is your mic on and ready?";
    } else if (event.error === 'audio-capture') {
      errorMessage = "Amber can't access the microphone. Please check permissions!";
    } else if (event.error === 'not-allowed') {
      errorMessage = "Mic permission denied. Amber can't listen without it! Please enable microphone access in your browser settings.";
    }
    toast({
      title: "Oops!",
      description: errorMessage,
      variant: "destructive",
    });
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }
    setIsRecording(false);
  }, [toast]);

  const handleSpeechEnd = useCallback(() => {
    setIsRecording(false);
  }, []);
  
  useEffect(() => {
    if (typeof window === 'undefined') {
      setSupportsSpeechRecognition(false);
      return;
    }
    const globalWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionAPI = globalWindow.SpeechRecognition || globalWindow.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = false; 
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = handleSpeechResult;
      recognitionInstance.onerror = handleSpeechError;
      recognitionInstance.onend = handleSpeechEnd;
      
      setSpeechRecognition(recognitionInstance);
      setSupportsSpeechRecognition(true);
    } else {
      setSupportsSpeechRecognition(false);
    }

    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      if(speechRecognition){ 
        speechRecognition.onresult = null;
        speechRecognition.onerror = null;
        speechRecognition.onend = null;
        speechRecognition.stop(); 
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [handleSpeechResult, handleSpeechError, handleSpeechEnd]); 


  const handleToggleRecording = () => {
    if (!supportsSpeechRecognition || !speechRecognition) {
      toast({
        title: "Amber can&apos;t hear you right now :(",
        description: "Voice input isn&apos;t supported by your browser, or it&apos;s still initializing. Try again in a moment.",
      });
      return;
    }

    if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
    }

    if (isRecording) {
      speechRecognition.stop(); 
    } else {
      try {
        setInputValue(''); 
        speechInputRef.current = '';
        speechRecognition.start();
        setIsRecording(true);
      } catch (error: unknown) {
        console.error("Error starting speech recognition:", error);
        toast({
          title: "Hmm...",
          description: "Could not start voice input. Is your microphone ready and not in use by another app?",
          variant: "destructive",
        });
        setIsRecording(false);
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRecording && speechRecognition) {
        speechRecognition.stop(); 
    }
    if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
    }
    if (!inputValue.trim()) {
      toast({
        title: "Amber&apos;s waiting...",
        description: "Please type or say what you&apos;d like to remember!",
        variant: "destructive",
      });
      return;
    }
    await processAndSubmitInput(inputValue);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex gap-2 items-center p-4 bg-primary/20 rounded-lg shadow-md mb-6"
      aria-busy={isPending}
    >
      <Sparkles className="text-primary h-6 w-6 flex-shrink-0" />
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => {
            setInputValue(e.target.value);
            speechInputRef.current = e.target.value; 
            if (speechTimeoutRef.current) { 
                clearTimeout(speechTimeoutRef.current);
                speechTimeoutRef.current = null;
            }
        }}
        placeholder="Amber, remind me to..."
        className="flex-grow bg-background focus:ring-accent"
        aria-label="Smart reminder input"
        disabled={isPending}
        data-testid="smart-input-field"
      />
      {supportsSpeechRecognition && (
        <Button
          type="button"
          onClick={handleToggleRecording}
          disabled={isPending || (!speechRecognition && supportsSpeechRecognition) }
          variant="outline"
          size="lg"
          className={`h-12 w-12 p-0 rounded-full border-2 ${isRecording ? "bg-red-500 hover:bg-red-600 text-white animate-pulse border-red-700" : "hover:bg-accent/40 border-primary/40"}`}
          aria-label={isRecording ? "Stop recording" : "Start voice input"}
        >
          <Image 
            src="/microphoneicon.png" 
            alt={isRecording ? "Microphone on" : "Microphone off"}
            width={24} 
            height={24}
            className={isRecording ? '' : 'filter invert'}
            data-ai-hint="microphone icon"
          />
        </Button>
      )}
      <Button
        type="submit"
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
        disabled={isPending}
        data-testid="smart-input-submit"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Thinking...
          </>
        ) : (
          "Add Reminder"
        )}
      </Button>
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-background/80 text-muted-foreground pointer-events-none">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Amber is working her magic…</span>
        </div>
      )}
    </form>
  );
}
