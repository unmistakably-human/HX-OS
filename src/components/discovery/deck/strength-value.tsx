interface StrengthValueProps {
  value: string;
}

export function StrengthValue({ value }: StrengthValueProps) {
  if (!value) return null;
  const lo = value.toLowerCase();
  const bad = lo === "none" || lo === "n/a";
  const good = lo === "strong" || lo.includes("strong");
  return (
    <span
      className={
        bad
          ? "text-red-700 font-medium"
          : good
            ? "text-emerald-700 font-medium"
            : "text-[#111827]"
      }
    >
      {value}
    </span>
  );
}
