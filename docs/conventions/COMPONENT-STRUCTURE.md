# Component structure

Components live under `src/components`. Structure and naming:

## Top-level split

- **`store/`** – Storefront (public-facing): product listing, cart, search, etc.
- **`cms/`** – Admin (CMS): entities, settings, fulfillment, images.

## CMS layout (`cms/`)

- **`cms/ui/`** – Shared primitives: `Button`, `Input`, `Label`, `Select`, `Dialog`, `toast`, etc. Use the barrel: `import { Button, Input } from "@/components/cms/ui"`.
- **`cms/shared/`** – Shared CMS pieces used across entities (e.g. image-picker-panel).
- **`cms/sections/`** – Section-level layout (e.g. header).
- **`cms/entities/<name>/`** – Entity-specific UI (e.g. `fulfillment`, `category`, `product`, `sale-group`, `image`, `storage`).
  - Each entity can have an optional **`ui/`** subfolder for entity-specific presentational components (e.g. `category/ui/category-sale-group-card.tsx`, `product/images/ui/product-image-grid.tsx`).

## File naming

- Use **kebab-case** for component files: `order-address-form.tsx`, `address-search.tsx`, `category-sale-group-card.tsx`.
- Component names in code stay PascalCase; the file name matches in kebab form.

## Shared UI

- Use **`@/components/cms/ui`** for primitives (Button, Input, Label, Select, Dialog, showToast). Do not import from `@/components/cms/ui/button` etc.; use the barrel.
- For entity-specific or composite components (e.g. ImageSelector), import from the concrete file: `@/components/cms/ui/image-selector`.
