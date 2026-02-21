# Payment Tracking: Spec vs Current Implementation

This document describes what a payment tracking system for an order-based e‑commerce app should look like, and how the current ice-cream store implementation compares.

---

## 1. What the system should track (ideal spec)

### 1.1 Customer ↔ Order linkage

| Requirement | Description |
|-------------|-------------|
| **Which customer owns which order** | Every order must be tied to a single customer (client). |
| **Audit trail** | Ability to list all orders for a customer and see payment status per order. |

### 1.2 Payment status per order

| Requirement | Description |
|-------------|-------------|
| **Paid vs unpaid** | Clear boolean or derived state: order is either paid or not. |
| **Payment method** | How the customer paid: e.g. cash, credit card, Paybox, bank transfer. |
| **When paid** | Timestamp of when payment was recorded (or when it was received). |
| **Who recorded it** | Optional: which admin/driver marked the order as paid (audit). |

### 1.3 Amounts and debt

| Requirement | Description |
|-------------|-------------|
| **Order total** | Stored total per order (already used for display and reporting). |
| **Amount paid per order** | If supporting partial payments: amount paid so far vs order total. |
| **Customer balance / debt** | For each customer: total unpaid amount = sum of (order total − amount paid) over all their unpaid or partially paid orders. |
| **Single source of truth** | Debt/balance derived from orders and payments, or stored and kept in sync. |

### 1.4 Payment history (optional but recommended)

| Requirement | Description |
|-------------|-------------|
| **Payment events** | Table or log: order_id, amount, method, paid_at, optional reference. |
| **Multiple payments per order** | Allow paying an order in several steps (e.g. cash + credit). |
| **Refunds / adjustments** | Optional: negative payments or adjustment records. |

### 1.5 UX and reporting

| Requirement | Description |
|-------------|-------------|
| **Order list** | Show paid/unpaid and payment method per order. |
| **Order detail** | Show payment method, paid status, and optionally paid_at. |
| **Client view** | Show client’s unpaid balance (debt) and list of unpaid (or partially paid) orders. |
| **Filters** | Filter orders by paid/unpaid; filter clients by “has debt”. |
| **Checkout** | Optional: customer selects intended payment method at checkout (for reference); actual payment still recorded when money is received. |

### 1.6 Security and consistency

| Requirement | Description |
|-------------|-------------|
| **Authorization** | Only admin (and optionally driver) can set payment status/method. |
| **Idempotency / validation** | Prevent duplicate payment updates; validate amounts and method. |
| **Integrity** | If there is a `payments` table, keep it consistent with order totals and client balance. |

---

## 2. Current implementation

### 2.1 Database (from `docs/db-schema.txt`)

**Relevant tables:**

- **`orders`**
  - `client_id` (FK to `clients`) — links order to one customer.
  - `is_paid` (boolean, default false).
  - `payment_method` (text, nullable) — no enum in DB; app uses `credit`, `paybox`, `cash`.
  - `total` (numeric) — order total.
  - No `paid_at`, no `amount_paid`, no `recorded_by`.

- **`clients`**
  - No `balance`, `debt`, or `credit_limit` fields.

- **No `payments` table** — no history of payment events, no partial payments, no refunds.

So: **customer ↔ order** is via `orders.client_id`. **What was paid** is only “this order is paid” (and how, via `payment_method`). **When** and **how much** per payment are not stored.

### 2.2 Who can update payment

- **PATCH `/api/orders/[id]/payment`**  
  - Protected by `withMiddleware(..., { allowed: ["driver"] })` (admin and driver).
  - Body: `paymentMethod` (`"credit" | "paybox" | "cash" | "" | null`) and/or legacy `isPaid` (boolean).
  - If `paymentMethod` is set to a non-empty value → `is_paid` is set to true; otherwise false.
  - No `paid_at`, no “who updated”, no amount.

So: **what customer paid what order** = order has `client_id`; **what payment they used** = `orders.payment_method`; **whether they have debt** is **not** stored or computed anywhere.

### 2.3 Order creation

- **POST `/api/orders`**  
  - Creates order with `client_id`, totals, delivery_fee, etc.  
  - Does **not** set `payment_method` or `is_paid` (defaults: unpaid, no method).

Payment is recorded only later in the CMS when staff set it.

### 2.4 Where payment is shown and set

- **Fulfillment list and order view (CMS)**  
  - Show `isPaid` and `paymentMethod` per order.  
  - Dropdown to set payment method (credit / paybox / cash); setting a method marks the order paid.  
- **Client order view (store)**  
  - Order detail by phone: shows `isPaid` and order total; no payment method in the snippet we saw.  
- **Order history modal (store)**  
  - Shows `isPaid` and `paymentMethod` in the list.  
- **Client API**  
  - GET `/api/clients`, GET `/api/clients/[id]`: no balance, no debt, no unpaid order summary.

### 2.5 How “customer has debt” could be derived (not implemented)

Conceptually:

- **Debt per client** = sum of `orders.total` over orders where `client_id = X` and `is_paid = false` (and optionally `is_visible = true`).
- There is **no** API that returns this sum.
- There is **no** UI showing “client balance” or “unpaid total” on the client page or in lists.

So today the system **does not** “know” if a customer has debt in any exposed way; it only knows per order whether that order is paid.

---

## 3. Spec vs implementation (gap analysis)

| Spec item | Implemented? | Notes |
|----------|--------------|--------|
| **Customer ↔ order linkage** | ✅ Yes | `orders.client_id`. |
| **Paid vs unpaid per order** | ✅ Yes | `orders.is_paid`. |
| **Payment method per order** | ✅ Yes | `orders.payment_method` (credit, paybox, cash). |
| **When paid** | ❌ No | No `paid_at` (or similar) column or API. |
| **Who recorded payment** | ❌ No | No user/role audit on payment update. |
| **Order total** | ✅ Yes | `orders.total`. |
| **Amount paid per order** | ❌ No | No partial payments; only full paid/unpaid. |
| **Customer debt / balance** | ❌ No | No field, no API, no UI. |
| **Payment history (events)** | ❌ No | No `payments` table or log. |
| **Multiple payments per order** | ❌ No | Single method + boolean only. |
| **Refunds / adjustments** | ❌ No | Not supported. |
| **Order list shows paid + method** | ✅ Yes | Fulfillment list and APIs return `isPaid`, `paymentMethod`. |
| **Order detail shows method + status** | ✅ Yes | Fulfillment view and client order view. |
| **Client view shows debt / unpaid orders** | ❌ No | Client API and UI do not expose balance or unpaid list. |
| **Filter orders by paid/unpaid** | ✅ Partially | List can use `pending=1` (not ready or not paid); no “unpaid only” filter. |
| **Filter clients by “has debt”** | ❌ No | Not implemented. |
| **Payment method at checkout** | ❌ No | Checkout does not send or store intended method. |
| **Only admin/driver can set payment** | ✅ Yes | JWT middleware allows admin and driver. |
| **Validation of payment method** | ✅ Yes | Zod schema restricts to credit/paybox/cash or empty. |

---

## 4. Summary

- **Implemented:**  
  - Order–customer link, order total, per-order paid flag, per-order payment method (credit/paybox/cash), and UI/API to view and set them in the CMS and in the store order history.

- **Not implemented:**  
  - Any notion of **customer-level debt/balance**.  
  - **When** payment was recorded (`paid_at`).  
  - **Who** recorded it.  
  - **Payment history** (multiple payments per order, refunds).  
  - **Partial payments** (amount paid vs order total).  
  - **Client-facing** debt or unpaid summary (API or UI).  
  - **Checkout-time** payment method (optional in spec).

So the system correctly tracks **which customer has which order** and **whether each order is paid and by which method**, but it **does not** track or expose “how much the customer owes” (debt) or when/who recorded payment.

To support “customer has debt” you would add at least one of:

1. **Lightweight:** An API (and optionally UI) that computes **unpaid total per client** from `SUM(orders.total) WHERE client_id = ? AND is_paid = false` (and same for list of clients with debt). No schema change.  
2. **Richer:** Add `paid_at` (and optionally `recorded_by`) on `orders`, and a `payments` table for history/partial payments; then derive or store client balance and expose it in API and client/order UIs.

This document can be used as the spec for extending the current payment tracking toward the full list in Section 1.
