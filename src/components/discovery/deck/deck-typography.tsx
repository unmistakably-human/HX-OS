interface TypoProps {
  t: string;
}

export function DeckLabel({ t }: TypoProps) {
  return (
    <div className="text-xs tracking-wide uppercase text-content-muted mb-1">
      {t}
    </div>
  );
}

export function DeckHeading({ t }: TypoProps) {
  return (
    <div className="text-xl font-medium text-content-heading mb-3 leading-snug">
      {t}
    </div>
  );
}

export function DeckSubheading({ t }: TypoProps) {
  return (
    <div className="text-sm font-medium text-content-heading mt-3 mb-2 pb-1 border-b border-divider-light">
      {t}
    </div>
  );
}
