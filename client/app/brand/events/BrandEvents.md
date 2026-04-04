# Brand Events Pages — Developer Guide

Two pages:
- **List page** — Route: `/brand/events` · File: `client/app/brand/events/page.tsx`
- **Detail page** — Route: `/brand/events/[id]` · File: `client/app/brand/events/[id]/page.tsx`

---

## 1. Events List Page (`/brand/events`)

### What This Page Does

Shows all campaigns created by the brand in a filterable, searchable list. Each row links to the detail page.

---

### Page Structure

```
BrandCampaignsPage
├── Header
│   ├── Title ("Campaigns") + subtitle
│   └── Search input (desktop) + Create Campaign button
├── Mobile search bar (hidden on md+)
├── Filter Row
│   ├── Status filter tabs (pill buttons, horizontally scrollable)
│   └── Domain dropdown (right side)
└── Campaign List
    ├── Loading skeletons (×4)
    ├── Empty state card
    └── Event rows (one per campaign)
        ├── Cover image + status badge + title + pool
        ├── Metrics (desktop): Domain · Submissions · Votes · End date
        ├── Metrics (mobile): submissions / votes / pool (border-separated)
        └── Manage button → /brand/events/[id]
```

---

### Header

```
[Large display title "CAMPAIGNS"]         [Search input]  [+ Create Campaign button]
[subtitle: "Manage your active and past campaigns."]
```

- Title uses `font-display text-[5rem]` uppercase with `leading-[0.92] tracking-tight`
- Subtitle uses `text-[10px] font-black uppercase tracking-[0.3em]`
- Search: `rounded-full bg-card border border-border` with `Search` icon inside — desktop only
- Create button: `bg-primary text-primary-foreground rounded-full` — shows "Create Campaign" on desktop, "New" on mobile
- Mobile search renders separately below header as a full-width `rounded-[16px]` input

---

### Filter Tabs

6 status tabs in a horizontal scrollable row (`overflow-x-auto scrollbar-none`):

| Tab key | Label |
|---|---|
| `all` | All |
| `posting` | Active |
| `voting` | Voting |
| `scheduled` | Scheduled |
| `draft` | Draft |
| `completed` | Completed |

**Active tab style:** `bg-primary text-primary-foreground border-primary`
**Inactive tab style:** `bg-card text-muted-foreground border-border hover:border-primary/40`

Each tab shows a **count badge** (hidden when 0):
- Active tab: `bg-white/20`
- Inactive tab: `bg-secondary`

---

### Domain Dropdown

A `<select>` positioned to the right of the filter tabs:
- Options: "All Domains" + one per unique `event.category` (sorted A–Z)
- Active (non-all): `bg-primary text-primary-foreground border-primary`
- Inactive: `bg-card text-muted-foreground border-border`
- Has a `Tag` icon on the left and `ChevronDown` on the right (both `pointer-events-none`)
- `appearance-none` + manual icons for cross-browser custom look

---

### Filtering Logic

All filters are `useMemo` computed from the `events` array:
```ts
let list = events
if (filter !== "all")       list = list.filter(e => e.status === filter)
if (domainFilter !== "all") list = list.filter(e => e.category === domainFilter)
if (search.trim())          list = list.filter(e => e.title.toLowerCase().includes(q))
```

---

### Loading State

4 animated `SkeletonCard` components while `loading === true`. Each skeleton:
- A `rounded-[16px] bg-secondary/60` square for the image
- Three lines of varying widths for the text
- Hidden desktop metrics columns with blocks
- `animate-pulse` on the whole card

---

### Empty State

Centered card with:
- `Layers` icon (muted)
- Bold message: "No campaigns match your search" or "No campaigns yet"
- Subtext
- Create Campaign button (only shown when not searching)

---

### Event Row Card

```
[Cover image 80×80 (md: 64×64)]  [Status badge + type + time left]  [Metrics]  [Manage →]
                                  [Event title (truncated)]
                                  [Pool: $xxx]
```

**Cover image:**
- `w-20 h-20 md:w-16 md:h-16 rounded-[16px] overflow-hidden border border-border/50`
- Falls back to a `Layers` icon placeholder if no `imageUrl` or `imageCid`
- If `imageCid`: URL = `https://gateway.pinata.cloud/ipfs/{cid}`

**Status badge:**
- `px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border`
- Colors by status:

| Status | Style |
|---|---|
| `posting` | `bg-green-500/10 text-green-500 border-green-500/20` |
| `voting` | `bg-purple-500/10 text-purple-500 border-purple-500/20` |
| `scheduled` | `bg-blue-500/10 text-blue-500 border-blue-500/20` |
| `draft` | `bg-yellow-500/10 text-yellow-500 border-yellow-500/20` |
| `completed` | `bg-muted text-muted-foreground border-border` |
| `cancelled` | `bg-red-500/10 text-red-400 border-red-500/20` |

**Time left** (shown for posting/voting/scheduled):
```ts
timeLeft(endTime) → "Xd left" or "Xh left" or "Ended"
```

**Desktop metrics** (hidden on mobile, separated by `border-l border-border/50`):

| Column | Icon | Data |
|---|---|---|
| Domain | `Tag` | `event.category` |
| Subs | `Users` | `event._count.submissions` |
| Votes | — | `event._count.votes` |
| Ends | `Calendar` | `toLocaleDateString("en-US", { month:"short", day:"numeric" })` |

**Mobile metrics** (hidden on desktop):
```
{submissions} submissions  |  {votes} votes  |  ${pool}
```
Separated by `w-px h-3 bg-border` dividers.

**Manage button:**
- `px-4 py-2 rounded-xl bg-secondary hover:bg-primary hover:text-primary-foreground`
- Full-width on mobile, auto-width on desktop
- Links to `/brand/events/${event.id}`

---

### Data Fetching

```ts
getBrandEvents()  // GET /events/brand/me — returns Event[]
```
From `client/services/event.service.ts`. Fired on mount, errors silently fall back to `[]`.

Pool displayed: `calculateTotalPool(event)` from `client/lib/eventUtils.ts`
```ts
(baseReward * capacity) + topReward + leaderboardPool
```

---

---

## 2. Event Detail Page (`/brand/events/[id]`)

### What This Page Does

Brand's management view of a single campaign. Shows the event banner, real-time participant list, voting options (for vote-only events), and a sidebar with reward info, countdown timer, and participants.

---

### Page Structure

```
BrandEventDetailPage
├── Breadcrumb                  ← "Campaigns > {event title}" + Edit button
├── Loading skeleton
├── Error state
└── Main layout (flex col → lg:flex-row)
    ├── Left column
    │   ├── Banner card          ← cover image + gradient overlay + title
    │   ├── Participants tab bar ← count + grid/list toggle
    │   └── Content area
    │       ├── Upcoming state   ← "Coming Soon" + launch date
    │       ├── Vote-only grid   ← VoteSubmissionCard (read-only, disabled)
    │       └── Post/Completed   ← ParticipantsGrid (ParticipantCard per submission)
    └── Right column (sticky, lg:w-[300px])
        └── EventSidebar
            ├── Event info card
            │   ├── Brand logo + name
            │   ├── Countdown timer (posting or voting end)
            │   ├── Participant progress bar
            │   ├── Active viewers (live, green dot)
            │   └── Social links (Twitter / Instagram / Website)
            ├── Rewards card
            │   ├── Grand-Prize Winner
            │   ├── Leaderboard Pool
            │   ├── Per Submission reward
            │   └── Submission guidelines
            └── Participants panel
                └── Up to 8 participant rows (avatar + name + handle)
```

---

### Breadcrumb

```
Campaigns > {event.title}                              [Edit]
```
- "Campaigns" links to `/brand/events`
- "Edit" links to `/brand/events/${id}/edit` — small `rounded-full bg-white/[0.04] border border-white/[0.08]` ghost button

---

### Banner Card

`rounded-[24px] overflow-hidden h-[220px] md:h-[260px]`

Layers from back to front:
1. Cover image (`object-cover w-full h-full`)
2. Gradient overlay: `bg-gradient-to-r from-black/85 via-black/50 to-black/10`
3. Content (`absolute inset-0 p-6 flex flex-col justify-between`):
   - **Top**: status badge pill (`bg-black/30 backdrop-blur-md border border-white/10`)
     - Active: "Posting phase" or "Voting phase"
     - Completed: `bg-black/40 border-yellow-500/30 text-yellow-300` with Trophy icon
   - **Bottom**: large display title (`font-display text-[5rem] uppercase leading-[0.92]`) + description (line-clamp-2)

---

### Display Modes

The content area renders differently based on `displayMode`:

| Mode | Condition | What shows |
|---|---|---|
| `upcoming` | status = scheduled/draft | "Coming Soon" centered with start date |
| `vote` | vote_only + not completed | `VoteSubmissionCard` grid (read-only, disabled) |
| `post` | post_and_vote + posting/voting | `ParticipantsGrid` — creator submissions |
| `completed` | status = completed | `ParticipantsGrid` with winner podium |

---

### Tab Bar (above content area)

Shown for all non-upcoming modes:
```
[Users icon]  Participants  [count badge]             [Grid icon | List icon]
```
- Count badge: `bg-white/[0.05] border border-border/40 rounded-full`
- Grid/List toggle: `border border-border/40 rounded-lg overflow-hidden`, active = `bg-white/10`

---

### `ParticipantsGrid` Component

Splits submissions into **winners** (rank 1–3) and **others**:

**Winners section** (completed events only):
- `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3`
- Trophy icon header + "Winners" label

**Others section:**
- `grid grid-cols-2 md:grid-cols-3` (grid view) or `flex flex-col gap-3` (list view)
- Staggered enter animation: `delay: idx * 0.03`

**`ParticipantCard`** — one card per submission:

```
[rank badge — podium only]
[Thumbnail image — completed events only, aspect-4/3]
[Avatar] [Display name / @handle]    [vote count — completed only]
```

Rank badge colors:
| Rank | Text | Background |
|---|---|---|
| 1 (Winner) | `text-yellow-400` | `bg-yellow-500/15 border-yellow-500/25` |
| 2 | `text-slate-300` | `bg-slate-500/15 border-slate-500/25` |
| 3 | `text-amber-500` | `bg-amber-700/15 border-amber-700/25` |

Winner card outline: `bg-yellow-500/5 border-yellow-500/20`
Normal card: `bg-white/[0.03] border-white/[0.07]`

---

### `VoteSubmissionCard` Component (vote-only events)

File: `client/components/events/VoteSubmissionCard.tsx`

Used in read-only mode for the brand's view of vote-only proposals:
```ts
<VoteSubmissionCard
  submission={toVoteSubmission(sub)}
  isVoted={false}
  isPending={false}
  onVote={() => {}}
  disabled={true}
  optionIndex={idx}
  showVoteCount={true}
/>
```

`toVoteSubmission()` maps a `Submission` to `VoteSubmission`:
```ts
{
  id, creator: { name, avatar, handle },
  media, mediaType: "image" | "text",
  textContent, voteCount, rank, isOwn: false
}
```

---

### `EventSidebar` Component

Right column — `sticky top-6`, `lg:w-[300px]`.

**Event Info Card** (`bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5`):

1. **Brand row**: logo (10×10 rounded-xl, fallback initial letter in `bg-[#A78BFA]/10`) + brand name + category tag
2. **Countdown** (if not completed): `Countdown` component in a pill
   - Posting phase → orange: `bg-orange-500/8 border-orange-500/20`
   - Voting phase → lime: `bg-lime-400/5 border-lime-400/20`
3. **Participant progress bar**:
   - Label: "Participating" + current count / capacity
   - Progress bar: `h-1.5 rounded-full bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C]`
   - Animated with Framer Motion on mount
4. **Active viewers** (if > 0): pulsing green dot + "Watching Now" + count in `text-green-400`
5. **Social links**: Twitter / Instagram / Website buttons (enabled if brand has links, greyed out if not)

**Rewards Card** (`bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5`):

- Header: Trophy icon + "Rewards Pool" + "Guaranteed" badge in `text-[#A78BFA]`
- Grand-Prize Winner: large `$XX,XXX` in `text-2xl font-black` inside `bg-[#A78BFA]/5 border border-[#A78BFA]/15 rounded-[14px] p-4`
- Leaderboard Pool: `text-xl font-black`
- Per Submission: `text-lg font-black`
- Submission guidelines: numbered list with orange number badges

**Participants Panel** (`bg-white/[0.03] border border-white/[0.08] rounded-[20px] p-5`):

- Up to 8 participant rows, each:
  - Rank number badge (round, `bg-foreground/5`)
  - Avatar (32×32 rounded-full)
  - Display name + @handle
  - Staggered enter animation: `delay: idx * 0.04`
- "+N more" shown if total > 8
- Empty state: `UserCircle2` icon + "No participants yet"

---

### Real-Time Updates (WebSocket)

Uses `useSocket()` context. On mount:
```ts
socket.emit("join-event", id)
```

Events listened:
| Socket event | Effect |
|---|---|
| `vote-update` | `{ submissionId, delta }` → updates `sub._count.votes` in state |
| `presence-update` | `{ activeCount }` → sets `activeViewers` |
| `participant-update` | re-fetches `getEventParticipants(id)` |

On unmount: `socket.emit("leave-event", id)` + removes all listeners.

---

### Data Fetching

```ts
getEventById(id, true)         // GET /events/:id — full event with brand, proposals
getEventParticipants(id)       // GET /events/:id/participants
getEventSubmissions(id, {...}) // GET /events/:id/submissions (post_and_vote only)
```

For **vote_only** events: `proposals` array is mapped to fake `Submission` objects so the same grid component can render them.

For **post_and_vote** events: actual submissions fetched separately, sorted by rank then votes.

---

### Key Types

**`Event`** (from `event.service.ts`) — fields used on this page:

| Field | What it is |
|---|---|
| `id`, `title`, `description`, `status` | Basic identity |
| `eventType` | `"vote_only"` or `"post_and_vote"` |
| `category` | Domain tag |
| `imageUrl` / `imageCid` | Cover image |
| `startTime`, `endTime`, `postingEnd` | Scheduling |
| `capacity` | Max participants |
| `baseReward`, `topReward`, `leaderboardPool` | Reward pools |
| `proposals[]` | Vote-only options (`id`, `title`, `imageCid`, `voteCount`, `finalRank`) |
| `brand` | `{ name, logoCid, logoUrl, socialLinks }` |
| `_count` | `{ votes, submissions }` |
| `submissionGuidelines` | Shown in sidebar rewards card |

**`Submission`** (from `submission.service.ts`):

| Field | What it is |
|---|---|
| `id`, `userId`, `eventId` | Identity |
| `imageUrl` / `imageCid` | Submitted image |
| `content` | Optional caption / text |
| `user` | `{ displayName, username, avatarUrl }` |
| `_count.votes` | Vote count for this submission |
| `rank` | Final rank (1 = winner), set after completion |

---

### Utility Functions

| Function | File | What it does |
|---|---|---|
| `calculateTotalPool(event)` | `client/lib/eventUtils.ts` | `(baseReward × capacity) + topReward + leaderboardPool` |
| `formatCount(n)` | `client/lib/eventUtils.ts` | Formats large numbers: `1.2k`, `1.5M` etc. |
| `imgUrl(imageUrl, cid)` | Inline | Prefers `imageUrl`, falls back to Pinata IPFS URL |
| `avatarUrl(_, name)` | Inline | Generates fallback avatar from `ui-avatars.com` |
| `timeLeft(endTime)` | Inline (list page) | Returns `"Xd left"` / `"Xh left"` / `"Ended"` |

---

### Key Design Patterns

- **Dark glass cards**: `bg-white/[0.03] border border-white/[0.08] rounded-[20px]` — the core card pattern used throughout the sidebar and content
- **Purple accent `#A78BFA`**: used for participant counts, rewards, category tags, brand fallback initial
- **Orange gradient progress bar**: `from-[#F97316] via-[#EA580C] to-[#C2410C]` — animated on mount with Framer Motion
- **Display font titles**: `font-display text-[5rem] uppercase leading-[0.92] tracking-tight` — same pattern as list page
- **Staggered list animations**: each card animates in with `delay: idx * 0.03-0.04` for a cascade effect
- **Sticky sidebar**: `sticky top-6` on the right column, content scrolls behind it
- **Two-column layout breakpoint**: `flex-col` on mobile → `flex-row` at `lg` (1024px)
- **Thumbnail visibility rule**: submission thumbnails and vote counts only show when `status === "completed"` — during active phases only avatars are shown
