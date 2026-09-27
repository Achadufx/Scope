"use client";

import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-border bg-surface/50 ${className}`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-secondary mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <p className="mt-1 text-xs text-secondary max-w-sm leading-relaxed">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-background transition-colors shadow-subtle"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
