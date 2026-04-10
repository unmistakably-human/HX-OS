"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ReviewClient } from "@/components/review/review-client";

export default function FeatureReviewPage() {
  const params = useParams<{ productId: string; featureId: string }>();
  const [featureName, setFeatureName] = useState<string>("");

  useEffect(() => {
    fetch(`/api/products/${params.productId}/features/${params.featureId}`)
      .then((r) => r.json())
      .then((f) => setFeatureName(f.name || ""))
      .catch(() => {});
  }, [params.productId, params.featureId]);

  return (
    <ReviewClient
      productId={params.productId}
      featureId={params.featureId}
      featureName={featureName}
    />
  );
}
