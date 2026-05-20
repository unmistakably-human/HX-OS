// The single-call discovery route was retired when v4 generation moved
// to Act-by-Act streaming (see /discover/act/[n] and /discover/save).
// Older clients hitting this endpoint get a clear error instead of a
// silent timeout.

export function POST() {
  return Response.json(
    {
      error: "Single-call discovery is retired. Use /discover/act/1..4 then /discover/save.",
    },
    { status: 410 },
  );
}
