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
    <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/20 shadow-sm px-8 py-12 min-h-[320px]">
      {imageUrl && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center md:justify-end opacity-15">
          <Image
            src={imageUrl}
            alt={imageAlt}
            width={imageWidth * 2}
            height={imageHeight * 2}
            className="max-w-[360px] w-full h-auto"
            data-ai-hint={imageDataAiHint}
            priority={false}
          />
        </div>
      )}

      {/* Text content */}
      <div className="relative flex flex-col text-left max-w-xl">
        {!imageUrl && (
          <IconComponent className="w-16 h-16 text-primary mb-6 opacity-70" />
        )}
        <h2 className="text-3xl font-headline font-semibold text-foreground mb-4 drop-shadow-sm">
          {title}
        </h2>
        <p className="text-muted-foreground mb-6 text-lg leading-relaxed drop-shadow-sm">
          {message}
        </p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
