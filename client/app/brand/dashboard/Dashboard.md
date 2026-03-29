# Brand Dashboard — Developer Guide

Route: `/brand/dashboard`
File: `client/app/brand/dashboard/page.tsx`

---

## What This Page Does

The brand dashboard is the central hub for a brand owner. It shows:
- Who the brand is (banner with logo, name, tagline, description)
- Quick summary stats (total events, followers, total spend)
- Three tabs of data: **Overview**, **Stats**, **Insights**

---

## Page Structure

```
BrandDashboard (page)
├── BrandBanner          ← always visible at top
└── TabHeader            ← tab name (left) + switcher pills (right)
    ├── OverviewTab      ← list of events, list or card view
    ├── StatsTab         ← graphs and filters
    └── InsightsTab      ← AI-style insight panels per event
```

---

## Data Fetching

All three API calls fire in parallel on mount using `Promise.allSettled`. If any one fails, the rest still load — nothing crashes the whole page.

```ts
Promise.allSettled([
  getBrandEvents(),           // all events for this brand
  getCurrentBrand(),          // brand profile (name, tagline, description, logo, followerCount)
  getBrandAnalyticsOverview() // aggregate analytics across all events
])
```

### `getBrandEvents()`
- **Service:** `client/services/event.service.ts`
- **Endpoint:** `GET /events/brand/me`
- **Returns:** `Event[]` — all events created by the authenticated brand
- **Used for:** Overview tab (event list/cards), Stats tab (filters + charts), Insights tab (per-event cards)

### `getCurrentBrand()`
- **Service:** `client/services/brand.service.ts`
- **Endpoint:** `GET /brands/me`
- **Returns:** `Brand` — brand profile including name, tagline, description, logoCid, logoUrls, followerCount, categories, etc.
- **Used for:** BrandBanner (logo, name, tagline, description, follower count)

### `getBrandAnalyticsOverview()`
- **Service:** `client/services/brand.service.ts`
- **Endpoint:** `GET /analytics/brand/overview`
- **Returns:** `BrandAnalytics` — aggregate stats + per-event summaries
- **Used for:** Stats tab charts, Insights tab decision data

---

## Key Types

### `Event` (from `event.service.ts`)
Important fields used in dashboard:
| Field | What it is |
|---|---|
| `id`, `title`, `status` | Basic identity |
| `eventType` | `"post_and_vote"` or `"vote_only"` — determines if Posts column shows |
| `category` | Decision domain (e.g. "Fashion") |
| `imageUrl` / `imageCid` | Cover image. `imageCid` is an IPFS hash, full URL is `https://gateway.pinata.cloud/ipfs/{cid}` |
| `baseReward`, `topReward`, `leaderboardPool`, `capacity` | Pool components — see `calculateTotalPool` |
| `eventAnalytics` | `{ totalViews, totalVotes, totalSubmissions, uniqueParticipants }` — richer analytics if available |
| `_count` | `{ votes, submissions }` — fallback counts |
| `proposals` | Array of votable options with `voteCount` per option |

### `Brand` (from `brand.service.ts`)
| Field | What it is |
|---|---|
| `name`, `tagline`, `description` | Display text |
| `logoCid` / `logoUrls` | Logo. Prefer `logoUrls.medium`. Fallback: `https://gateway.pinata.cloud/ipfs/{logoCid}` |
| `followerCount` | Number of users following this brand |
| `categories` | Array of domains the brand operates in |
| `isVerified` | Whether the brand passed verification |

### `BrandAnalytics` (from `getBrandAnalyticsOverview`)
| Field | What it is |
|---|---|
| `totalEvents` | Total events created |
| `totalVotesAcrossEvents` | Sum of all votes |
| `totalUniqueParticipants` | Deduplicated voter count |
| `decisionConfidenceScore` | 0–1 float. ≥0.75 = high, 0.5–0.75 = moderate, <0.5 = low |
| `averageEntropy` | Vote spread — high = audience is split, low = clear winner |
| `averageWinningMargin` | Average % lead of #1 content over #2 |
| `averageHistoricalAlignment` | How consistent this brand's winners are vs historical patterns |
| `avgParticipantTrustScore` | Trust quality of participants who voted |
| `overallVotesByGender` | `{ male, female, nonBinary, other, unknown }` |
| `overallVotesByAgeGroup` | `{ 24_under, 25_34, 35_44, 45_54, 55_64, 65_plus, unknown }` |
| `eventsSummary` | `EventSummary[]` — one entry per event with per-event analytics |

### `EventSummary` (inside `BrandAnalytics.eventsSummary`)
| Field | What it is |
|---|---|
| `eventId` | Matches `Event.id` — use to join with events array |
| `totalVotes`, `totalSubmissions` | Per-event counts |
| `uniqueParticipants` | Deduplicated voters for this event |
| `winningMargin` | % gap between rank 1 and rank 2 content |
| `topContentVotePercent` | % of total votes the winning content got |
| `entropy` / `normalizedEntropy` | Vote spread (raw and 0–1 normalized) |
| `historicalAlignment` | 0–1, how much this event's winner fits historical brand patterns |
| `votesByGender` | Gender breakdown for this specific event |
| `votesByAgeGroup` | Age breakdown for this specific event |

---

## `calculateTotalPool(event)` — `client/lib/eventUtils.ts`

Computes total dollar value of a campaign's reward pool:

```ts
(baseReward * capacity) + topReward + leaderboardPool
```

- `baseReward` = $ per vote
- `capacity` = max participants
- `topReward` = fixed top prize
- `leaderboardPool` = leaderboard prize pool

Returns `0` if no rewards are set. Format as `$${n.toLocaleString()}` for display, or `"—"` if zero.

---

## Tab: Overview

Two view modes toggled from the header row (top right):

**List view** — a table with columns:
`Sl no | Status | Event Title | Type | Domain | Cost | Views | Votes | Posts | Confidence`

- Posts column shows `N/A` for `vote_only` events
- Decision Confidence shows `—` (not yet in backend response)
- Each row links to `/brand/events/{event.id}`

**Card view** — grid of event cards showing:
- Cover image, status badge, event type
- Views, votes, cost
- Vote % bars per proposal (from `event.proposals[].voteCount`)
- End date

---

## Tab: Stats

Three filters at the top (all independent):
- **Decision Domain** — filters by `event.category`
- **Events** — filter to a single event by id (default: all)
- **Time range** — 7d / 30d / 90d / All time (filters by `event.endTime`)

Charts:
| Chart | Type | Data source |
|---|---|---|
| Views, Votes & Posts per Event | Area chart | `event.eventAnalytics` or `event._count` |
| Voter Demographics | Double bar chart | `analytics.overallVotesByGender` × `overallVotesByAgeGroup` |
| Decision Quality per Event | Line chart | `analytics.eventsSummary` (entropy, margin, alignment) |
| Decision Confidence & Quality | Gauge + metric list | `analytics.decisionConfidenceScore` + supporting fields |

> Clicks breakdown, profile visits, and follower growth are **not yet available** from the backend — they show "Not available" rather than mock data.

---

## Tab: Insights

### Overall Panel
A 3-section summary across all events:

| Section | Logic |
|---|---|
| **Result** | Total votes, unique participants, gender split percentage |
| **Reason** | Average winning margin + entropy interpretation |
| **Next Action** | Based on `decisionConfidenceScore`: ≥75% → move on, 50–75% → run more tests, <50% → new ideas |

### Per-Event Cards
One collapsible card per event. Expand to see:

| Section | Data source |
|---|---|
| **Result** | `topContentVotePercent`, `winningMargin`, gender split |
| **Reason** | `entropy`, `normalizedEntropy`, `historicalAlignment` with plain-English interpretation |
| **Next Action** | Same DCS logic as overall panel, applied per-event via `topContentVotePercent` |
| **Outcome Notes** | Freetext saved to `localStorage` under key `aris_brand_insights` as `{ [eventId]: string }` |

> `EventSummary` is joined to `Event` by `eventId`. The join is done with `new Map()` for O(1) lookups:
> ```ts
> const summaryMap = new Map(analytics.eventsSummary.map(s => [s.eventId, s]))
> ```

---

## Tab Header Layout

```
[Tab name — large display font, left]    [list/card toggle?] [Overview | Stats | Insights pills, right]
```

- Tab name and switcher are on the same row via `flex items-center justify-between`
- The list/card toggle only renders when `active === "overview"`
- `viewMode` state lives in the page component so it persists when switching between Overview and other tabs

---

## What Is Not Yet Available from the Backend

These fields are planned but not yet returned by any endpoint. Show `"—"` or `"Not available"` — do **not** mock data.

- Per-event **decision confidence score** (Overview table column)
- **Clicks breakdown** (Vote / Event / Website / Social)
- **Profile visits**
- **Average engagement time**
- **Follower growth over time**

When backend adds these, wire them from `eventAnalytics` or a new analytics endpoint.

---

## Adding a New Chart to Stats Tab

1. Add data derivation inside `StatsTab` using `filteredEvents` or `analytics`
2. Wrap in `<div className="bg-card border border-border/60 rounded-[20px] overflow-hidden">`
3. Use `<ResponsiveContainer>` from recharts inside a fixed-height div
4. If data isn't available from backend, render: `<div className="h-full flex items-center justify-center text-sm text-muted-foreground">Not available</div>`
5. Add to the `grid md:grid-cols-2 gap-4` grid in the return

---

## Adding a New Insight Section

Per-event insight logic lives in `EventInsightCard`. The 3 sections (Result / Reason / Next Action) map to:
- `summary.topContentVotePercent` + `summary.winningMargin` + `summary.votesByGender` → Result
- `summary.entropy` + `summary.normalizedEntropy` + `summary.historicalAlignment` → Reason
- `summary.topContentVotePercent / 100` as a confidence proxy → Next Action

If you get a real per-event DCS field from backend, replace the `topContentVotePercent / 100` proxy with the actual value.
