// Per-brand pastel cover, lifted out of the v3 slide deck so v4 can reuse it
// at the top of the long-scroll page. The pastel palette stays — the
// in-scope/KPI tiles in the v4 hero render below the cover, not on it.

interface PastelCoverProps {
  title: string;
  subtitle: string;
}

export function PastelCover({ title, subtitle }: PastelCoverProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        minHeight: 460,
        background: "linear-gradient(135deg, #ffffff 0%, #fbf5f0 45%, #f6e6e3 100%)",
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: "linear-gradient(90deg, #A8C89E 0%, #C4D4A8 100%)" }}
      />

      {/* Background X watermark */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[520px] max-h-[520px] pointer-events-none opacity-50"
        style={{
          backgroundColor: "#EFD4D4",
          WebkitMaskImage: "url(/humanx-x.svg)",
          maskImage: "url(/humanx-x.svg)",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col px-10 py-12" style={{ minHeight: 460 }}>
        {/* Top: logo + deck label */}
        <div className="flex justify-center items-center gap-3.5 mb-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/humanx-logo.svg" alt="HumanX" className="h-[22px] w-auto" />
          <div className="w-px h-4 bg-black/20" />
          <span className="text-sm text-content-heading">Insights Deck</span>
        </div>

        {/* Main title + subtitle */}
        <div className="flex-1 flex flex-col justify-center text-center">
          <h1 className="text-4xl font-medium text-content-heading leading-tight mb-5 tracking-tight">
            {title || "Insights Deck"}
          </h1>
          <p className="text-sm text-content-secondary leading-relaxed max-w-[520px] mx-auto">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
