# My Submission Feature - Post & Vote Events

## Overview
During the POSTING phase of `post_and_vote` events, users can see their own submission with clear indicators showing:
1. **"My Submission"** label
2. **"You have already posted"** message
3. Edit/Delete capabilities (during POSTING phase only)

---

## 🎯 Feature Behavior

### During POSTING Phase

**What Users See:**
- ✅ **Their own submission** with special indicators
- ✅ **"My Submission"** badge/label
- ✅ **Edit button** (can update caption/image)
- ✅ **Delete button** (can remove submission)
- ❌ **Other users' submissions** (hidden until VOTING phase)

**What Brand Owners See:**
- ❌ **No submissions** (to prevent bias)
- ⏳ **Wait until VOTING phase** to see all submissions

---

### During VOTING Phase

**What Everyone Sees:**
- ✅ **All submissions** from all users
- ✅ **"My Submission"** marker on their own submission
- ❌ **Cannot edit or delete** anymore
- ✅ **Can vote** for other submissions (not their own)

---

### During COMPLETED Phase

**What Everyone Sees:**
- ✅ **All submissions** ranked by votes
- ✅ **"My Submission"** marker on their own submission
- ✅ **Final rankings** and vote counts
- ❌ **No editing, deleting, or voting**

---

## 📊 API Response Format

### Get Submissions During POSTING Phase

**Endpoint:** `GET /api/events/:eventId/submissions`

**Response (User who submitted):**
```json
{
  "success": true,
  "submissions": [
    {
      "id": "submission-123",
      "eventId": "event-456",
      "userId": "user-789",
      "imageCid": "QmXXX...",
      "caption": "My amazing submission!",
      "status": "active",
      "voteCount": 0,
      "createdAt": "2025-12-25T10:00:00Z",

      // Image URLs (optimized)
      "imageUrls": {
        "thumbnail": "https://gateway.pinata.cloud/ipfs/QmXXX",
        "medium": "https://gateway.pinata.cloud/ipfs/QmXXX",
        "large": "https://gateway.pinata.cloud/ipfs/QmXXX",
        "full": "https://gateway.pinata.cloud/ipfs/QmXXX"
      },

      // MY SUBMISSION INDICATORS ⭐
      "isMySubmission": true,    // ← Show "My Submission" label
      "canEdit": true,            // ← Show Edit button
      "canDelete": true,          // ← Show Delete button

      "user": {
        "id": "user-789",
        "username": "john_doe",
        "displayName": "John Doe",
        "avatarUrl": "QmYYY..."
      }
    }
  ]
}
```

**Response (User who hasn't submitted):**
```json
{
  "success": true,
  "submissions": []  // Empty - cannot see others' submissions during POSTING
}
```

---

### Get Submissions During VOTING Phase

**Endpoint:** `GET /api/events/:eventId/submissions`

**Response:**
```json
{
  "success": true,
  "submissions": [
    {
      "id": "submission-123",
      "imageCid": "QmXXX...",
      "caption": "My submission",

      "isMySubmission": true,   // ← Still marked as mine
      "canEdit": false,          // ← Cannot edit during VOTING
      "canDelete": false,        // ← Cannot delete during VOTING

      "voteCount": 5,
      // ... rest of fields
    },
    {
      "id": "submission-456",
      "imageCid": "QmYYY...",
      "caption": "Someone else's submission",

      "isMySubmission": false,  // ← Not mine
      "canEdit": false,
      "canDelete": false,

      "voteCount": 3,
      // ... rest of fields
    }
  ]
}
```

---

## 🔍 Check Submission Status

### Endpoint 1: Get My Submission

**Request:**
```http
GET /api/events/:eventId/submissions/me
Authorization: Bearer <token>
```

**Response (User has submitted):**
```json
{
  "success": true,
  "hasSubmitted": true,
  "submission": {
    "id": "submission-123",
    "imageCid": "QmXXX...",
    "caption": "My submission",
    // ... full submission object
  }
}
```

**Response (User hasn't submitted):**
```json
{
  "success": true,
  "hasSubmitted": false,
  "submission": null
}
```

---

### Endpoint 2: Check If Submitted (Quick Check)

**Request:**
```http
GET /api/events/:eventId/submissions/has-submitted
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "hasSubmitted": true
}
```

**Use this to:**
- Show/hide "Submit" button
- Display "You have already posted" message
- Enable/disable submission form

---

## 🎨 Frontend Implementation Guide

### Example: React Component

```typescript
import { useState, useEffect } from 'react';

function PostAndVoteEvent({ eventId }) {
  const [event, setEvent] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [mySubmission, setMySubmission] = useState(null);

  useEffect(() => {
    // 1. Fetch event details
    fetchEvent(eventId).then(setEvent);

    // 2. Fetch submissions
    fetchSubmissions(eventId).then(setSubmissions);

    // 3. Check if user has submitted
    checkHasSubmitted(eventId).then(setHasSubmitted);
  }, [eventId]);

  // During POSTING phase
  if (event?.status === 'POSTING') {
    // Find my submission from submissions list
    const mySubmission = submissions.find(s => s.isMySubmission);

    return (
      <div>
        <h2>Posting Phase - Submit Your Entry!</h2>

        {hasSubmitted && mySubmission ? (
          // Show user's submission
          <div className="my-submission">
            <div className="badge">✨ My Submission</div>
            <img src={mySubmission.imageUrls.medium} alt={mySubmission.caption} />
            <p>{mySubmission.caption}</p>

            {/* Action buttons during POSTING */}
            {mySubmission.canEdit && (
              <button onClick={() => editSubmission(mySubmission.id)}>
                ✏️ Edit
              </button>
            )}
            {mySubmission.canDelete && (
              <button onClick={() => deleteSubmission(mySubmission.id)}>
                🗑️ Delete
              </button>
            )}

            <p className="info">✓ You have already posted your submission!</p>
          </div>
        ) : (
          // Show submission form
          <SubmissionForm
            eventId={eventId}
            onSubmit={() => {
              // Refresh submissions after posting
              fetchSubmissions(eventId).then(setSubmissions);
              setHasSubmitted(true);
            }}
          />
        )}
      </div>
    );
  }

  // During VOTING phase
  if (event?.status === 'VOTING') {
    return (
      <div>
        <h2>Voting Phase - Choose Your Favorites!</h2>

        <div className="submissions-grid">
          {submissions.map(submission => (
            <div key={submission.id} className="submission-card">
              {/* Show "My Submission" badge */}
              {submission.isMySubmission && (
                <div className="my-badge">✨ My Submission</div>
              )}

              <img src={submission.imageUrls.medium} alt={submission.caption} />
              <p>{submission.caption}</p>
              <p>Votes: {submission.voteCount}</p>

              {/* Can't vote for own submission */}
              {!submission.isMySubmission && (
                <button onClick={() => voteForSubmission(submission.id)}>
                  👍 Vote
                </button>
              )}

              {submission.isMySubmission && (
                <p className="info">You cannot vote for your own submission</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
```

---

### API Helper Functions

```typescript
// Check if user has submitted
async function checkHasSubmitted(eventId: string): Promise<boolean> {
  const response = await fetch(
    `/api/events/${eventId}/submissions/has-submitted`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    }
  );
  const { hasSubmitted } = await response.json();
  return hasSubmitted;
}

// Get my submission
async function getMySubmission(eventId: string) {
  const response = await fetch(
    `/api/events/${eventId}/submissions/me`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    }
  );
  const { submission, hasSubmitted } = await response.json();
  return { submission, hasSubmitted };
}

// Get all submissions (respects phase-based visibility)
async function fetchSubmissions(eventId: string) {
  const response = await fetch(
    `/api/events/${eventId}/submissions`,
    {
      headers: {
        'Authorization': `Bearer ${getToken()}`
      }
    }
  );
  const { submissions } = await response.json();
  return submissions;
}
```

---

## 🎨 UI/UX Recommendations

### During POSTING Phase

**Show "My Submission" Section:**
```
┌─────────────────────────────────────┐
│  ✨ My Submission                   │
├─────────────────────────────────────┤
│  [Image Preview]                    │
│                                     │
│  Caption: "My amazing entry!"       │
│                                     │
│  Posted: 2 hours ago                │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ ✏️ Edit  │  │ 🗑️ Delete│        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ✓ You have already posted!         │
│                                     │
└─────────────────────────────────────┘
```

**Hide "Submit" Button:**
```typescript
{!hasSubmitted && (
  <button className="submit-btn">
    📝 Submit Your Entry
  </button>
)}

{hasSubmitted && (
  <div className="success-message">
    ✓ Submission complete! Voting starts on {event.startTime}
  </div>
)}
```

---

### During VOTING Phase

**Show "My Submission" Badge:**
```
┌─────────────────────────────────────┐
│  ✨ My Submission        ⭐ 5 votes │
├─────────────────────────────────────┤
│  [Image]                            │
│  Caption: "My entry"                │
│                                     │
│  ⚠️ You cannot vote for your own    │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Other Submission          ⭐ 3 votes│
├─────────────────────────────────────┤
│  [Image]                            │
│  Caption: "Another entry"           │
│                                     │
│  ┌──────────────────┐               │
│  │   👍 Vote        │               │
│  └──────────────────┘               │
└─────────────────────────────────────┘
```

---

## ✅ Implementation Checklist

- [x] Backend: Add `isMySubmission` flag to submissions
- [x] Backend: Add `canEdit` flag based on event status
- [x] Backend: Add `canDelete` flag based on event status
- [x] Backend: Add `GET /submissions/has-submitted` endpoint
- [x] Backend: Add `hasSubmitted` flag to `/submissions/me` response
- [ ] Frontend: Show "My Submission" badge when `isMySubmission === true`
- [ ] Frontend: Show Edit button when `canEdit === true`
- [ ] Frontend: Show Delete button when `canDelete === true`
- [ ] Frontend: Hide submit form when `hasSubmitted === true`
- [ ] Frontend: Show "You have already posted" message
- [ ] Frontend: Disable voting on own submission

---

## 🔒 Security & Business Rules

1. ✅ **Users can only see their own submission during POSTING**
2. ✅ **Brand owners cannot see any submissions during POSTING**
3. ✅ **Users can only edit/delete their own submission**
4. ✅ **Edit/Delete only allowed during POSTING phase**
5. ✅ **Users cannot vote for their own submission**
6. ✅ **Users cannot vote for their own submission (enforced in backend)**

---

## 🐛 Troubleshooting

### Issue: "My Submission" not showing

**Check:**
1. User is authenticated (`Authorization` header present)
2. User has actually submitted to this event
3. Event is in POSTING, VOTING, or COMPLETED status
4. API response includes `isMySubmission: true`

**Debug:**
```bash
# Check my submission
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/events/<eventId>/submissions/me

# Should return:
# { "hasSubmitted": true, "submission": {...} }
```

---

### Issue: Can't edit submission during POSTING

**Check:**
1. Event status is actually "POSTING"
2. API response has `canEdit: true`
3. Submission belongs to current user

---

## 📝 Example Scenarios

### Scenario 1: User Posts During POSTING Phase
```
1. User opens event (status: POSTING)
2. User fills submission form and submits
3. ✅ Submission created
4. ✅ Page refreshes, shows "My Submission" card
5. ✅ Submit button hidden
6. ✅ Edit/Delete buttons visible
7. ✅ Message: "You have already posted!"
```

### Scenario 2: User Returns During VOTING
```
1. User opens event (status: VOTING)
2. ✅ All submissions visible (including theirs)
3. ✅ Their submission has "My Submission" badge
4. ✅ Cannot edit or delete anymore
5. ✅ Can vote for other submissions
6. ❌ Cannot vote for own submission
```

---

## 🎯 Summary

**Key Features:**
- ✅ Users see their submission during POSTING phase
- ✅ Clear "My Submission" indicator
- ✅ Edit/Delete buttons during POSTING only
- ✅ "You have already posted" message
- ✅ Cannot vote for own submission

**API Endpoints:**
- `GET /api/events/:eventId/submissions` - Get all visible submissions
- `GET /api/events/:eventId/submissions/me` - Get my submission
- `GET /api/events/:eventId/submissions/has-submitted` - Quick check

**Response Fields:**
- `isMySubmission: boolean` - Is this my submission?
- `canEdit: boolean` - Can I edit this?
- `canDelete: boolean` - Can I delete this?
