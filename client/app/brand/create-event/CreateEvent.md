# Create Event Page — Developer Guide

Route: `/brand/create-event`
File: `client/app/brand/create-event/page.tsx`

---

## What This Page Does

A multi-step wizard that lets a brand owner create a campaign (called an "event"). The brand chooses a type, fills in details, sets rewards, optionally configures voting options, previews the result, then launches it on-chain.

---

## Page Structure

```
CreateEventPage
├── Step Progress Bar          ← top of card, dots + titles
├── AnimatePresence (slide)    ← animated step transitions
│   ├── Step 1: TypeStep       ← pick Vote or Post campaign
│   ├── Step 2: BasicsStep     ← name, description, domain, schedule, targeting, banner
│   ├── Step 3: RewardsStep    ← participants, pools, cost breakdown
│   ├── Step 4: ContentStep    ← voting options (vote type only)
│   └── Step 5: ReviewStep     ← full live preview of the event
├── Back / Next buttons        ← bottom navigation
├── LaunchStepModal            ← on-chain deployment modal (opens from review step)
└── BrandImageGeneratorModal   ← AI image generator (banner + per-option images)
```

---

## Steps Overview

| # | Step ID   | Title                    | Visible for         |
|---|-----------|--------------------------|---------------------|
| 1 | `type`    | What type of event?      | Both types          |
| 2 | `basics`  | Tell us about your event | Both types          |
| 3 | `rewards` | Participants & rewards   | Both types          |
| 4 | `content` | Set up voting options    | **Vote only**       |
| 5 | `review`  | Review & launch          | Both types          |

> For **Post campaigns**, the `content` step is skipped. `visibleSteps` is filtered dynamically.

---

## Event Types

| Type          | ID     | Description                                          |
|---------------|--------|------------------------------------------------------|
| Vote Campaign | `vote` | Brand defines fixed options; audience votes on them  |
| Post Campaign | `post` | Creators submit image posts; audience votes for best |

Selecting a type on Step 1 immediately auto-advances to Step 2 (300ms delay).

---

## Step Details

### Step 1 — Type Selection

Two large cards side by side:
- **Vote Campaign** — lime-400 icon (`ThumbsUp`)
- **Post Campaign** — orange-400 icon (`Upload`)

Clicking a card sets `form.type` and auto-advances. Cards highlight with `border-primary bg-primary/10` when selected.

---

### Step 2 — Basics

Fields:
| Field | Type | Notes |
|---|---|---|
| Event Name | Text input | Max 120 chars |
| Description | Textarea | Min 20 chars, max 2000 |
| Domain | Pill selector | 12 preset domains + "Other" custom input |
| Schedule | Toggle + date pickers | "Start Immediately" toggle; date pickers disabled when toggled on |
| Audience Targeting | Pill selectors | Gender, Age Group, Region (India) — all optional |
| Event Banner | Image upload / AI generate | 16:9, JPEG/PNG/WEBP, max 5 MB |
| Sample Images | Image upload | Post events only · 1–4 required · 1:1 ratio |

**Schedule — Vote events:**
- Start date (disabled if start immediately)
- End date + duration presets: `1h 6h 24h 48h 72h 7d`

**Schedule — Post events:**
- Start date
- Posting End date (orange) — when posting closes, voting begins
- Voting End date (lime) — event closes
- Presets for both posting and voting phases independently
- Computed duration labels shown in real time

**Audience Targeting (inside a rounded panel):**
- Gender: `All Genders | Male | Female`
- Age Group: `All Ages | 18-24 | 25-34 | 35-44 | 45-54 | 55-64 | 65+`
- Region: `North | South | East | West` (multi-select, empty = all allowed)

**Event Banner:**
- Empty state: two buttons — "Generate with AI" and "Upload"
- Filled state: preview image with hover overlay showing Regenerate / Upload / Remove buttons
- AI generation opens `BrandImageGeneratorModal`

**Sample Images (Post only):**
- Grid of uploaded previews (3 columns, 1:1 aspect ratio)
- X button per image on hover
- Add button shows up to 4 images max
- Hidden file input

---

### Step 3 — Rewards

**Reward Rate Constants:**
```ts
BASE_RATE    = $0.030  // per vote (voter reward)
CREATOR_RATE = $0.050  // per creator submission (post events)
FEE_VOTE     = $0.015  // platform fee per participant (vote)
FEE_POST     = $0.020  // platform fee per participant (post)
```

**Fields:**
| Field | Notes |
|---|---|
| Max Voters | Number, min 10, max 100,000 |
| Base Reward per Vote (auto) | Read-only, shows `BASE_RATE` |
| Creator Base Reward (auto, post only) | Read-only, shows `CREATOR_RATE` |
| Voter Base Reward (auto, post only) | Read-only second row, shows `BASE_RATE` |
| Top Prize Pool (USDC) | Required, min = `BASE_RATE × maxParticipants` |
| Leaderboard Pool (USDC, post only) | Required for post, split 50/35/15 to top 3 creators |
| Apply Event Credit | Toggle, shown only if brand has refund credit balance |

**Cost Breakdown panel** (shown when `pCount > 0`):
```
Voter/Creator base pool  = BASE_RATE × pCount
Top prize pool           = effectiveTop
Leaderboard pool         = effectiveLeaderboard (post only)
Platform fee             = FEE × pCount
─────────────────────────────────────────────
Total deposit            = sum − refund credit
```

**Total deposit formula:**
```ts
totalLocked = basePool + effectiveTop + creatorPool + effectiveLeaderboard + platformFee
netDeposit  = totalLocked − (useRefundCredit ? refundCreditAmount : 0)
```

---

### Step 4 — Content (Vote events only)

A list of voting options (proposals). Each row contains:
- Number badge
- Text input (option label)
- Image slot: **Generate with AI** button or **Upload** button
  - Once uploaded: shows thumbnail (16×16) with X to remove, click to lightbox
- Remove button (shown only when > 2 options exist)

Constraints:
- Minimum 2 options required to proceed
- Maximum 10 options

**AI Suggestions button** (top right):
- Calls `generateAiProposals({ title, description, category })` from `client/services/ai.service.ts`
- Auto-fills up to 6 option titles

**Per-option image AI:**
- Opens `BrandImageGeneratorModal` for the specific option index
- Returns a `File` + preview URL, stored on `proposals[idx].media`

---

### Step 5 — Review

A **full live preview** that mirrors how the event will look to participants on the event detail page (`/brand/events/[id]`).

**Left column:**
- Banner image (click to go back to Basics step with edit overlay on hover)
- For **Vote events**: tab bar (Trending / Latest / Top) + proposal cards showing options with vote bar UI
- For **Post events**: Submit Entry card (upload zone, caption textarea, submit button — all disabled/preview-only) + Rules & Eligibility card

**Right column (sidebar):**
- Pool stats card (Total Locked, Base Pool, Top Prize, Platform Fee)
- Domain / type tags
- Demographic targeting chips (gender, age, regions)
- Schedule details (start/end/posting dates)
- Edit buttons to jump back to Basics, Rewards, Content steps
- **Launch button** → opens `LaunchStepModal`

---

## LaunchStepModal

File: `client/components/brand/LaunchStepModal.tsx`

A 4-step on-chain deployment modal:

| Step | Label | What happens |
|---|---|---|
| 0 | Preparing event | Uploads cover image to Pinata IPFS, checks USDC balance |
| 1 | Approving USDC | Encodes USDC approval transaction (gasless via Privy) |
| 2 | Locking reward pool | Sends `createEvent` transaction to Polygon Amoy |
| 3 | Event Activated | Backend notified, redirects to brand dashboard |

Each step shows:
- Spinner (active), check (done), X (error)
- Step label + description
- On error: retry button

Props:
```ts
{ open, form: LaunchFormData, onClose, onSuccess }
```

---

## BrandImageGeneratorModal

File: `client/components/create/BrandImageGeneratorModal.tsx`

Shared AI image generation modal. Used for:
- Event banner (in Basics step)
- Per-option images (in Content step)

Props:
```ts
{
  isOpen, onClose,
  onAddToOption: (file: File, preview: string) => void,
  brandId, eventTitle, eventDescription, optionLabel
}
```

---

## Form State

All state lives in a single `form` object (type `FormData`):

```ts
{
  type: "vote" | "post"
  title, description, domain
  maxParticipants, baseReward, topPrize, leaderboardPool
  proposals: [{ title, order, media?, mediaPreview? }]
  preferredGender, ageGroup, regions[]
  startImmediately, startDate, endDate, postingEndDate, timezone
  rules, hashtags[], contentType[]
  coverImage: File | null
  sampleImages: File[]
  useRefundCredit, refundCreditAmount
}
```

Updated via `set(patch)` helper:
```ts
const set = useCallback((patch: Partial<FormData>) =>
  setForm((f) => ({ ...f, ...patch })), []);
```

---

## Step Validation

Per-step validation runs on "Next" click via `validateStep(idx)`. Returns an error string or `null`.

| Step     | Key checks |
|----------|-----------|
| `type`   | No validation |
| `basics` | Title required, description ≥ 20 chars, domain set (not "Other"), cover image required, date logic (min 10 min duration, posting before voting for post events), sample image ≥ 1 (post) |
| `rewards`| maxParticipants 10–100k, topPrize ≥ minTop, leaderboardPool ≥ minLeaderboard (post only) |
| `content`| At least 2 proposals with non-empty titles |
| `review` | No validation |

Errors shown via `toast.error(...)`.

---

## Navigation

```ts
goNext() → validates current step → increments currentStep (direction = 1)
goBack() → decrements currentStep (direction = -1)
```

Step transitions use Framer Motion slide animation:
```ts
enter:  { x: dir > 0 ? 1000 : -1000, opacity: 0 }
center: { x: 0, opacity: 1 }
exit:   { x: dir < 0 ? 1000 : -1000, opacity: 0 }
```

---

## Reusable UI Components (defined inline)

| Component | Description |
|---|---|
| `Label` | `<label>` with optional "(optional)" suffix |
| `Input` | Styled `<input>` with `bg-secondary/40 border border-border rounded-xl` |
| `Textarea` | Same styles as Input, `resize-none` |
| `InfoTooltip` | Hover tooltip using a `<Info>` icon — shows text on hover above |

---

## External Services Used

| Service | File | Purpose |
|---|---|---|
| `generateAiProposals` | `client/services/ai.service.ts` | AI-generated voting option titles |
| `readBrandRefundBalance` | `client/lib/blockchain/contracts.ts` | Check brand's on-chain refund credit |
| `createEvent` | `client/services/event.service.ts` | POST event to backend |
| `uploadToPinata` | `client/lib/pinata-upload.ts` | Upload cover image to IPFS |
| Privy smart wallet | via `useWallet` | Gasless USDC approve + createEvent transaction |

---

## Key Design Patterns

- **Dark card layout**: All steps render inside a centered `max-w-xl` card with `bg-card border border-border rounded-[28px]`
- **Pill selectors**: Used for domain, gender, age, region — active state is `border-primary bg-primary/10 text-primary`
- **Duration presets**: Quick-select chips `1h 6h 24h 48h 72h 7d` that set end date relative to start
- **Cost breakdown**: Real-time computed panel that updates as participant count / prize values change
- **Review = live preview**: Step 5 renders the actual event UI so brand can see exactly what participants will see before launching
- **Refund credit**: If brand has on-chain credit (from cancelled/expired events), a toggle applies it to reduce the deposit
