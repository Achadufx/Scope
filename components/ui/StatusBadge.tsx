"use client";

import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ShieldAlert, Clock } from "lucide-react";

export type StatusVariant =
  | "ALLOW"
  | "ALLOWED"
  | "SUCCESS"
  | "ACTIVE"
  | "BLOCK"
  | "BLOCKED"
  | "REVERTED"
  | "REVERT"
  | "LIMIT_EXCEEDED"
  | "RECIPIENT_NOT_ALLOWED"
  | "CONTRACT_NOT_ALLOWED"
  | "TARGET_NOT_ALLOWED"
  | "OUTCOME_VIOLATION"
  | "TIME_WINDOW_VIOLATION"
  | "EXPIRED"
  | "PENDING"
  | "SIMULATING"
  | "PAUSED";

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

export default function StatusBadge({
  status,
  label,
  size = "md",
  showIcon = true,
  className = "",
}: StatusBadgeProps) {
  const norm = (status || "").toUpperCase();

  const isSuccess =
    norm === "ALLOW" || norm === "ALLOWED" || norm === "SUCCESS" || norm === "ACTIVE";

  const isDanger =
    norm === "BLOCK" ||
    norm === "BLOCKED" ||
    norm === "REVERTED" ||
    norm === "REVERT" ||
    norm === "LIMIT_EXCEEDED" ||
    norm === "RECIPIENT_NOT_ALLOWED" ||
    norm === "CONTRACT_NOT_ALLOWED" ||
    norm === "TARGET_NOT_ALLOWED" ||
    norm === "OUTCOME_VIOLATION" ||
    norm === "TIME_WINDOW_VIOLATION";

  const isWarning = norm === "EXPIRED" || norm === "PAUSED";
  const isInfo = norm === "PENDING" || norm === "SIMULATING";

  let styles = "bg-background border-border text-secondary";
  let dotColor = "bg-secondary";
  let defaultLabel = norm;

  if (isSuccess) {
    styles = "bg-success-surface border-success-border text-success";
    dotColor = "bg-success";
    if (!label) defaultLabel = norm === "ACTIVE" ? "ACTIVE" : "ALLOWED";
  } else if (isDanger) {
    styles = "bg-danger-surface border-danger-border text-danger";
    dotColor = "bg-danger";
    if (!label) {
      if (norm === "REVERTED" || norm === "REVERT") defaultLabel = "REVERTED";
      else if (norm === "RECIPIENT_NOT_ALLOWED") defaultLabel = "RECIPIENT BLOCKED";
      else if (norm === "LIMIT_EXCEEDED") defaultLabel = "LIMIT EXCEEDED";
      else if (norm === "CONTRACT_NOT_ALLOWED" || norm === "TARGET_NOT_ALLOWED") defaultLabel = "TARGET BLOCKED";
      else if (norm === "OUTCOME_VIOLATION") defaultLabel = "OUTCOME FAILED";
      else if (norm === "TIME_WINDOW_VIOLATION") defaultLabel = "OFF-HOURS REVERT";
      else defaultLabel = "BLOCKED";
    }
  } else if (isWarning) {
    styles = "bg-warning-surface border-warning-border text-warning";
    dotColor = "bg-warning";
  } else if (isInfo) {
    styles = "bg-accent-light border-accent/30 text-accent";
    dotColor = "bg-accent";
  }

  const padding = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-mono font-medium tracking-tight whitespace-nowrap ${styles} ${padding} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${isInfo ? "animate-pulse" : ""}`} />
      <span>{label || defaultLabel}</span>
    </span>
  );
}
