"use client";

import { Check, CheckCircle2 } from "lucide-react";
import {
  EFFORTS,
  EFFORT_META,
  PRIORITIES,
  PRIORITY_META,
  STATUSES,
  STATUS_META,
  type Effort,
  type Priority,
  type Status,
} from "@/lib/constants";
import { EffortChip, PriorityChip, StatusChip } from "./chip";
import { Popover } from "./popover";

/**
 * A chip that doubles as its own picker, so priority/effort/status can be
 * changed straight from a list row without opening the issue.
 */
function ChipMenu<T extends string>({
  label,
  value,
  options,
  labelOf,
  renderChip,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labelOf: (option: T) => string;
  renderChip: (option: T) => React.ReactNode;
  onChange: (value: T) => void;
}) {
  return (
    <Popover
      align="right"
      minWidth="min-w-0"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          aria-label={`${label}: ${labelOf(value)} \u2014 change`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={toggle}
          className={`inline-flex rounded-md transition hover:ring-2 hover:ring-accent/40 ${
            open ? "ring-2 ring-accent" : ""
          }`}
        >
          {renderChip(value)}
        </button>
      )}
    >
      {({ close }) => (
        <>
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted">
            {label}
          </p>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                close();
                if (option !== value) onChange(option);
              }}
              className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-surface-3"
            >
              <span className="grid w-3.5 shrink-0 place-items-center">
                {option === value ? <Check size={13} /> : null}
              </span>
              {renderChip(option)}
            </button>
          ))}
        </>
      )}
    </Popover>
  );
}

export function PriorityChipMenu({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (value: Priority) => void;
}) {
  return (
    <ChipMenu
      label="Priority"
      value={value}
      options={PRIORITIES}
      labelOf={(option) => PRIORITY_META[option].label}
      renderChip={(option) => <PriorityChip value={option} />}
      onChange={onChange}
    />
  );
}

export function EffortChipMenu({
  value,
  onChange,
}: {
  value: Effort;
  onChange: (value: Effort) => void;
}) {
  return (
    <ChipMenu
      label="Effort"
      value={value}
      options={EFFORTS}
      labelOf={(option) => EFFORT_META[option].label}
      renderChip={(option) => <EffortChip value={option} />}
      onChange={onChange}
    />
  );
}

export function StatusChipMenu({
  value,
  onChange,
}: {
  value: Status;
  onChange: (value: Status) => void;
}) {
  return (
    <ChipMenu
      label="Status"
      value={value}
      options={STATUSES}
      labelOf={(option) => STATUS_META[option].label}
      renderChip={(option) => <StatusChip value={option} />}
      onChange={onChange}
    />
  );
}

/**
 * The client's approval: marked issues are the ones cleared to be fixed first.
 * Sized like the chips beside it so the row's columns stay aligned.
 */
export function MarkButton({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={value}
      title={value ? "Marked \u2014 click to unmark" : "Mark as approved"}
      onClick={() => onChange(!value)}
      className={`inline-flex w-[82px] items-center justify-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap ring-1 ring-inset transition ${
        value
          ? "bg-emerald-100 text-emerald-700 ring-emerald-500/30 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/30"
          : "bg-transparent text-muted ring-line hover:text-text"
      }`}
    >
      <CheckCircle2 size={12} />
      {value ? "Marked" : "Mark"}
    </button>
  );
}
