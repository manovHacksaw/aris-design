# UI Changes – April 8 2026

## i) Participants Modal
**File:** `client/app/events/[id]/page.tsx`  
Clicking the participant avatar stack on the event detail page now opens a modal listing all participants with their avatars, a total count, and a "+N more" footer when the list is truncated.

## ii) Hide Caption/Description on Submission Images
**File:** `client/components/events/VoteSubmissionCard.tsx`  
The `textContent` caption that was displayed at the bottom of submission image cards has been removed. Only the action buttons (Share, Vote) remain.

## iii) Card Sizes Matching Whop
**Files:** `client/components/events/PremiumEventCard.tsx`, `client/components/home/EventRow.tsx`, `client/components/explore/EventRow.tsx`, `client/components/explore/BrandRow.tsx`, `client/app/(user)/explore/page.tsx`  
Changed card aspect ratio from `4/5` → `3/4` and width from `300–340px` → `220–260px`. The explore All Campaigns grid now renders 4 columns on xl screens (up from 3). BrandRow and EventRow card containers updated to match.

## iv) Live / Closed Filter on Brands Tab
**File:** `client/app/(user)/explore/page.tsx`  
A new LIVE / CLOSED dropdown appears in the filter bar when the Brands tab is active. Brand rows are filtered to show only events with the selected status.

## v) Back Button → Explore (not Home)
**File:** `client/app/events/[id]/page.tsx`  
The breadcrumb now reads "← Explore" and links to `/explore`. All other "Home" / "Back to home" links on the event detail page have been updated to `/explore`.

## vi) Remove Recommended Brands & Creators Sidebar
**File:** `client/app/(user)/explore/page.tsx`  
The `ExploreSidebar` (Recommended Brands + Rising Creators) has been removed from the explore page. The main feed now spans the full width.

## vii) Reduced Blank Space After Explore Banner
**File:** `client/app/(user)/explore/page.tsx`  
Reduced `mb-10` to `mb-6` on the hero banner wrapper and filter bar to tighten the vertical spacing.

## viii) Smaller Banner + Marquee Above It
**File:** `client/app/(user)/explore/page.tsx`  
Banner height reduced from `380–420px` → `220–260px` (under 50% of screen height). A looping marquee — **"Join Events ✦ Earn Dollars ✦ Submit & Vote ✦ Win Rewards"** — is displayed above the banner when on the Events tab with no active search or domain filter.

## ix) Narrower Right Sidebar on Home Page
**File:** `client/app/page.tsx`  
Right sidebar (`RightDashboard`) width reduced from `350px / 400px` → `280px / 300px`, giving the main feed more horizontal focus.

## x) Remove Native Balance from Wallet Page
**File:** `client/app/(user)/wallet/page.tsx`  
The POL / Native Balance section has been removed from the wallet balance card. Only the USDC balance is shown.

## xi) Participant Avatars on Home Page Cards
**Files:** `server/src/services/homeService.ts`  
The home feed backend query now fetches the top 5 participant avatars per event (via approved submissions) and attaches them as `participantAvatars` to each event. `PremiumEventCard` already renders these avatars in the footer stats row — no frontend changes needed.
