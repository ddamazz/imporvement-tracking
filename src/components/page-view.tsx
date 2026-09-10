"use client";

import {
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import {
  Check,
  Columns3,
  ListIcon,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { IssueWithImages, Page } from "@/db/schema";
import {
  PAGE_EMOJI_CHOICES,
  PRIORITIES,
  PRIORITY_META,
  PRIORITY_WEIGHT,
  STATUSES,
  STATUS_META,
  type Effort,
  type Priority,
  type Status,
} from "@/lib/constants";
import { reorderIssues, updateIssueFields, updatePage } from "@/lib/actions";
import { IssueBoard, type GroupBy } from "./issue-board";
import { IssueEditor } from "./issue-editor";
import { IssueList } from "./issue-list";
import { Lightbox } from "./lightbox";
import { MenuItem, Popover } from "./popover";

type ViewMode = "list" | "board";
type SortMode = "manual" | "priority" | "newest";
type Prefs = { view: ViewMode; sort: SortMode; groupBy: GroupBy };

const PREFS_KEY = "trakker:view-prefs";
const DEFAULT_PREFS: Prefs = {
  view: "list",
  sort: "manual",
  groupBy: "status",
};

type Editing = { mode: "new" } | { mode: "edit"; issue: IssueWithImages };

type OptimisticChange =
  | { type: "reorder"; orderedIds: string[] }
  | {
      type: "patch";
      id: string;
      patch: { status?: Status; priority?: Priority; effort?: Effort };
    };

function applyChange(
  state: IssueWithImages[],
  change: OptimisticChange,
): IssueWithImages[] {
  if (change.type === "patch") {
    return state.map((issue) =>
      issue.id === change.id ? { ...issue, ...change.patch } : issue,
    );
  }
  const byId = new Map(state.map((issue) => [issue.id, issue]));
  return change.orderedIds
    .map((id) => byId.get(id))
    .filter((issue): issue is IssueWithImages => Boolean(issue));
}

export function PageView({
  page,
  issues,
}: {
  page: Page;
  issues: IssueWithImages[];
}) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const { view, sort, groupBy } = prefs;
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>([]);
  const [statusFilter, setStatusFilter] = useState<Status[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Drags show their result immediately, then defer to the server's data once
  // the action and its revalidation land.
  const [order, applyOptimistic] = useOptimistic(issues, applyChange);

  // Per-browser conveniences. Read on mount rather than during render, so the
  // server and first client render stay identical.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external store
        setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) });
      }
    } catch {
      // Unreadable or blocked storage: keep the defaults.
    }
  }, []);

  function updatePrefs(patch: Partial<Prefs>) {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // Blocked storage just means preferences don't persist.
      }
      return next;
    });
  }

  const visible = useMemo(() => {
    const filtered = order.filter(
      (issue) =>
        (priorityFilter.length === 0 ||
          priorityFilter.includes(issue.priority)) &&
        (statusFilter.length === 0 || statusFilter.includes(issue.status)),
    );

    if (sort === "priority") {
      return [...filtered].sort(
        (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority],
      );
    }
    if (sort === "newest") {
      return [...filtered].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return filtered;
  }, [order, priorityFilter, statusFilter, sort]);

  const filterCount = priorityFilter.length + statusFilter.length;
  // Reordering a filtered or re-sorted subset would write a misleading order.
  const canSort = sort === "manual" && filterCount === 0;

  function handleReorder(orderedIds: string[]) {
    startTransition(async () => {
      applyOptimistic({ type: "reorder", orderedIds });
      await reorderIssues(page.id, orderedIds);
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeading page={page} count={order.length} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Segmented
          value={view}
          onChange={(value) => updatePrefs({ view: value })}
          options={[
            { value: "list", label: "List", icon: <ListIcon size={13} /> },
            { value: "board", label: "Board", icon: <Columns3 size={13} /> },
          ]}
        />

        {view === "list" ? (
          <Dropdown
            label={
              sort === "manual"
                ? "Manual order"
                : sort === "priority"
                  ? "By priority"
                  : "Newest first"
            }
            value={sort}
            options={[
              { value: "manual", label: "Manual order" },
              { value: "priority", label: "By priority" },
              { value: "newest", label: "Newest first" },
            ]}
            onChange={(value) => updatePrefs({ sort: value })}
          />
        ) : (
          <Dropdown
            label={groupBy === "status" ? "Group: Status" : "Group: Priority"}
            value={groupBy}
            options={[
              { value: "status", label: "Group: Status" },
              { value: "priority", label: "Group: Priority" },
            ]}
            onChange={(value) => updatePrefs({ groupBy: value })}
          />
        )}

        <FilterMenu
          priorityFilter={priorityFilter}
          statusFilter={statusFilter}
          onTogglePriority={(value) =>
            setPriorityFilter((current) =>
              current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value],
            )
          }
          onToggleStatus={(value) =>
            setStatusFilter((current) =>
              current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value],
            )
          }
          onClear={() => {
            setPriorityFilter([]);
            setStatusFilter([]);
          }}
          count={filterCount}
        />

        <button
          type="button"
          onClick={() => setEditing({ mode: "new" })}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-2.5 text-sm font-medium text-accent-contrast transition hover:opacity-90"
        >
          <Plus size={14} />
          New issue
        </button>
      </div>

      <div className="mt-4">
        {order.length === 0 ? (
          <EmptyState onCreate={() => setEditing({ mode: "new" })} />
        ) : visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
            No issues match the current filters.
          </p>
        ) : view === "list" ? (
          <IssueList
            issues={visible}
            sortable={canSort}
            onOpen={(issue) => setEditing({ mode: "edit", issue })}
            onPreview={setPreview}
            onReorder={handleReorder}
          />
        ) : (
          <IssueBoard
            issues={visible}
            groupBy={groupBy}
            onOpen={(issue) => setEditing({ mode: "edit", issue })}
            onPreview={setPreview}
            onMove={({ id, patch, orderedIds }) => {
              startTransition(async () => {
                if (patch) applyOptimistic({ type: "patch", id, patch });
                if (orderedIds) applyOptimistic({ type: "reorder", orderedIds });
                if (patch) await updateIssueFields(id, patch);
                if (orderedIds) await reorderIssues(page.id, orderedIds);
              });
            }}
          />
        )}
      </div>

      {editing ? (
        <IssueEditor
          pageId={page.id}
          issue={editing.mode === "edit" ? editing.issue : null}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {preview ? (
        <Lightbox url={preview} onClose={() => setPreview(null)} />
      ) : null}
    </div>
  );
}

function PageHeading({ page, count }: { page: Page; count: number }) {
  // `null` means "not editing", so the heading always shows the server title.
  const [draft, setDraft] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function commit() {
    const trimmed = draft?.trim();
    setDraft(null);
    if (trimmed && trimmed !== page.title) {
      startTransition(() => updatePage(page.id, { title: trimmed }));
    }
  }

  return (
    <div className="flex items-start gap-3">
      <Popover
        align="left"
        trigger={({ toggle }) => (
          <button
            type="button"
            aria-label="Change page icon"
            onClick={toggle}
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg text-2xl hover:bg-surface-3"
          >
            {page.emoji ?? "📄"}
          </button>
        )}
      >
        {({ close }) => (
          <div className="grid grid-cols-8 gap-0.5 p-0.5">
            {PAGE_EMOJI_CHOICES.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  close();
                  startTransition(() => updatePage(page.id, { emoji }));
                }}
                className="grid size-7 place-items-center rounded text-base hover:bg-surface-3"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </Popover>

      <div className="min-w-0 flex-1">
        {draft !== null ? (
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") setDraft(null);
            }}
            className="w-full rounded-md border border-accent bg-bg px-1.5 py-0.5 text-2xl font-semibold tracking-tight outline-none"
          />
        ) : (
          <h1
            onClick={() => setDraft(page.title)}
            className="cursor-text truncate rounded-md px-1.5 py-0.5 text-2xl font-semibold tracking-tight hover:bg-surface-3"
            title="Click to rename"
          >
            {page.title}
          </h1>
        )}
        <p className="px-1.5 text-xs text-muted">
          {count} {count === 1 ? "issue" : "issues"}
        </p>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon: React.ReactNode }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-line p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition ${
            value === option.value
              ? "bg-surface-3 text-text"
              : "text-muted hover:text-text"
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <Popover
      align="left"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium text-muted hover:text-text"
        >
          {label}
        </button>
      )}
    >
      {({ close }) => (
        <>
          {options.map((option) => (
            <MenuItem
              key={option.value}
              onClick={() => {
                onChange(option.value);
                close();
              }}
            >
              <span className="grid w-3.5 place-items-center">
                {value === option.value ? <Check size={13} /> : null}
              </span>
              {option.label}
            </MenuItem>
          ))}
        </>
      )}
    </Popover>
  );
}

function FilterMenu({
  priorityFilter,
  statusFilter,
  onTogglePriority,
  onToggleStatus,
  onClear,
  count,
}: {
  priorityFilter: Priority[];
  statusFilter: Status[];
  onTogglePriority: (value: Priority) => void;
  onToggleStatus: (value: Status) => void;
  onClear: () => void;
  count: number;
}) {
  return (
    <Popover
      align="left"
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition ${
            count > 0
              ? "border-accent text-accent"
              : "border-line text-muted hover:text-text"
          }`}
        >
          <SlidersHorizontal size={13} />
          Filter
          {count > 0 ? (
            <span className="rounded bg-accent px-1 text-[10px] text-accent-contrast">
              {count}
            </span>
          ) : null}
        </button>
      )}
    >
      {() => (
        <div className="w-48">
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted">
            Priority
          </p>
          {PRIORITIES.map((value) => (
            <CheckRow
              key={value}
              label={PRIORITY_META[value].label}
              dot={PRIORITY_META[value].dot}
              checked={priorityFilter.includes(value)}
              onClick={() => onTogglePriority(value)}
            />
          ))}
          <div className="my-1 h-px bg-line" />
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted">
            Status
          </p>
          {STATUSES.map((value) => (
            <CheckRow
              key={value}
              label={STATUS_META[value].label}
              dot={STATUS_META[value].dot}
              checked={statusFilter.includes(value)}
              onClick={() => onToggleStatus(value)}
            />
          ))}
          {count > 0 ? (
            <>
              <div className="my-1 h-px bg-line" />
              <MenuItem onClick={onClear}>
                <X size={13} />
                Clear filters
              </MenuItem>
            </>
          ) : null}
        </div>
      )}
    </Popover>
  );
}

function CheckRow({
  label,
  dot,
  checked,
  onClick,
}: {
  label: string;
  dot: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-3"
    >
      <span className="grid w-3.5 place-items-center">
        {checked ? <Check size={13} /> : null}
      </span>
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-14 text-center">
      <p className="text-sm font-medium">No issues on this page yet</p>
      <p className="mx-auto mt-1 max-w-xs text-xs text-muted">
        Add what you find as you audit — a screenshot, how bad it is, and how
        much work it looks like.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-accent-contrast transition hover:opacity-90"
      >
        <Plus size={14} />
        Add the first issue
      </button>
    </div>
  );
}
