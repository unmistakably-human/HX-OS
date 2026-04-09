interface TypoProps {
  t: string;
}

export function DeckLabel({ t }: TypoProps) {
  return (
    <div className="text-[10px] tracking-wide uppercase text-[#9ca3af] mb-1">
      {t}
    </div>
  );
}

export function DeckHeading({ t }: TypoProps) {
  return (
    <div className="text-[18px] font-medium text-[#111827] mb-3 leading-snug">
      {t}
    </div>
  );
}

export function DeckSubheading({ t }: TypoProps) {
  return (
    <div className="text-[13px] font-medium text-[#111827] mt-3 mb-2 pb-1 border-b border-[#f3f4f6]">
      {t}
    </div>
  );
}
