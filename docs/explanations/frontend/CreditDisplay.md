# CreditDisplay.tsx

**Location:** `prsnl/FRONTEND/src/components/ui/CreditDisplay.tsx`  
**Type:** UI Component

## What This File Does

A collection of credit-related display components used throughout the app. Provides multiple variants for different contexts: a full card for dashboards, a compact inline display for headers, a cost tag pill, an insufficient credits warning box, and a feature pricing table grid.

## How It Fits Into The System

- **Triggers:** Used by DashboardPage, CreditsPage, ResumeAnalysis, AIInterview, CoverLetter, and other feature pages
- **Dependencies:** `useCreditContext` (balance, totalCredits, featureCosts, canUse, shortfall)
- **Dependents:** Multiple pages import specific variants from this file

## Code Breakdown

### CreditCard

**Updated May 17, 2026: Daily credit mode support**

Full-size card component for the dashboard:
- Large credit number display with denominator (50 for daily mode, total_granted for initial mode)
- Mode detection: shows "Daily credits · resets every day" after initial 100 used
- Progress bar (remaining / displayCap) where displayCap = 50 (daily) or total_granted (initial)
- Color-coded: green (healthy >25%), amber (low 11-25%), red (critical ≤10%)
- Low credit warning with "Running low" message when balance < threshold
- Unlimited badge with infinity icon for admin/unlimited accounts
- Used on DashboardPage and CreditsPage

### CreditCompact

Inline display for tight spaces:
- Shows "X credits" in a small badge
- Infinity icon for unlimited accounts
- No progress bar, just the number
- Used in page headers or action confirmations

### FeatureCostTag

Small pill/badge showing the cost of a specific feature:
- Displays "X credits" with a coin icon
- Color-coded based on affordability:
  - Green/neutral: user can afford it
  - Red/warning: user cannot afford it
- Used next to action buttons (e.g., "Run Analysis (3 credits)")

### InsufficientCreditsWarning

Red/amber warning box that appears when a user tries to use a feature they can't afford:
- Warning icon (TrendingDown)
- Message: "Not enough credits. {feature} costs {cost} credits but you only have {remaining}."
- Shows exact shortfall calculation
- Link to credits page: "Top up →"
- Used in ResumeAnalysis, AIInterview, CoverLetter before action execution
- Only renders when `shortfall(feature)` returns a positive number

### FeaturePricingTable

Grid layout showing all features and their costs with affordability indicators:
- Feature name with emoji icon (defined in `FEATURE_ICONS` map)
- Credit cost in pill badge
- Color-coded affordability: green border (can afford), red border (cannot afford)
- Checks `balance.is_unlimited` OR `balance.remaining >= cost`
- Used on CreditsPage as a reference

**Feature costs as of June 2026:**
```
┌───────────────────┬──────────┐
│ ⚡ ATS Score      │ 5 credits│
│ 🔍 Deep Analysis  │ 15 credits│
│ 🧠 Hiring Intel   │ 25 credits│
│ 🎤 Interview      │ 25 credits│
│ ✉️ Cover Letter   │ 10 credits│
└───────────────────┴──────────┘
```

## Things To Know Before Editing

- All variants read from `useCreditContext` — they don't accept credit values as props (except where noted)
- **Daily mode detection:** If `total_granted > 100`, display logic switches to show 50 as denominator and "Daily credits" label
- **Color thresholds are percentage-based:** ≤10% red, 11-25% amber, >25% green — consistent across all variants
- The `FeatureCostTag` needs the feature key string to look up costs — make sure it matches backend `FEATURE_COSTS` keys exactly
- `InsufficientCreditsWarning` should only render when `short fall(feature) > 0` — don't show it during loading or for unlimited users
- These are presentational components — they don't trigger any API calls or mutations (context handles that)
- If you add a new paid feature, add it to `FEATURE_ICONS` map and `FeaturePricingTable`, and ensure backend has matching `FEATURE_COSTS` entry
- **Unlimited users show infinity icon** instead of numeric credit count — handled in both CreditCard and CreditCompact variants
- **Daily cap is hardcoded to 50** — if backend changes `DAILY_CREDIT_AMOUNT`, update `DAILY_CAP` constant here too
