export const PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const EFFORTS = ["trivial", "small", "medium", "large"] as const;
export const STATUSES = ["open", "in_progress", "done"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type Effort = (typeof EFFORTS)[number];
export type Status = (typeof STATUSES)[number];

type Meta = {
  label: string;
  /** Tailwind classes for the chip surface. */
  chip: string;
  /** Tailwind classes for the small leading dot/indicator. */
  dot: string;
};

export const PRIORITY_META: Record<Priority, Meta> = {
  low: {
    label: "Low",
    chip: "bg-slate-100 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  medium: {
    label: "Medium",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  high: {
    label: "High",
    chip: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  critical: {
    label: "Critical",
    chip: "bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300",
    dot: "bg-red-500",
  },
};

export const EFFORT_META: Record<Effort, Meta & { bars: number }> = {
  trivial: {
    label: "Trivial",
    bars: 1,
    chip: "bg-transparent text-muted ring-1 ring-inset ring-line",
    dot: "bg-emerald-500",
  },
  small: {
    label: "Small",
    bars: 2,
    chip: "bg-transparent text-muted ring-1 ring-inset ring-line",
    dot: "bg-emerald-500",
  },
  medium: {
    label: "Medium",
    bars: 3,
    chip: "bg-transparent text-muted ring-1 ring-inset ring-line",
    dot: "bg-emerald-500",
  },
  large: {
    label: "Large",
    bars: 4,
    chip: "bg-transparent text-muted ring-1 ring-inset ring-line",
    dot: "bg-emerald-500",
  },
};

export const STATUS_META: Record<Status, Meta> = {
  open: {
    label: "Open",
    chip: "bg-transparent text-muted ring-1 ring-inset ring-line",
    dot: "bg-zinc-400",
  },
  in_progress: {
    label: "In progress",
    chip: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  done: {
    label: "Done",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

/** Higher sorts first when ordering by priority. */
export const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function isPriority(value: unknown): value is Priority {
  return PRIORITIES.includes(value as Priority);
}

export function isEffort(value: unknown): value is Effort {
  return EFFORTS.includes(value as Effort);
}

export function isStatus(value: unknown): value is Status {
  return STATUSES.includes(value as Status);
}

export const PAGE_EMOJI_CHOICES = [
  "📄",
  "🏠",
  "🗂️",
  "🧭",
  "🛒",
  "👤",
  "⚙️",
  "📱",
  "💳",
  "🔍",
  "📊",
  "✉️",
  "🔐",
  "🐛",
  "✨",
  "🎯",
];
