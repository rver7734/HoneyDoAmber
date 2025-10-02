import type { ElementType } from 'react';
import Image from 'next/image';
import { CustomPawIcon } from '@/components/icons/custom-paw-icon';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: ElementType;
  action?: React.ReactNode;
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageDataAiHint?: string;
}

export function EmptyState({
  title = "It's a bit quiet here...",
  message = "Amber thinks it's a great time to plan something fun or important!",
  icon: IconComponent = CustomPawIcon,
  action,
  imageUrl,
  imageAlt = "Empty state illustration",
  imageWidth = 100,
  imageHeight = 100,
  imageDataAiHint,
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-between p-8 rounded-lg border-2 border-dashed border-border bg-muted/20 shadow-sm min-h-[400px]">
      {/* Left side - Text content */}
      <div className="flex flex-col text-left max-w-md">
        {!imageUrl && (
          <IconComponent className="w-16 h-16 text-primary mb-6 opacity-70" />
        )}
        <h2 className="text-3xl font-headline font-semibold text-foreground mb-4">{title}</h2>
        <p className="text-muted-foreground mb-6 text-lg leading-relaxed">{message}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
      
      {/* Right side - Large image */}
      {imageUrl && (
        <div className="flex-shrink-0 ml-8">
          <Image
            src={imageUrl}
            alt={imageAlt}
            width={imageWidth * 2.5}
            height={imageHeight * 2.5}
            className="opacity-90 rounded-lg"
            data-ai-hint={imageDataAiHint}
          />
        </div>
      )}
    </div>
  );
}
