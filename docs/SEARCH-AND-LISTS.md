# Search bars and lists (URL, CMS/Store, react-window)

| List / feature           | URL                          | CMS / Store | Applied react-window |
|-------------------------|------------------------------|-------------|---------------------|
| Client list             | `/clients`                   | CMS         | Yes                 |
| Orders / fulfillment    | `/orders`                    | CMS         | Yes                 |
| Store product search    | `/search-products`           | Store       | No                  |
| CMS products list       | `/products`                  | CMS         | No                  |
| Sale group manage items | `/sale-groups/[id]/manage-items` | CMS     | No                  |
| Category view products  | `/categories` (and children) | CMS         | No                  |

---

# Exact instructions: what was done on the client list

The following describes the implementation applied to the **client list** (`/clients`, CMS) so it can be reused or documented elsewhere.

## 1. react-window (virtual list)

- **Dependency:** `react-window` (v2.x) and `@types/react-window`.
- **Component:** `List` from `react-window` (v2 API uses `rowComponent` and `rowProps`, not `FixedSizeList`).
- **Row component:** `ClientRow` – receives `index`, `style`, `ariaAttributes`, `clients`, `onCopy`, `onDelete`; renders a single client card with fixed height; wrapped in `React.memo`.
- **Constants:** `ROW_HEIGHT = 172`, `ROW_GAP = 16`, `ITEM_SIZE = ROW_HEIGHT + ROW_GAP`, `OVERSCAN_COUNT = 3`.
- **List props:** `rowComponent={ClientRow}`, `rowCount={clients.length}`, `rowHeight={ITEM_SIZE}`, `rowProps={{ clients, onCopy, onDelete }}`, `overscanCount={OVERSCAN_COUNT}`, `defaultHeight={500}`, `style={{ height: listHeight, width: "100%" }}`, `dir="rtl"`.
- **Height:** List container uses `flex-1 min-h-0`. A `ResizeObserver` on the container sets `listHeight` state so the list gets a numeric height; `List` re-renders when `listHeight` or `clients.length` changes.
- **Effect:** Only visible rows (plus overscan) are rendered; the list scrolls inside its container without rendering the full dataset.

## 2. Server-side search with debounce

- **Query param:** `GET /api/clients?withUnpaid=1&search=...`. When `search` is non-empty, the API adds `WHERE (name ILIKE $1 OR phone ILIKE $1 OR address ILIKE $1)` with one bound param `%search%`.
- **Frontend:** `searchQuery` state (controlled input); `debouncedSearch` state updated from `searchQuery` after 350 ms (`DEBOUNCE_MS`) via `useEffect` + `setTimeout`/cleanup.
- **Fetch:** `useEffect` runs `fetchClients(debouncedSearch)` when `debouncedSearch` changes (initial load and after typing). No client-side filtering; the list is whatever the API returns.
- **Loading:** Initial load shows "טוען לקוחות...". Subsequent searches do not show full-page loading; a "מחפש..." message appears only if the request takes longer than 2 seconds (`SEARCHING_MESSAGE_DELAY_MS`), using a timeout cleared when the request completes.

## 3. Full-viewport layout (no page scroll)

- **Clients layout:** [src/app/(root)/(cms)/clients/layout.tsx](src/app/(root)/(cms)/clients/layout.tsx) wraps children in a div with `className="flex flex-col h-[calc(100dvh-12rem)] overflow-hidden"` so the clients block has a fixed height and does not cause page scroll.
- **Clients component:** `main` has `h-full flex flex-col overflow-hidden`; the inner content div has `flex-1 min-h-0 overflow-hidden flex flex-col`; the list container has `flex-1 min-h-0`. Only the virtual list scrolls; the page itself does not.

## 4. Wider desktop layout and responsive row

- **Section scaffold:** When `section === "clients"`, the header and content containers use responsive max-widths: default `max-w-6xl`, then `lg:max-w-7xl`, `xl:max-w-[85rem]`, `2xl:max-w-[100rem]`. Padding `px-4 sm:px-6`.
- **Clients main:** Uses `w-full max-w-full` so it fills the scaffold content width (no extra max-width or horizontal padding in the component).
- **Client row card:** Responsive layout: `flex-col sm:flex-row` (stacked on small screens, row on larger); padding `p-3 sm:p-4`; action buttons `flex-row sm:flex-col` and `self-end sm:self-auto`.

## 5. Files touched for the client list

- [src/components/cms/clients.tsx](src/components/cms/clients.tsx) – virtual list, debounced search, loading/searching state, responsive row.
- [src/app/api/clients/route.ts](src/app/api/clients/route.ts) – optional `search` query param and ILIKE filter for both list branches.
- [src/app/(root)/(cms)/clients/layout.tsx](src/app/(root)/(cms)/clients/layout.tsx) – full-height flex wrapper with `h-[calc(100dvh-12rem)] overflow-hidden`.
- [src/components/cms/sections/scaffold/section-scaffold.tsx](src/components/cms/sections/scaffold/section-scaffold.tsx) – wider responsive max-width and padding when `section === "clients"`.

---

# Orders list (same pattern)

The **orders/fulfillment list** (`/orders`, CMS) uses the same pattern as the client list.

- **react-window:** `OrderRow` (memo) wraps `SingleOrder` in a fixed-height row (`ROW_HEIGHT = 340`, `ROW_GAP = 16`). List container uses `flex-1 min-h-0` and `ResizeObserver` for `listHeight`. `List` with `dir="rtl"`, same overscan and style.
- **Search:** Server-side via `GET /api/orders/search?query=...`. Debounce 350 ms; "מחפש..." after 2 s. Single effect: when `debouncedSearch` / `selectedDate` / `unpaidOnly` change, either `searchOrders(debouncedSearch)` or `fetchOrders(...)` (by date or pending).
- **Layout:** [src/app/(root)/(cms)/orders/layout.tsx](src/app/(root)/(cms)/orders/layout.tsx) wraps children in `flex flex-col h-[calc(100dvh-12rem)] overflow-hidden`. List component `main` is `h-full flex flex-col overflow-hidden`; list area `flex-1 min-h-0`.
- **Scaffold:** Section scaffold uses the same wider max-widths when `section === "orders"` (with clients).
- **Files:** [src/components/cms/entities/fulfillment/list.tsx](src/components/cms/entities/fulfillment/list.tsx), orders layout, section-scaffold.
