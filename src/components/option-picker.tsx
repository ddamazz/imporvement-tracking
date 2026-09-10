"use client";

/**
 * A labelled row of mutually exclusive chips. Used for priority, effort and
 * status in the editor, where a dropdown would hide the scale.
 */
export function OptionPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  renderOption,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  renderOption: (option: T) => React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={`rounded-md p-0.5 transition ${
                selected
                  ? "ring-2 ring-accent"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {renderOption(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
