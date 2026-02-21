# API Authorization Audit

**Summary:** Who can do what on every API endpoint.  
**Auth model:** JWT cookie `token`; roles: `admin`, `driver`, `client`.  
**Rules (from `protectAPI`):** GET is **public**; non-GET requires valid JWT and role in allowed set (default **admin only**; some routes allow **driver** or use **skipAuth** / **no middleware**).

---

## Auth primitives

| Mechanism | Meaning |
|-----------|--------|
| **withMiddleware** (default) | GET: anyone. POST/PUT/PATCH/DELETE: **admin** only (valid JWT with role `admin` or legacy `id === "admin"`). |
| **withMiddleware(..., { allowed: ["driver"] })** | Same as above, but **admin** and **driver** can call non-GET. |
| **withMiddleware(..., { skipAuth: true })** | No JWT check: **anyone** can call (including non-GET). |
| **withMiddleware(..., { middleware: validateClientOrderAccess })** | After normal auth: **admin** → redirect to CMS; **client** → must have cookie `phoneNumber` and order must belong to that phone. |
| **No withMiddleware** | No server-side auth: **anyone** can call. |

---

## 1. Auth

| Method | Endpoint | Who can call | What they can do | Used |
|--------|----------|---------------|------------------|------|
| GET | `/api/auth/entry` | **Anyone** | Redirect to external auth app (`AUTH_SERVER_API_URL`) with query params. No auth. | Yes (CMS auth setup) |
| POST | `/api/auth/verify` | **Anyone** | Verify a JWT (body `token`). Returns `valid`, `payload` (role, id, name, exp, iat) or 401. No cookie required. | Yes (jwt-gatekeeper) |

---

## 2. Places (address search, key server-only)

The Google API key is never sent to the client. These routes proxy Google Places on the server.

| Method | Endpoint | Who can call | What they can do | Used |
|--------|----------|---------------|------------------|------|
| GET | `/api/places/autocomplete` | **Anyone** (GET) | Place suggestions for address search. Server calls Google with key from env. | Yes (AddressSearch) |
| GET | `/api/places/details` | **Anyone** (GET) | Formatted address and lat/lng for a `place_id`. Server calls Google with key from env. | Yes (AddressSearch) |

---

## 3. Image proxy

| Method | Endpoint | Who can call | What they can do | Used |
|--------|----------|---------------|------------------|------|
| GET | `/api/img-proxy?url=...` | **Anyone** | Proxy image from URL. Allowed hosts from `ALLOWED_IMAGE_HOSTS` only (SSRF guard). No JWT. | Yes (global-image-retry, image-picker-panel, unused-images, images upload) |

---

## 4. Categories

| Method | Endpoint | Who can call | What they can do | Used |
|--------|----------|---------------|------------------|------|
| GET | `/api/categories` | **Anyone** | List categories (optional `?full=true`). | Yes (view-categories, organize-categories, edit, link-product) |
| POST | `/api/categories` | **Admin** | Create category. | Yes (categories/new) |
| PATCH | `/api/categories` | **Admin** | Update category (body: id, name, type, etc.). | No |
| GET | `/api/categories/root` | **Anyone** (GET) | Root categories for store menu. | Yes (main-menu, category-linker, product category picker) |
| GET | `/api/categories/linked` | **Anyone** (GET) | Linked categories. | Yes (category-linker) |
| GET | `/api/categories/[id]` | **Anyone** (GET) | Get category by ID. | No |
| PUT | `/api/categories/[id]` | **Admin** | Update category. | No |
| DELETE | `/api/categories/[id]` | **Admin** | Delete category. | No |
| GET | `/api/categories/[id]/products` | **Anyone** (GET) | Products in category. | No |
| PUT | `/api/categories/[id]/products/order` | **Admin** | Reorder products in category. | No |
| GET | `/api/categories/name/[name]` | **Anyone** (GET) | Get category by name. | Yes (edit) |
| PUT | `/api/categories/name/[name]` | **Admin** | Update category by name. | Yes (edit) |
| DELETE | `/api/categories/name/[name]` | **Admin** | Delete category by name. | Yes (edit) |
| GET | `/api/categories/name/[name]/products` | **Anyone** (GET) | Products by category name. | Yes (store products-by-category) |
| PUT | `/api/categories/name/[name]/products/order` | **Admin** | Reorder products in category by name. | Yes (organize-products) |
| GET | `/api/categories/name/[name]/items` | **Anyone** (GET) | Items by category name. | Yes (view-products, organize-products) |
| GET | `/api/categories/name/[name]/children` | **Anyone** (GET) | Child categories. | Yes (store products-by-category) |
| PUT | `/api/categories/order` | **Admin** | Reorder categories (organize). | Yes (organize-categories) |

---

## 5. Products

| Method | Endpoint | Who can call | What they can do | Used |
|--------|----------|---------------|------------------|------|
| GET | `/api/products` | **Anyone** (GET) | List products (sort, etc.). | Yes (product list, link-product, edit) |
| POST | `/api/products` | **Admin** | Create product. | Yes (products/new) |
| GET | `/api/products/search` | **Anyone** (GET) | Search products. | Yes (search-products page) |
| GET | `/api/products/[id]` | **Anyone** (GET) | Get single product. | Yes (product edit) |
| PUT | `/api/products/[id]` | **Admin** | Update product. | Yes (product edit) |
| DELETE | `/api/products/[id]` | **Admin** | Delete product. | Yes (product edit) |
| GET | `/api/products/[id]/categories` | **Anyone** (GET) | Product’s categories. | Yes (product edit) |
| PUT | `/api/products/[id]/price-change` | **Admin** | Apply price change. | Yes (product edit) |
| POST | `/api/products/[id]/price-change/validate` | **Admin** | Validate price change. | Yes (product edit) |
| GET | `/api/products/stock` | **Anyone** | **skipAuth** – get product stock. | Yes (cart-context, cart, product edit) |
| PATCH | `/api/products/stock` | **Admin** | Update product stock. | Yes (product edit) |
| GET | `/api/products/out-of-stock` | **Anyone** (GET) | List out-of-stock products. | Yes (out-of-stock-list) |
| PATCH | `/api/products/out-of-stock` | **Admin** | Patch stock status (bulk). | Yes (out-of-stock-list) |
| GET | `/api/products/unused-images` | **Anyone** (GET) | List unused images (admin UI). | Yes (image-picker, image-picker-panel, product images list) |
| GET | `/api/products/by-sale` | **Anyone** (GET) | Products by sale. | No |
| POST | `/api/products/sale-groups` | **Anyone** | **skipAuth** – get sale groups for products (store cart). | Yes (cart-context) |

---

## 6. Product–category link

| Method | Endpoint | Who can call | What they can do | Used |
|--------|----------|---------------|------------------|------|
| POST | `/api/product-category` | **Admin** | Link product to category. | Yes (category-linker, product category, product new, link-product) |
| DELETE | `/api/product-category` | **Admin** | Unlink product from category. | Yes (category.tsx, category-linker) |

---

## 7. Sale groups

| Method | Endpoint | Who can call | What they can do | Used |
|--------|----------|---------------|------------------|------|
| GET | `/api/sale-groups` | **Anyone** (GET) | List sale groups. | Yes (sale-group view, list, new, product-sale-group-menu) |
| POST | `/api/sale-groups` | **Admin** | Create sale group. | Yes (sale-groups/new) |
| GET | `/api/sale-groups/[id]` | **Anyone** (GET) | Get sale group. | Yes (sale-group view, sale-group-editor) |
| PATCH | `/api/sale-groups/[id]` | **Admin** | Update sale group. | Yes (sale-group-editor) |
| DELETE | `/api/sale-groups/[id]` | **Admin** | Delete sale group. | Yes (sale-group-editor) |
| GET | `/api/sale-groups/[id]/items/eligible-products` | **Anyone** (GET) | Eligible products for group. | Yes (manage-items) |
| POST | `/api/sale-groups/[id]/items` | **Admin** | Add item to group (body: productId). | No |
| DELETE | `/api/sale-groups/[id]/items` | **Admin** | Remove item from group. | No |
| POST | `/api/sale-groups/[id]/items/[productId]` | **Admin** | Add product to group. | Yes (manage-items, product-row, product-sale-group-menu) |
| DELETE | `/api/sale-groups/[id]/items/[productId]` | **Admin** | Remove product from group. | Yes (manage-items, product-row, product-sale-group-menu) |

---

## 8. Orders

| Method | Endpoint | Who can call | What they can do | Used |
|--------|----------|---------------|------------------|------|
| GET | `/api/orders` | **Admin** | List orders (CMS). | Yes (fulfillment list) |
| POST | `/api/orders` | **Anyone** | **skipAuth** – create order (checkout). Body: phone, items, address, etc. | Yes (cart checkout) |
| GET | `/api/orders/search` | **Admin** | Search orders. | Yes (fulfillment list) |
| GET | `/api/orders/by-phone?phone=...` | **Anyone** (GET) | List orders for a phone number. **No proof of identity** – anyone who knows the phone can list orders. | Yes (order-history-modal) |
| GET | `/api/orders/client/[id]` | **Client** (cookie `phoneNumber`) or **Admin** (redirect) | Get order by ID: client only if order belongs to that phone; admin redirected to CMS. | Yes (store order page) |
| GET | `/api/orders/[id]` | **Admin** | Get order (CMS). | Yes (fulfillment view, address page) |
| PATCH | `/api/orders/[id]` | **Admin** | Update order. | Yes (fulfillment view) |
| DELETE | `/api/orders/[id]` | **Admin** | Delete order. | Yes (fulfillment list, view) |
| GET | `/api/orders/[id]/stock` | **Admin** | Out-of-stock items for order. | Yes (fulfillment view) |
| PATCH | `/api/orders/[id]/stock` | **Admin** | Update product stock from order. | Yes (fulfillment view) |
| PATCH | `/api/orders/[id]/status` | **Admin**, **Driver** | Update order status. | Yes (fulfillment view, list) |
| PATCH | `/api/orders/[id]/delivery` | **Admin**, **Driver** | Update delivery info. | Yes (fulfillment view, list) |
| PATCH | `/api/orders/[id]/payment` | **Admin**, **Driver** | Update payment status. | Yes (fulfillment view, list) |
| PATCH | `/api/orders/[id]/notify` | **Anyone** | **skipAuth** – set `is_notified = true` for order. No auth; order ID in path. | Yes (cart, fulfillment view) |

---

## 9. Clients

| Method | Endpoint | Who can call | What they can do | Used |
|--------|----------|---------------|------------------|------|
| GET | `/api/clients` | **Admin** | List clients. | Yes (clients list) |
| GET | `/api/clients/[id]` | **Admin** | Get client. | Yes (client-details, address page) |
| PUT | `/api/clients/[id]` | **Admin** | Full client update (name, phone, address, address_lat, address_lng). | Yes (client-details) |
| PATCH | `/api/clients/[id]/address` | **Admin**, **Driver** | Update only address, address_lat, address_lng. At least one field required. | Yes (order address page) |
| DELETE | `/api/clients/[id]` | **Admin** | Delete client. | Yes (clients list, client-details) |

---

## 10. Images

| Method | Endpoint | Who can call | What they can do | Used |
|--------|----------|---------------|------------------|------|
| GET | `/api/images` | **Anyone** (GET) | List images. | Yes (image view) |
| GET | `/api/images/index` | **Anyone** (GET) | Image index. | No |
| POST | `/api/images/upload` | **Admin** | Upload image. | Yes (image-picker-panel, upload, upload-folder) |
| POST | `/api/images/rename` | **Admin** | Rename image. | Yes (image-tile) |
| POST | `/api/images/update-index` | **Admin** | Update image index. | No |
| DELETE | `/api/images/delete` | **Admin** | Delete image. | Yes (image view, image-tile) |

---

## 11. Storage (areas / assign)

| Method | Endpoint | Who can call | What they can do | Used |
|--------|----------|---------------|------------------|------|
| GET | `/api/storage/areas` | **Anyone** (GET) | List storage areas. | Yes (view-areas, product-storage-selector) |
| POST | `/api/storage/areas` | **Admin** | Create storage area. | Yes (view-areas) |
| DELETE | `/api/storage/areas/[id]` | **Admin** | Delete storage area. | Yes (view-areas) |
| POST | `/api/storage/areas/order` | **Admin** | Reorder storage areas. | Yes (view-areas) |
| GET | `/api/storage/unplaced-products` | **Anyone** (GET) | Unplaced products. | No |
| POST | `/api/storage/assign` | **Admin** | Assign product to storage. | Yes (product-storage-selector, product new) |

---

## Role summary

| Role | Allowed actions |
|------|------------------|
| **Anyone (no auth)** | All GETs (except where middleware restricts), POST `/api/orders`, POST `/api/auth/verify`, GET `/api/auth/entry`, GET `/api/img-proxy`, GET `/api/places/autocomplete`, GET `/api/places/details`, GET `/api/categories`, GET `/api/orders/by-phone`, PATCH `/api/orders/[id]/notify`, GET `/api/products/stock`, POST `/api/products/sale-groups`. |
| **Client** | GET `/api/orders/client/[id]` only when cookie `phoneNumber` matches the order’s client phone. |
| **Driver** | Same as admin for: PATCH `/api/orders/[id]/status`, PATCH `/api/orders/[id]/delivery`, PATCH `/api/orders/[id]/payment`, PATCH `/api/clients/[id]/address`. All other non-GET: admin only. |
| **Admin** | All non-GET endpoints (except those with skipAuth). GETs are public; admin also gets redirect from `/api/orders/client/[id]` to CMS order page. |

---

## Security notes

1. **`/api/categories` (POST, PATCH)** – Now protected with `withMiddleware` (admin-only for POST and PATCH).
2. **`/api/orders/by-phone?phone=...`** – GET is public; anyone who knows a phone number can list that client’s orders. Consider requiring cookie/session or signed token.
3. **`/api/orders/[id]/notify`** – PATCH is unauthenticated; anyone can set `is_notified` for any order ID. Acceptable only if used by a trusted webhook; otherwise restrict (e.g. secret header or internal-only).
4. **`/api/auth/verify`** – Accepts token in body; no cookie. Fine for “validate this token” flows; ensure callers are not exposed to token theft (e.g. use over HTTPS only).
