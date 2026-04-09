interface TypoProps {
  t: string;
}

export function DeckLabel({ t }: TypoProps) {
  return (
    <div className="text-[10px] tracking-wide uppercase text-content-muted mb-1">
      {t}
    </div>
  );
}

export function DeckHeading({ t }: TypoProps) {
  return (
    <div className="text-[18px] font-medium text-content-heading mb-3 leading-snug">
      {t}
    </div>
  );
}

export function DeckSubheading({ t }: TypoProps) {
  return (
    <div className="text-[13px] font-medium text-content-heading mt-3 mb-2 pb-1 border-b border-divider-light">
      {t}
    </div>
  );
}
