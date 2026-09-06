# CreditsPage.tsx

**Location:** `prsnl/FRONTEND/src/pages/CreditsPage.tsx`  
**Type:** Authenticated Page

## What This File Does

Displays the user's credit balance with a visual progress bar, a reference grid of feature costs, and a tabbed view showing transaction history and a "Buy Credits" section (coming soon). Provides full visibility into credit usage and spending.

## How It Fits Into The System

- **Triggers:** Rendered at `/credits` route; requires authentication
- **Dependencies:** `CreditContext` (balance, featureCosts), `api.ts` (apiGetTransactions), `CreditDisplay` components
- **Dependents:** None — leaf page component

## Code Breakdown

### Balance Header

Large display of current credits with a progress bar showing remaining/total. Uses the `CreditCard` component variant from `CreditDisplay.tsx`. Color-coded based on remaining percentage.

### Feature Cost Reference Grid

Uses `FeaturePricingTable` component to show a grid of all features and their credit costs:
- ATS Score: X credits
- Deep Analysis: X credits
- Hiring Intel: X credits
- Interview Session: X credits
- Cover Letter: X credits
- Humanize: X credits

Costs are fetched dynamically from the backend (not hardcoded).

### Tabbed View

#### Transaction History Tab

- Fetches transaction list from `apiGetTransactions()`
- Renders as a timeline with `TransactionRow` components
- Each row shows: feature icon, feature label, relative time ("2 hours ago"), and credit delta (+/- amount)
- Positive deltas (grants, purchases) shown in green
- Negative deltas (usage) shown in neutral/gray
- Empty state message if no transactions yet

#### Buy Credits Tab

- Currently shows "Coming Soon" placeholder
- Will eventually display pricing plans and payment integration
- Placeholder cards showing planned tiers

### TransactionRow Component

Inline component that renders a single transaction:
- Icon mapped from feature name (e.g., FileText for resume, Brain for analysis)
- Feature label (human-readable name)
- Relative timestamp using a time-ago utility
- Credit amount with +/- sign and color coding

## Things To Know Before Editing

- Feature costs come from `CreditContext` (fetched from backend) — don't hardcode them
- Transaction history may grow large — consider pagination if not already implemented
- The "Buy Credits" tab is a placeholder — when implementing payments, this is where Stripe/payment UI goes
- The progress bar percentage is `balance / totalCredits * 100` — `totalCredits` comes from the user's plan
- Icons for transaction types should match the icons used in the feature cost grid for consistency
