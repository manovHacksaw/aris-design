# AI Image Generation — Implementation Guide

## Overview

AI image generation is integrated into both the **user** and **brand** sides of the platform. It uses **Google Imagen** (accessed via the Gemini Developer API) to generate images from text prompts, with per-user daily rate limits enforced server-side.

---

## Infrastructure

### API Key & Environment

The following variables must be set in `client/.env.local`:

```
GEMINI_API_KEY=...
NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT=image-generation-v2
GOOGLE_CLOUD_REGION=us-central1
IMAGE_MODEL_VERSION=imagen-4.0-generate-001
PINATA_JWT=...
```

### API Route — `client/app/api/generate-image/route.ts`

A Next.js API route that handles two things:

**GET** `/api/generate-image?userId=...&role=user|brand`
- Returns how many generations the user has left today (`remainingGenerations`, `maxDaily`, `usedToday`)

**POST** `/api/generate-image`
- Body: `{ prompt, userId, role }`
- Checks daily limit before generating
- Calls Imagen via: `https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:predict?key={GEMINI_API_KEY}`
- Returns `{ image: { data: base64, mimeType }, remainingGenerations }`
- On limit exceeded: returns HTTP 429 with `{ limitReached: true, resetDate }`

**Rate Limits (in-memory, resets on server restart):**
- Users: **3 generations/day**
- Brands: **5 generations/day**

### Service Layer — `client/services/image-generation.service.ts`

Wraps the API route with typed functions:

- `generateImage(prompt, userId, role)` — calls POST, returns `GenerationResult`
- `checkGenerationLimit(userId, role)` — calls GET, returns `GenerationLimitInfo`
- `base64ToFile(base64, mimeType, filename)` — converts API response to a `File` object
- `base64ToObjectUrl(base64, mimeType)` — converts API response to a browser object URL for preview

---

## User Flow — `/create` page

### Entry Points

Users can trigger the AI generator in two ways:

1. **Hero Panel** — At the top of the `/create` page, there is a large prompt input. The user types a prompt, selects a visual style (8 options, carousel) and aspect ratio (6 options, carousel), then presses Enter or clicks "Generate Draft". This pre-fills the generator window with those values and opens it directly at the prompt step.

2. **Launch Generator button** — Opens the generator window from scratch, starting at the post type selection step.

### Generator Window — `client/components/create/AIGeneratorWindow.tsx`

A full-screen overlay built with `createPortal` and animated with Framer Motion `AnimatePresence`. It walks the user through the following steps:

#### Step 1 — Select Post Type (`select_type`)

The user chooses between two event post types:

- **Post & Vote** — submits content to a live event where the community votes
- **Post Only** — submits content directly to an open event

If the window was opened from the hero panel with a pre-filled prompt, this step is skipped and the window opens directly at the prompt step.

#### Step 2 — Write Prompt (`prompt`)

- A large textarea accepts the user's image description
- A usage counter shows remaining daily generations (e.g. "2/3 left today")
- First generation: the prompt is sent as-is
- Subsequent generations within the same session: the prompt is automatically prefixed with `/image` to signal regeneration intent (matches the oldfrontend behavior)
- If `initialPrompt`, `initialStyle`, or `initialRatio` were passed in (from the hero panel), they are pre-filled and influence the enhanced prompt

**Prompt enrichment** — before sending to the API, `buildEnhancedPrompt()` silently wraps the user's prompt with:
- The selected event's title and description (if an event is already selected)
- The chosen visual style
- The chosen aspect ratio

This produces a richer prompt without the user needing to write all that detail themselves.

#### Step 3 — Generating (`generating`)

- Calls `generateImage(enhancedPrompt, userId, 'user')` from the service layer
- Shows an animated loading state
- On success: proceeds to preview
- On limit reached: shows an error with the reset date

#### Step 4 — Preview (`preview`)

- Shows the generated image at full size
- Two action buttons:
  - **Discard** — returns to the prompt step for another attempt (uses the remaining daily quota)
  - **Post this** — proceeds to event selection

#### Step 5 — Select Event (`selecting_event`)

- Loads real open events from the platform via `getEvents()` API call
- Shows event cards with title, participant count, and deadline
- The user picks which event to post their generated image to

#### Step 6 — Posting (`posting`)

1. `base64ToFile()` converts the generated image data to a `File` object
2. `uploadToPinata(file)` uploads the file to IPFS and returns a CID
3. `createSubmission({ eventId, imageCid })` posts the submission to the selected event
4. On success: the window closes and the user is done

---

## Brand Flow — `/brand/create-event` page

Brands get AI image generation in two places within the event creation form. Both use `BrandImageGeneratorModal` — a focused modal component designed for single-image generation in brand context.

### Component — `client/components/create/BrandImageGeneratorModal.tsx`

A portal-based modal with Framer Motion animations. Simpler than the user window — it only generates one image and hands it back to the parent.

**Props:**
- `isOpen`, `onClose` — visibility control
- `onAddToOption(file, preview)` — callback invoked when the brand confirms the image
- `brandId` — used for rate limiting (`role: 'brand'`, 5/day)
- `eventTitle`, `eventDescription` — injected as context into the generation prompt
- `optionLabel` — shown in the modal header (e.g. "Option 2", "Sample Image")

**Prompt enrichment** — `buildBrandPrompt()` constructs:
```
Create a high-quality image for a brand event voting option.

Event Title: "..."
Event Description: ...

Image Request: [user's prompt]

Generate a visually compelling image that fits the event theme and is suitable as a voting option.
```

**Usage counter** — shows "X/5 left today" in the modal header.

**Steps inside the modal:**
1. Idle — prompt input with hint suggestions, generate button
2. Generating — spinner while waiting for the API
3. Preview — shows result with **Discard** (try again) or **Add to Option** / **Add Sample** (confirm)

On confirm: calls `onAddToOption(file, preview)` with the `File` object and the object URL, then closes.

---

### Use Case 1 — Voting Option Images (Vote-type events)

Location: Step 4 (Content) of the create-event form, in the Voting Options section.

Each voting option card (Option 1, Option 2, etc.) has a media area. When no media is uploaded yet, it shows two buttons side by side:

- **Generate** (Sparkles icon) — opens `BrandImageGeneratorModal` for that specific option
- **Upload** (Upload icon) — standard file picker for photo/video

When the brand clicks Generate, `aiGeneratorProposalIdx` is set to the index of that option. The modal opens, the brand types a prompt, and after generation clicks "Add to Option". The `onAddToOption` callback updates `form.proposals[idx].media` and `form.proposals[idx].mediaPreview` for that option.

State involved:
```ts
const [aiGeneratorProposalIdx, setAiGeneratorProposalIdx] = useState<number | null>(null);
```

### Use Case 2 — Sample Images (Post & Vote events)

Location: Step 4 (Content), Sample Images section (visible only for post-type events).

The "Add Sample" button now has a two-step interaction:

1. **First click** — the button expands inline into two options within the same grid cell:
   - **Generate** — opens `BrandImageGeneratorModal` for a sample image
   - **Upload** — standard multi-file picker (same behavior as before)
   - **Cancel** — collapses back to the Add Sample button

2. **After generation** — "Add to Option" appends the generated `File` to `form.sampleImages` (enforces 10-image maximum), modal closes, the inline picker collapses.

State involved:
```ts
const [aiGeneratorSampleOpen, setAiGeneratorSampleOpen] = useState(false);
const [sampleAddMode, setSampleAddMode] = useState(false);
```

The modal for samples uses `optionLabel="Sample Image"` so the header reads "For Sample Image".

---

## Hero Panel (User `/create` page)

The top section of the create page acts as a quick-launch for the generator.

**Interactive elements:**

- **Prompt input** — full-width text area bound to `heroPrompt` state; pressing Enter triggers `handleHeroGenerate()`
- **Style picker** — horizontal carousel of 8 visual styles (`Photorealistic`, `Cinematic`, `Illustration`, `Abstract`, `Minimalist`, `Neon`, `Vintage`, `Anime`); left/right chevrons cycle through them; dot indicators show position; selected style stored in `selectedStyle`
- **Ratio picker** — same carousel pattern for 6 aspect ratios (`1:1`, `4:3`, `16:9`, `9:16`, `3:2`, `2:3`); stored in `selectedRatio`
- **Generate Draft / Launch Generator** — both call `handleHeroGenerate()`, which sets `heroPrompt`, `selectedStyle`, `selectedRatio` and opens `AIGeneratorWindow` with those as initial values

The window then skips the type-select step and opens at the prompt step with the hero panel values pre-filled.

**Responsive breakpoints:**
- Mobile: single column, compact padding, 3xl headline
- Tablet (`sm:`): slightly wider spacing
- Desktop (`lg:`): two-column grid, hero panel left / event cards right

---

## File Map

| File | Purpose |
|---|---|
| `client/app/api/generate-image/route.ts` | Server-side Imagen API call + rate limiting |
| `client/services/image-generation.service.ts` | Client service: generateImage, checkLimit, base64 utils |
| `client/components/create/AIGeneratorWindow.tsx` | Full user generator window (6 steps) |
| `client/components/create/BrandImageGeneratorModal.tsx` | Focused brand modal (idle → generating → preview) |
| `client/app/(user)/create/page.tsx` | User create page with hero panel + window integration |
| `client/app/brand/create-event/page.tsx` | Brand create event with voting option + sample image AI |
