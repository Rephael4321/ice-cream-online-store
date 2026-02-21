# Page conventions

## Thin-page rule

App route pages under `src/app` should be **thin wrappers** that:

1. **Only compose components** from `@/components` (or other shared modules).
2. **Pass route params** (`params`, `searchParams`) as props to those components.
3. **Contain no business logic** and no heavy JSX—no form state, no data fetching, no complex conditionals in the page file itself.

Logic, forms, and UI belong in components under `src/components`. Pages only wire the URL to the right component.

### Template

**Reference implementation:** `src/app/(root)/(cms)/orders/[id]/address/page.tsx`

```tsx
"use client";

import { useParams } from "next/navigation";
import OrderAddressForm from "@/components/cms/entities/fulfillment/order-address-form";

export default function OrderAddressPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ? String(params.id) : "";
  return <OrderAddressForm orderId={orderId} />;
}
```

The page reads `params`, derives `orderId`, and renders a single component. All form logic and UI live in `OrderAddressForm`.

### Why

- Easier to test components in isolation.
- Clear separation: routes = URL → component; components = behavior and UI.
- Keeps the app directory small and consistent.
