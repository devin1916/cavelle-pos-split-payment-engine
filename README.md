# CAVELLE POS

**Precision Checkout & Split-Payment Engine**

CAVELLE POS is a retail point-of-sale checkout terminal built as a software engineering
technical assessment. It splits a single order across cash, card and bank transfer, and
calculates every figure — discount, taxable amount, 8% VAT, payable, paid, remaining and
change due — with exact cent-level precision in LKR.

## Technology Stack

- React 19 + TypeScript (strict mode)
- Vite
- Tailwind CSS 4
- `useReducer` for checkout state — no external state-management library
- Vitest for automated unit tests
- No backend, no database, no extra runtime dependencies (`react` + `react-dom` only)

## Getting Started

```bash
npm install        # install dependencies
npm run dev        # start the dev server
npm test           # run the financial test suite
npm run typecheck  # TypeScript project check
npm run build      # type-check + production build
```

## Project Structure

```text
src/
├── components/
│   ├── checkout/      # QuickCheckoutModal, header, discount, tax, summary, success
│   ├── cart/          # CartTable
│   ├── payment/       # PaymentSection, PaymentMethodField, icons
│   └── ui/            # Button, Panel, Modal primitives
├── hooks/             # useCheckout — typed wrapper around useReducer
├── reducers/          # checkoutReducer + initial state factory
├── utils/
│   ├── money.ts       # integer-cent parsing, rounding, LKR formatting
│   ├── calculations.ts# the single financial pipeline
│   ├── payments.ts    # split-payment helpers (limits, cash required)
│   ├── validation.ts  # validation rules returning structured errors
│   └── order.ts       # order reference generator
├── types/             # domain types (CartItem, Discount, Payment, CheckoutState…)
├── constants/         # VAT rate, currency config, validation messages, options
├── data/              # mock cart (prices in integer cents)
├── tests/             # Vitest suites (money, calculations, payments, reducer)
├── App.tsx
├── main.tsx
└── index.css
```

## Financial Model

### Money representation

Every monetary value in the system is an **integer number of cents** (LKR minor units):

```
LKR 1,250.50  →  125050
```

Percentages are stored as **integer basis points** (10.5% → `1050`). User input arrives as
text, is parsed by `parseMoneyToCents` / `parsePercentToBasisPoints` and quantised to
integers before it reaches any calculation. Floats only ever appear at two boundaries:
raw input parsing (quantised immediately) and display formatting.

### Calculation order (strict)

```
Subtotal        = Σ (unit price × quantity)
Discount        = percentage: roundHalfUp(subtotal × basisPoints / 10000)
                  flat:       the entered amount
                  (capped at the subtotal)
Taxable Amount  = Subtotal − Discount        (never negative)
VAT (8%)        = roundHalfUp(taxable × 800 / 10000)      ← always AFTER discount
Payable         = Taxable Amount + VAT
```

**Rounding policy:** percentages and VAT are computed with exact integer arithmetic and
rounded **half-up, once, at their own boundary** (`roundHalfUp(n, d) = floor((2n + d) / 2d)`,
which never leaves integer space). No intermediate result is ever a float.

**Discount rule (documented):** a discount larger than the subtotal is **capped at the
subtotal** (so the taxable amount can never go negative) *and* reported as a validation
error (`Discount cannot exceed the subtotal.`) that blocks completion until corrected.
A percentage above 100% is treated the same way.

### Split payments

```
Paid      = Cash + Card + Bank Transfer        (all in cents)
Remaining = max(Payable − Paid, 0)
Change    = max(Paid − Payable, 0)
```

- **Cash** may exceed the payable amount — the excess becomes **Change Due**.
- **Card / Bank Transfer** may never exceed the amount still payable after the *other*
  non-cash tenders. Over-limit entries are capped at the limit and reported with a clear
  error (`Card payment cannot exceed the remaining balance.`), which blocks completion
  until the value is corrected.
- Because non-cash tenders are structurally capped at the payable amount, any overpayment
  necessarily comes from cash — card and bank transfer can never produce change.
- `Cash required = max(Payable − (Card + Bank Transfer), 0)` updates live in the UI as
  other tenders change.

## Architecture Defence

### 1. How was financial rounding accuracy ensured?

JavaScript numbers are IEEE-754 doubles: `0.1 + 0.2 === 0.30000000000000004`. Any code that
adds, multiplies or accumulates floating-point money will eventually drift — especially
when summing many payments or applying percentage discounts.

CAVELLE POS therefore never performs arithmetic on decimal currency values:

1. **Integer minor units.** All money is an integer count of cents — `LKR 1,250.50` is
   stored and computed as `125050`. Percentages are integer basis points (`10.5% = 1050`),
   so a discount of 10.5% is `subtotal × 1050`, an integer operation.
2. **Conversion only at the edges.** Raw input text is converted by
   `parseMoneyToCents()` (rejecting invalid/negative input, quantising excess decimals
   half-up), and cents become decimals only in `formatLKR()` for display. Between those
   two edges there is no float.
3. **Exact rounding.** Percentage and VAT rounding uses
   `roundHalfUp(numerator, denominator) = floor((2n + d) / (2d))` — pure integer
   arithmetic with a defined half-up rule, applied exactly once per boundary, instead of
   relying on `Math.round` over already-divided floats.
4. **Fixed calculation order.** Subtotal → discount → taxable → VAT → payable, so VAT is
   never charged on the pre-discount subtotal and every intermediate is itself an integer
   count of cents.
5. **Presentation-layer formatting only.** `formatLKR` is the single formatter in the app
   (`Intl.NumberFormat`, fixed 2 fraction digits → `LKR 1,250.50`), so every displayed
   value has exactly two decimals and no component hand-rolls string formatting.

The test suite asserts integer-cent results directly (for example `0.10 + 0.20 → 30`
cents, and `formatLKR(30) === 'LKR 0.30'`), not just formatted strings.

### 2. Why `useReducer` instead of `useState`?

Checkout state is one **coherent aggregate**: cart, discount, three tenders, seven derived
totals, validation errors and completion status. These pieces are meaningless in isolation
and must always agree with each other.

- **Multiple `useState` calls can become inconsistent.** If `paid`, `remaining` and
  `validationErrors` were separate `useState` hooks, every input change would need a
  carefully ordered sequence of updates; it is easy to update one and forget another, and
  two updates inside the same event can render in an order the code never anticipated.
  The result is stale totals — exactly the bug class the reducer's single
  `buildState()` path eliminates: **every action re-derives all totals from the inputs in
  one place**, so state cannot self-contradict.
- **Predictable transitions.** All mutations flow through five explicit actions
  (`SET_DISCOUNT`, `UPDATE_PAYMENT`, `REMOVE_PAYMENT`, `RESET_CHECKOUT`,
  `COMPLETE_CHECKOUT`). Given a state and an action, the next state is deterministic and
  reproducible — which is what makes the reducer directly testable without rendering a
  component.
- **Business logic stays outside the UI.** Components only display state, collect input
  and dispatch actions; the reducer delegates to the pure `calculateCheckout()` pipeline.
  No JSX file contains a financial formula, so the same rules are never duplicated
  between the summary, the payment cards and the button state.
- **Pure functions are easier to test.** `calculateCheckout()`, `roundHalfUp()` and the
  validators are plain functions of their arguments — the Vitest suite exercises hundreds
  of cent-exact scenarios in milliseconds with no DOM, mocks or timers.

### 3. How would the backend prevent double charging?

Frontend validation alone **cannot** prevent double charging: a user can double-click,
retry a timed-out request, or call the API twice concurrently. The guarantee must live on
the server:

1. The client requests a checkout/order and receives a **unique order ID**.
2. For each payment attempt the client generates an **idempotency key** (a unique token
   per logical payment attempt) and sends it with the request.
3. The payment request hits the backend with `{ orderId, idempotencyKey, amount }`.
4. The backend first checks whether that idempotency key has already been processed
   (unique index lookup).
5. The whole operation runs inside a **database transaction**.
6. The order row is **locked** (`SELECT … FOR UPDATE`) or an optimistic version/atomic
   `UPDATE … WHERE status = 'unpaid'` guard is used — **concurrency control** so two
   simultaneous requests serialise instead of both proceeding.
7. The state transition is **atomic**: the order can only move `unpaid → paid` once;
   a second request observes it already paid and cannot charge again.
8. On first success, a **payment record** is inserted — with a `UNIQUE` constraint on
   `(order_id, idempotency_key)` as a database-level backstop, independent of application
   logic.
9. The order is **marked as paid** in the same transaction.
10. The transaction **commits**; for a duplicate request the backend returns the
    **original successful result** (the same idempotency key maps to the same response),
    so retries are safe and the client sees one consistent outcome.

Key mechanisms: **idempotency keys**, **unique constraints**, **transactions**,
**row locking / atomic state transitions**. Any payment gateway (e.g. Stripe) applies the
same pattern with its own idempotency keys on top.

## Automated Tests

`npm test` runs four Vitest suites focused on the pure financial domain (78 tests):

- **money.test.ts** — decimal parsing, 0.10/0.20 precision, tiny values, excess decimals,
  invalid input rejection, exact 2-decimal formatting, integer rounding.
- **calculations.test.ts** — subtotal, every discount mode (0%, normal, decimal, 100%,
  flat, over-subtotal), taxable-never-negative, VAT rounding, VAT-after-discount,
  end-to-end exact totals.
- **payments.test.ts** — no/exact/under/over payment, all split combinations, card and
  bank-transfer limits, cash-required, change after split, stale-error regression,
  invalid-amount guards, removal.
- **checkoutReducer.test.ts** — derived initial state, discount transitions, guarded
  completion, reset-to-initial.
