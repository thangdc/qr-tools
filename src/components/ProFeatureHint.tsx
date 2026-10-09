import React, { useState } from 'react';
import { ArrowRight, Crown } from 'lucide-react';

interface ProFeatureHintProps {
  title: string;
  description: string;
  source: string;
  onUpgrade: (source?: string) => void;
  imageSrc?: string;
  actionLabel?: string;
  compact?: boolean;
}

/**
 * Consistent, contextual upgrade hint for features included in QR Tools Pro.
 * Compact hints sit beside the relevant control; expanded hints explain the benefit
 * before opening the existing Pro upgrade flow.
 */
export const ProFeatureHint: React.FC<ProFeatureHintProps> = ({
  title,
  description,
  source,
  onUpgrade,
  imageSrc,
  actionLabel = 'Nâng cấp Pro',
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (compact) {
    return (
      <div className="relative inline-flex align-middle">
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-800 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          title={title}
        >
          <Crown className="h-3 w-3" aria-hidden="true" />
          PRO
        </button>
        {isExpanded && (
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-neutral-200 bg-white p-3.5 text-left shadow-xl">
            <p className="text-xs font-semibold text-neutral-900">{title}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-600">{description}</p>
            <button
              type="button"
              onClick={() => onUpgrade(source)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
            >
              {actionLabel}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
      {imageSrc ? (
        <img src={imageSrc} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-1" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700">
          <Crown className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-neutral-900">{title}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-neutral-600">{description}</p>
        <button
          type="button"
          onClick={() => onUpgrade(source)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 focus-visible:ring-offset-2"
        >
          {actionLabel}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
