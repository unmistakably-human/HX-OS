"use client";

export default function ReviewPage() {
  return (
    <iframe
      src="/api/reviewer"
      className="fixed inset-0 w-full h-full border-0 z-50"
      title="Design Review"
    />
  );
}
