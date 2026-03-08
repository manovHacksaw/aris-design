# Voting Rules and Restrictions

## Vote-Only Events

### One-Time Voting Rule

**For `vote_only` events, users can only vote ONCE per event.**

Once a user has cast their vote(s) in a vote_only event, they **cannot vote again** in that same event, even if they want to select different proposals.

### How It Works

1. User selects 1-N proposals (up to `maxProposalVotes`)
2. User submits their vote
3. System checks if user has **any** existing votes in this event
4. If yes → Reject with error: "You have already voted in this event. Voting is only allowed once per event."
5. If no → Create votes for all selected proposals

### Business Rules

- ✅ Users can vote for multiple proposals in a **single voting action** (up to `maxProposalVotes`)
- ❌ Users **CANNOT** vote again after their initial vote is cast
- ❌ Users **CANNOT** change their vote
- ❌ Brand owners cannot vote in their own events
- ❌ Voting only allowed during VOTING phase

### Example Scenarios

#### ✅ **Allowed:** Voting for multiple proposals at once
```
User votes for proposals [1, 2, 3] in a single request
→ Success: 3 votes created
```

#### ❌ **Not Allowed:** Voting multiple times
```
1. User votes for proposals [1, 2]
   → Success: 2 votes created

2. User tries to vote for proposals [3, 4]
   → Error: "You have already voted in this event"
```

#### ❌ **Not Allowed:** Changing vote
```
1. User votes for proposal [1]
   → Success: 1 vote created

2. User tries to vote for proposal [2] instead
   → Error: "You have already voted in this event"
```

---

## Post-and-Vote Events

### Multiple Voting Allowed

**For `post_and_vote` events, users can vote for multiple different submissions** (up to `maxProposalVotes` total).

### How It Works

1. User votes for submission A
2. System checks if user already voted for **this specific submission**
3. If yes → Reject: "You have already voted for this submission"
4. If no → Create vote
5. User can later vote for submission B, C, etc. (up to `maxProposalVotes` total)

### Business Rules

- ✅ Users can vote for multiple **different** submissions (up to `maxProposalVotes`)
- ❌ Users **CANNOT** vote for the same submission twice
- ❌ Users **CANNOT** vote for their own submission
- ❌ Brand owners cannot vote in their own events
- ❌ Voting only allowed during VOTING phase

---

## API Endpoints

### Vote for Proposals (Vote-Only Events)
```http
POST /api/events/:eventId/proposals/vote
Content-Type: application/json
Authorization: Bearer <token>

{
  "proposalIds": ["proposal-1", "proposal-2", "proposal-3"]
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Votes cast successfully",
  "votes": [...]
}
```

**Response (Already Voted):**
```json
{
  "success": false,
  "error": "You have already voted in this event. Voting is only allowed once per event."
}
```

---

### Vote for Submission (Post-and-Vote Events)
```http
POST /api/events/:eventId/submissions/:submissionId/vote
Authorization: Bearer <token>
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Vote cast successfully",
  "vote": {...}
}
```

**Response (Already Voted for This Submission):**
```json
{
  "success": false,
  "error": "You have already voted for this submission"
}
```

---

### Check if User Has Voted
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

Use this endpoint to:
- Show/hide voting UI
- Display "You have already voted" message
- Disable vote buttons

---

### Get User's Votes for Event
```http
GET /api/events/:eventId/my-votes
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "votes": [
    {
      "id": "vote-1",
      "eventId": "event-123",
      "proposalId": "proposal-1",
      "createdAt": "2025-12-25T10:00:00Z",
      "proposal": {
        "id": "proposal-1",
        "title": "Option A",
        "imageCid": "QmXXX..."
      }
    }
  ]
}
```

---

## Frontend Implementation Guide

### Checking Vote Status

```typescript
// Check if user has voted
const response = await fetch(`/api/events/${eventId}/has-voted`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { hasVoted } = await response.json();

if (hasVoted) {
  // Disable voting UI
  // Show "You have already voted" message
}
```

### Getting Event with Vote Status

```typescript
// Get event details (includes hasVoted flag)
const response = await fetch(`/api/events/${eventId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const event = await response.json();

// event.hasVoted will be true if user has voted
// event.userVotes contains the user's votes
```

### Voting for Proposals (Vote-Only Events)

```typescript
try {
  const response = await fetch(`/api/events/${eventId}/proposals/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      proposalIds: ['proposal-1', 'proposal-2']
    })
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.error.includes('already voted')) {
      // Show "You have already voted" message
      alert('You have already voted in this event!');
    }
  } else {
    // Success!
    alert('Your vote has been recorded!');
  }
} catch (error) {
  console.error('Voting error:', error);
}
```

---

## Database Constraints

The voting rules are enforced by:

1. **Application Logic** (VoteService.ts):
   - Vote-only events: Check if user has ANY votes in event
   - Post-and-vote events: Check if user voted for specific submission

2. **Database Unique Constraints** (Prisma schema):
   ```prisma
   @@unique([eventId, submissionId, userId], name: "unique_submission_vote")
   @@unique([eventId, proposalId, userId], name: "unique_proposal_vote")
   ```

These constraints prevent duplicate votes at the database level, even if application logic is bypassed.

---

## Testing the Rules

### Test Case 1: Vote-Only Event - First Vote
```
1. User votes for proposals [1, 2]
   Expected: Success, 2 votes created
```

### Test Case 2: Vote-Only Event - Second Vote Attempt
```
1. User votes for proposals [1, 2]
   Expected: Success

2. User votes for proposals [3, 4]
   Expected: Error - "You have already voted in this event"
```

### Test Case 3: Vote-Only Event - Exceeding maxProposalVotes
```
Event has maxProposalVotes = 3

1. User votes for proposals [1, 2, 3, 4]
   Expected: Error - "You can only vote for up to 3 proposals"
```

### Test Case 4: Post-and-Vote Event - Multiple Different Submissions
```
Event has maxProposalVotes = 3

1. User votes for submission A
   Expected: Success

2. User votes for submission B
   Expected: Success

3. User votes for submission C
   Expected: Success

4. User votes for submission D
   Expected: Error - Exceeded maxProposalVotes limit
```

### Test Case 5: Post-and-Vote Event - Same Submission Twice
```
1. User votes for submission A
   Expected: Success

2. User votes for submission A again
   Expected: Error - "You have already voted for this submission"
```

---

## Implementation Files

- **Service:** `src/services/voteService.ts:212-222`
- **Controller:** `src/controllers/voteController.ts:98-120`
- **Routes:** `src/routes/voteRoutes.ts:15-16`
- **Schema:** `prisma/schema.prisma` (Vote model with unique constraints)
