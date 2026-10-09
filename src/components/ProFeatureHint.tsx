import React from 'react';
import { Crown, ArrowRight } from 'lucide-react';

interface ProFeatureHintProps {
  title: string;
  description: string;
  source: string;
  onUpgrade: (source?: string) => void;
  imageSrc?: string;
  actionLabel?: string;
}

/**
 * Consistent, contextual upgrade hint for features included in QR Tools Pro.
 * Keep the hint informative and non-blocking; feature access is enforced by its owning workflow.
 */
export const ProFeatureHint: React.FC<ProFeatureHintProps> = ({
  title,
  description,
  source,
  onUpgrade,
  imageSrc,
  actionLabel = 'Nâng cấp Pro',
}) => (
  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
    {imageSrc ? (
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-1"
      />
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
