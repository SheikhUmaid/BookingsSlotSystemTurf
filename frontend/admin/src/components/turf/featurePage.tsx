import type { ComponentType } from "react";
import { PageHeader } from "./ui-bits";
import { FeatureLocked } from "./plan";
import { useSubscription, type FeatureKey } from "@/lib/useSubscription";

/**
 * Wrap a route component so the whole page shows the locked placeholder when
 * the plan doesn't include `feature`. Usage: component: featurePage("coupons", "Coupons", CouponsPage)
 */
export function featurePage(feature: FeatureKey, title: string, Page: ComponentType) {
  return function FeatureGatedPage() {
    const { hasFeature } = useSubscription();
    if (hasFeature(feature)) return <Page />;
    return (
      <div>
        <PageHeader title={title} />
        <FeatureLocked feature={feature} />
      </div>
    );
  };
}
