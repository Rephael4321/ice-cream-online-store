# Sale groups inside collection categories (bundle deals)

This document describes the “bundle deal inside a category” setup (like “5 for 34.90” displayed inside a category page) end-to-end: **DB model**, **API surface**, **CMS management UI**, and **storefront/client behavior**.

The core idea is:

- A **collection category** renders a mixed feed.
- The feed can contain:
  - **discrete products** (regular product cards)
  - one or more **Sale Group Clusters** (highlighted bundle-deal blocks)
- Some products may participate in a **sale group** (bundle offer).
- If the **sale-group offer is the best sale** for those products, the UI clusters them into a Sale Group Cluster.

---

## Data model (Postgres)

### 1) `sale_groups` — defines the bundle offer

Table: `public.sale_groups` (see `docs/db-schema.txt`)

Key columns used by this setup:

- **`id`**: sale group id
- **`name`**, **`image`**: UI display
- **`quantity`**: bundle size (e.g. 5)
- **`sale_price`**: bundle price (e.g. 34.90)
- **`price`**: unit price baseline used for discount math (can be null; code falls back to product price)
- **`increment_step`**: how much the quantity jumps per +/- click in the store UI (defaults to 1; must be > 0)

### 2) `product_sale_groups` — which products are eligible for a sale group

Table: `public.product_sale_groups`

- This is a many-to-many link between products and sale groups.
- The store/cart logic currently assumes a product has **at most one** relevant sale group (the code uses a single “saleGroup meta” per product; “last write wins” if multiple exist).

### 3) `categories` and `category_multi_items` — how a category “contains” a sale group

Tables:

- `public.categories`
- `public.category_multi_items`

`category_multi_items` is a **polymorphic** linking table:

- **`category_id`** → `categories.id`
- **`target_type`** in `('product', 'category', 'sale_group')`
- **`target_id`** points at the id in the target table (e.g. `sale_groups.id` when `target_type='sale_group'`)
- **`sort_order`** controls ordering of items within the category response

This is how you attach a sale group to a category so it can be shown “inside” that category page.

### 4) Ordering and mixed content inside one category

A category can contain a mixture of:

- **products**: rows in `category_multi_items` where `target_type='product'`
- **sale groups**: rows in `category_multi_items` where `target_type='sale_group'`

The **`sort_order`** column on `category_multi_items` is the primary ordering mechanism for category items in APIs that return a mixed list (for example `GET /api/categories/name/[name]/items`).

On the storefront category page, products are fetched from `GET /api/categories/name/[name]/products` and then may be clustered into Sale Group Clusters while still preserving overall page order (see “Storefront / client experience” below).

---

## APIs involved

### Sale groups (CRUD + metadata)

- **List**: `GET /api/sale-groups` (public GET)
- **Create**: `POST /api/sale-groups` (admin)
- **Read**: `GET /api/sale-groups/[id]` (public GET)
  - Also returns `categories` that link to this sale group by reading `category_multi_items` where `target_type='sale_group'`.
  - Implementation: `src/app/api/sale-groups/[id]/route.ts`
- **Update**: `PATCH /api/sale-groups/[id]` (admin)
  - Supports updating at least `name`, `image`, `increment_step`
- **Delete**: `DELETE /api/sale-groups/[id]` (admin)

### Sale group items (products in a sale group)

- **List items**: `GET /api/sale-groups/[id]/items`
  - Implementation: `src/app/api/sale-groups/[id]/items/route.ts`
- **Eligible products (for CMS linking)**: `GET /api/sale-groups/[id]/items/eligible-products`
  - Returns all products plus `alreadyLinked` boolean.
  - Implementation: `src/app/api/sale-groups/[id]/items/eligible-products/route.ts`
- **Add product to group**: `POST /api/sale-groups/[id]/items/[productId]` (admin)
- **Remove product from group**: `DELETE /api/sale-groups/[id]/items/[productId]` (admin)

### Linking a sale group to a category (polymorphic “category item”)

Link/unlink is done through the generic “product-category” route (despite its name):

- **Link**: `POST /api/product-category` with JSON body:

  - `categoryId`: category id
  - `targetId`: sale group id
  - `type`: `"sale_group"`

- **Unlink**: `DELETE /api/product-category?categoryId=...&targetId=...&type=sale_group`

Implementation: `src/app/api/product-category/route.ts`

### Storefront: category product feed (chooses “best sale” and exposes sale-group meta)

The store category page (`/category-products/[category]`) primarily uses:

- `GET /api/categories/name/[name]/products`

Implementation: `src/app/api/categories/name/[name]/products/route.ts`

This endpoint:

1. Loads products linked to the category via `category_multi_items` with `target_type='product'`
2. Loads **category-based sale** (via `categories.type='sale'` + `category_sales`)
3. Loads **per-product sale** (table `sales`)
4. Loads **sale-group membership** (via `product_sale_groups` + `sale_groups`, including `increment_step`)
5. Chooses the “best sale” per product using `pickBestSale(...)`:
   - Lowest unit price (\(sale\_price / quantity\))
   - Then lowest total price
   - Tie-break: prefer group > category > product

The response includes:

- `sale`: the chosen sale (may have `fromCategory` or `fromGroup`)
- `saleGroup`: raw sale-group info for UI grouping even if it wasn’t chosen
- `incrementStep`: convenience copy of group increment step (defaults to 1)

### Cart enrichment: fetch sale-group meta for items in cart

Cart context fetches group meta on demand:

- `POST /api/products/sale-groups` (public; cached)
  - Body: `{ ids: number[] }`
  - Returns a map keyed by product id with `{ id, quantity, salePrice, unitPrice }`.
  - Implementation: `src/app/api/products/sale-groups/route.ts`
  - Used by: `src/context/cart-context.tsx`

This allows the cart to compute group discounts even if the product list page didn’t preload everything.

---

## CMS / management UI (how admins set it up)

### 1) Create a sale group

Route: `/sale-groups/new`

UI: `src/components/cms/entities/sale-group/new.tsx`

Admin chooses:

- **Image** (required)
- **Optional name**
- **Increment step** (`increment_step`, default 1)

After creation, admin is redirected to `/sale-groups/[id]`.

### 2) Edit sale group metadata + attach it to categories

Route: `/sale-groups/[id]`

UI: `src/components/cms/entities/sale-group/view.tsx` + `ui/sale-group-editor.tsx`

Capabilities:

- Update group name and increment step (PATCH `/api/sale-groups/[id]`)
- Update group image (PATCH `/api/sale-groups/[id]`)
- Link/unlink the sale group to categories using **CategoryLinker**:
  - UI component: `src/components/cms/entities/sale-group/ui/category-linker.tsx`
  - Uses `POST/DELETE /api/product-category` with `type="sale_group"`

Linking the group to a category is what makes the deal appear “inside” that category (via `category_multi_items`).

### 3) Choose which products belong to the sale group

Route: `/sale-groups/[id]/manage-items`

UI: `src/components/cms/entities/sale-group/manage-items.tsx`

Behavior:

- Loads:
  - `GET /api/sale-groups/[id]` (for the group’s base quantity/price)
  - `GET /api/sale-groups/[id]/items/eligible-products` (for the product list + `alreadyLinked`)
- Lets admin add/remove products to/from the group using:
  - `POST /api/sale-groups/[id]/items/[productId]`
  - `DELETE /api/sale-groups/[id]/items/[productId]`
- Includes bulk actions that try to keep the group consistent (for example: selecting items matching a specific price/sale variant).

---

## Storefront / client experience (what the shopper sees)

### Category page rendering (clustered “bundle deal” section)

Page: `/category-products/[category]`

Implementation: `src/components/store/products-by-category.tsx`

High-level behavior:

1. The page fetches category products from `GET /api/categories/name/[name]/products`.
2. Products that have a chosen sale where `sale.fromGroup === true` are candidates for clustering.
3. The page groups those products by `sale.group.id`.
4. Only clusters with **2+ products** are rendered as a highlighted section using:
   - `src/components/store/sale-group-cluster.tsx`
5. Inside the cluster, product cards render with `suppressPricing` enabled so the cluster header communicates the deal, not each individual card.

#### Mixed feed: multiple clusters + discrete products

The category page may contain **multiple Sale Group Clusters** and **standalone products** on the same screen.

Implementation details (see `src/components/store/products-by-category.tsx`):

- **Multiple clusters**: the page builds a `Map<groupId, cluster>` and can render more than one cluster.
- **Discrete products**: products that are not part of a rendered cluster are rendered normally.
- **Order stability**: each cluster records `firstIndex` (the first occurrence of a product that belongs to that group in the API response) and clusters are rendered in the order of `firstIndex`. Standalone products keep their relative order around clusters.

The cluster subtitle shows:

- bundle amount + price
- increment step (“צעד”) derived from `sale_groups.increment_step`

### Product card interactions (quantity stepping)

Component: `src/components/store/single-product.tsx`

Key behaviors:

- +/- buttons update quantity in the cart.
- If `incrementStep > 1`, the +/- buttons **snap** quantity to multiples of that step (so each click adds/removes by the configured step).
- The “הוסף חבילת מבצע (N)” button (when a sale exists) adds exactly `sale.amount` to the cart.

### Cart pricing rules (avoid double-discount; compute group discount)

Cart UI: `src/components/store/cart/cart.tsx`

Important rule:

- If an item participates in a **sale group**, the cart **does not apply per-item sales** to it (to avoid double-discount).

Pricing pipeline:

1. Compute pre-group total:
   - Apply per-item sale only when not in a sale group.
2. Allocate sale-group discount across members (proportional to quantities) using `allocateGroupDiscounts(...)`.
3. Subtotal = preGroupTotal − groupDiscountTotal (+ delivery fee rules).

The same allocation logic is also implemented server-side when creating an order:

- Server authoritative calculation: `src/app/api/orders/route.ts`

### Order persistence / snapshots

When an order is created (`POST /api/orders`), the server:

- Loads authoritative product prices
- Loads sale-group membership for products in the cart
- Computes `preGroupTotal`, `groupDiscountTotal`, and allocates per-item discount
- Persists order items with group-related snapshot columns (see `docs/db-schema.txt` / `public.order_items`):
  - `group_id`, `group_bundle_qty`, `group_sale_price`, `group_unit_price`, `group_discount`

The client order details page (`src/components/store/order.tsx`) reads these fields and renders totals consistently.

---

## Common pitfalls / expectations

- **One sale group per product (assumed)**: several code paths attach a single `saleGroup` meta to a product/cart item. If you link a product to multiple sale groups, behavior may be unpredictable (“last write wins”).
- **Category linking is polymorphic**: `category_multi_items.target_id` is not protected by a DB foreign key for every possible `target_type`. The app must ensure `target_type='sale_group'` references a real `sale_groups.id`.
- **Clustering depends on “best sale”**: A product can be in a sale group but not show in the sale-group cluster if another sale (category/product) is cheaper per unit. The cart can still apply sale-group discounts if the item has `saleGroup` meta.

