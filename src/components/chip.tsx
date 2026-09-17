import {
  EFFORT_META,
  PRIORITY_META,
  STATUS_META,
  type Effort,
  type Priority,
  type Status,
} from "@/lib/constants";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap";

/** Fixed per-category widths keep priority/effort/status stacked in tidy
 *  columns across rows instead of each chip hugging its own label width. */
const PRIORITY_WIDTH = "w-[84px]";
const EFFORT_WIDTH = "w-[88px]";
const STATUS_WIDTH = "w-[104px]";

export function PriorityChip({ value }: { value: Priority }) {
  const meta = PRIORITY_META[value];
  return (
    <span className={`${BASE} ${PRIORITY_WIDTH} ${meta.chip}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function StatusChip({ value }: { value: Status }) {
  const meta = STATUS_META[value];
  return (
    <span className={`${BASE} ${STATUS_WIDTH} ${meta.chip}`}>
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

/** Effort reads as a gauge so it never gets confused with priority. */
export function EffortChip({ value }: { value: Effort }) {
  const meta = EFFORT_META[value];
  return (
    <span
      className={`${BASE} ${EFFORT_WIDTH} ${meta.chip}`}
      title={`Effort: ${meta.label}`}
    >
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={`w-[3px] rounded-[1px] ${
              step <= meta.bars ? "bg-current" : "bg-current/25"
            }`}
            style={{ height: `${3 + step * 2}px` }}
          />
        ))}
      </span>
      {meta.label}
    </span>
  );
}
