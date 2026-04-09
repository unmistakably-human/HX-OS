interface ChipsProps {
  label: string;
  items: string[];
}

export function Chips({ label, items }: ChipsProps) {
  return (
    <div className="flex gap-1.5 mb-2 items-center flex-wrap">
      <div className="text-[11px] font-medium text-[#6b7280] min-w-[75px]">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {(items || []).map((x, i) => (
          <span
            key={i}
            className="text-[11px] px-2 py-0.5 rounded-md bg-[#f4f4f5] text-[#6b7280]"
          >
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}
