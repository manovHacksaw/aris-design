# Voting Implementation Summary

## Overview
This document summarizes the voting restrictions and limits implemented for the Aris event system.

## Key Features Implemented

### 1. One-Time Voting for Vote-Only Events ✅
**Location:** `src/services/voteService.ts:212-222`

- Users can only vote **ONCE** per `vote_only` event
- After voting, they cannot vote again or change their vote
- Error message: "You have already voted in this event. Voting is only allowed once per event."

**Implementation:**
```typescript
// Check if user has already voted in this event
const existingVotes = await prisma.vote.findMany({
    where: { eventId, userId }
});

if (existingVotes.length > 0) {
    throw new Error('You have already voted in this event. Voting is only allowed once per event.');
}
```

---

### 2. Maximum Vote Limit (maxProposalVotes) ✅
**Locations:**
- Vote-only: `src/services/voteService.ts:207-210`
- Post-and-vote: `src/services/voteService.ts:77-89`

The `maxProposalVotes` field (set by brand owner when creating event) limits how many proposals/submissions a user can vote for.

#### For Vote-Only Events:
- User selects N proposals in a single voting action (where N ≤ maxProposalVotes)
- All votes are created atomically
- Error if user tries to select more than maxProposalVotes

**Example:**
```
maxProposalVotes = 3
User can vote for proposals [1, 2, 3] ✅
User cannot vote for proposals [1, 2, 3, 4] ❌
```

#### For Post-and-Vote Events:
- User can vote for up to maxProposalVotes different submissions
- Each vote is individual (not batched)
- System checks total votes before allowing a new vote
- Error if user already voted for maxProposalVotes submissions

**Example:**
```
maxProposalVotes = 3
User votes for submission A ✅ (1/3)
User votes for submission B ✅ (2/3)
User votes for submission C ✅ (3/3)
User votes for submission D ❌ (Error: already voted for 3 submissions)
```

---

### 3. Vote Status Checking ✅
**Location:** `src/controllers/voteController.ts:98-120`

New endpoint to check if user has voted:

```http
GET /api/events/:eventId/has-voted
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "hasVoted": true
}
```

**Use Cases:**
- Disable voting UI if user already voted
- Show "You have already voted" message
- Hide vote buttons after voting

---

## Voting Rules Summary

| Event Type | Can Vote Multiple Times? | Vote Limit | Notes |
|------------|-------------------------|------------|-------|
| **vote_only** | ❌ No | `maxProposalVotes` | User votes once for N proposals (1 ≤ N ≤ maxProposalVotes) |
| **post_and_vote** | ✅ Yes (different submissions) | `maxProposalVotes` | User can vote for up to N different submissions |

---

## Complete Validation Flow

### Vote-Only Events (voteForProposals)

1. ✅ Event exists and not deleted
2. ✅ Event type is `vote_only`
3. ✅ Event status is `VOTING`
4. ✅ Event allows voting
5. ✅ User is not the brand owner
6. ✅ All proposal IDs are valid and belong to event
7. ✅ Number of proposals ≤ `maxProposalVotes`
8. ✅ **User has NOT already voted in this event** (NEW)
9. ✅ Create votes for all selected proposals

### Post-and-Vote Events (voteForSubmission)

1. ✅ Event exists and not deleted
2. ✅ Submission exists and belongs to event
3. ✅ Event type is `post_and_vote`
4. ✅ Event status is `VOTING`
5. ✅ Event allows voting
6. ✅ User is not the brand owner
7. ✅ User is not voting for their own submission
8. ✅ **User has not exceeded `maxProposalVotes` limit** (NEW)
9. ✅ User has not already voted for this specific submission
10. ✅ Create vote

---

## API Endpoints

### Vote for Proposals (Vote-Only)
```http
POST /api/events/:eventId/proposals/vote
Content-Type: application/json
Authorization: Bearer <token>

{
  "proposalIds": ["id1", "id2", "id3"]
}
```

### Vote for Submission (Post-and-Vote)
```http
POST /api/events/:eventId/submissions/:submissionId/vote
Authorization: Bearer <token>
```

### Check Vote Status
```http
GET /api/events/:eventId/has-voted
Authorization: Bearer <token>
```

### Get User's Votes
```http
GET /api/events/:eventId/my-votes
Authorization: Bearer <token>
```

---

## Error Messages

| Error | When |
|-------|------|
| "You have already voted in this event. Voting is only allowed once per event." | Vote-only: User tries to vote again |
| "You can only vote for up to N proposals" | Vote-only: User selects too many proposals |
| "You have already voted for N submissions. You cannot vote for more." | Post-and-vote: User exceeded maxProposalVotes |
| "You have already voted for this submission" | Post-and-vote: User votes for same submission twice |
| "You cannot vote for your own submission" | Post-and-vote: User votes for their submission |
| "Brand owners cannot vote in their own events" | Both: Brand owner tries to vote |
| "Voting is only allowed during the VOTING phase" | Both: Event not in VOTING status |

---

## Database Schema

### Vote Model
```prisma
model Vote {
  id             String      @id @default(uuid())
  eventId        String
  submissionId   String?     // For post_and_vote events
  proposalId     String?     // For vote_only events
  userId         String
  createdAt      DateTime    @default(now())

  @@unique([eventId, submissionId, userId], name: "unique_submission_vote")
  @@unique([eventId, proposalId, userId], name: "unique_proposal_vote")
}
```

**Unique Constraints:**
- Prevents duplicate votes at database level
- `unique_submission_vote`: User can't vote twice for same submission
- `unique_proposal_vote`: User can't vote twice for same proposal

---

## Testing Checklist

### Vote-Only Events
- [x] User can vote for 1-N proposals (N ≤ maxProposalVotes)
- [x] User cannot vote for more than maxProposalVotes
- [x] User cannot vote again after initial vote
- [x] Error message is clear and user-friendly
- [x] hasVoted flag returns true after voting

### Post-and-Vote Events
- [x] User can vote for multiple different submissions
- [x] User cannot vote for same submission twice
- [x] User cannot vote for their own submission
- [x] User cannot exceed maxProposalVotes limit
- [x] Error message shows current vote count

### General
- [x] Brand owners cannot vote in their own events
- [x] Voting only works during VOTING phase
- [x] GET /has-voted endpoint works correctly
- [x] GET /my-votes returns user's votes

---

## Files Modified

1. ✅ `src/services/voteService.ts` - Added one-time voting check and maxProposalVotes validation
2. ✅ `src/controllers/voteController.ts` - Added checkIfUserHasVoted endpoint
3. ✅ `src/routes/voteRoutes.ts` - Added /has-voted route
4. ✅ `docs/VOTING_RULES.md` - Comprehensive documentation
5. ✅ `docs/VOTING_IMPLEMENTATION_SUMMARY.md` - This file

---

## Frontend Integration

```typescript
// 1. Get event details (includes hasVoted flag)
const event = await getEvent(eventId);

if (event.hasVoted) {
  // Show "You already voted" message
  // Disable voting UI
}

// 2. Or check explicitly
const { hasVoted } = await checkIfUserHasVoted(eventId);

// 3. Handle voting errors
try {
  await voteForProposals(eventId, proposalIds);
} catch (error) {
  if (error.message.includes('already voted')) {
    // Show appropriate message
    alert('You have already voted in this event!');
  }
}
```

---

## Implementation Details

### Why One-Time Voting for Vote-Only Events?

Vote-only events are typically polls or surveys where:
- The brand creates all voting options (proposals)
- Users select their preferred options
- Changing votes would allow manipulation
- Prevents users from "gaming" the system

### Why Multiple Votes for Post-and-Vote Events?

Post-and-vote events are community-driven where:
- Users submit their own content
- More content gets submitted over time
- Users should be able to appreciate multiple submissions
- Limited by maxProposalVotes to prevent spam voting

---

## Next Steps (Future Enhancements)

- [ ] Allow vote modification within a time window (e.g., 5 minutes)
- [ ] Add vote weight/ranking system
- [ ] Track vote analytics per user
- [ ] Add vote history/audit trail
- [ ] Implement vote notifications in real-time
