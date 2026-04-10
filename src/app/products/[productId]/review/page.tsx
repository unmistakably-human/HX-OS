"use client";

import { useParams } from "next/navigation";
import { ReviewClient } from "@/components/review/review-client";

export default function ProductReviewPage() {
  const params = useParams<{ productId: string }>();
  return <ReviewClient productId={params.productId} />;
}
