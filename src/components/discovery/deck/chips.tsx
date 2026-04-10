interface ChipsProps {
  label: string;
  items: string[];
}

export function Chips({ label, items }: ChipsProps) {
  return (
    <div className="flex gap-1.5 mb-2 items-center flex-wrap">
      <div className="text-xs font-medium text-content-secondary min-w-[75px]">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {(items || []).map((x, i) => (
          <span
            key={i}
            className="text-xs px-2 py-0.5 rounded-full bg-surface-subtle text-content-secondary"
          >
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}
