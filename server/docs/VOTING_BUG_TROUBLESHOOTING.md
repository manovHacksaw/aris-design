# Voting Bug Troubleshooting Guide

## 🐛 Issue Description
When User A votes, logs out, and User B logs in, User B sees "already voted" for the same proposals that User A voted for. This should NOT happen.

---

## 🔍 Step 1: Verify Backend is Working Correctly

### Test with Debug Endpoint (Development Only)

**Start your server in development mode:**
```bash
cd server
NODE_ENV=development npm run dev
```

**Test the debug endpoint:**
```bash
# Replace <eventId> with your event ID
# Replace <token> with User B's JWT token

curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/debug/voting-state/<eventId>
```

**Expected Response for User B (who hasn't voted):**
```json
{
  "success": true,
  "debug": {
    "currentUser": {
      "id": "user-b-id",
      "email": "userb@example.com"
    },
    "hasVoted": false,           // ← Should be FALSE
    "userVoteCount": 0,           // ← Should be 0
    "userVotes": [],              // ← Should be empty
    "totalVotesInEvent": 3,       // Could be > 0 (other users voted)
    "allVotesBreakdown": [
      {
        "votedBy": "usera@example.com",  // Other user's votes
        "proposalTitle": "Option A",
        "createdAt": "2025-12-25T10:00:00Z"
      }
    ]
  }
}
```

**If `hasVoted: false` but UI shows "already voted" → Frontend Issue ✅**
**If `hasVoted: true` for User B → Backend Issue (unlikely) ❌**

---

## 🎯 Step 2: Check Frontend Code

### Issue A: Browser Storage Persistence

**Check if frontend is storing voting state:**

Open DevTools (F12) → Console:
```javascript
// Check localStorage
console.log('localStorage:', localStorage);
Object.keys(localStorage).forEach(key => {
  if (key.includes('vote') || key.includes('proposal') || key.includes('event')) {
    console.log(key, '=', localStorage.getItem(key));
  }
});

// Check sessionStorage
console.log('sessionStorage:', sessionStorage);
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('vote') || key.includes('proposal') || key.includes('event')) {
    console.log(key, '=', sessionStorage.getItem(key));
  }
});
```

**Common problems:**
```javascript
// ❌ BAD - Persists across users
localStorage.setItem('votedProposals', JSON.stringify([1, 2, 3]));
localStorage.setItem(`event-${eventId}-voted`, 'true');
localStorage.setItem('selectedProposals', JSON.stringify([...]));
```

**Fix: Clear all voting data on logout:**
```javascript
// In your logout function
const logout = () => {
  // 1. Clear auth token
  localStorage.removeItem('token');

  // 2. Clear ALL localStorage (recommended)
  localStorage.clear();

  // OR clear specific voting keys
  Object.keys(localStorage).forEach(key => {
    if (key.includes('vote') || key.includes('proposal') || key.includes('event')) {
      localStorage.removeItem(key);
    }
  });

  // 3. Clear sessionStorage
  sessionStorage.clear();

  // 4. Redirect to login
  window.location.href = '/login';
};
```

---

### Issue B: State Not Reset Between Users

**Check if frontend state management is properly reset:**

#### React Example:
```typescript
// ❌ BAD - State persists from previous user
const [selectedProposals, setSelectedProposals] = useState<string[]>(
  JSON.parse(localStorage.getItem('selectedProposals') || '[]')
);

// ✅ GOOD - Always fetch from API
const [selectedProposals, setSelectedProposals] = useState<string[]>([]);

useEffect(() => {
  // Fetch user's votes from backend on component mount
  if (user) {
    fetchUserVotes(eventId).then(votes => {
      const votedProposalIds = votes.map(v => v.proposalId);
      setSelectedProposals(votedProposalIds);
    });
  } else {
    setSelectedProposals([]);
  }
}, [user, eventId]);
```

#### Redux/Zustand Example:
```typescript
// Reset all voting state on logout
const logout = () => {
  dispatch(clearVotingState());  // Clear Redux state
  // OR
  useVotingStore.getState().reset();  // Clear Zustand state

  localStorage.clear();
  // ... rest of logout logic
};
```

---

### Issue C: Checking Wrong Condition

**Check how your frontend determines if a proposal is "already voted":**

```typescript
// ❌ BAD - Checking if proposal has ANY votes
const isVoted = proposal.voteCount > 0;

// ❌ BAD - Checking localStorage
const isVoted = localStorage.getItem(`voted-${proposal.id}`) === 'true';

// ✅ GOOD - Check if CURRENT USER voted
const userVotedProposalIds = event.userVotes?.map(vote => vote.proposalId) || [];
const isVoted = userVotedProposalIds.includes(proposal.id);

// ✅ GOOD - Use hasVoted from API
const isVoted = event.hasVoted && userVotedProposalIds.includes(proposal.id);
```

**Example component:**
```typescript
function ProposalCard({ proposal, event }) {
  // Get user's voted proposal IDs from API response
  const userVotedProposalIds = event.userVotes?.map(v => v.proposalId) || [];

  // Check if THIS proposal was voted by current user
  const isVotedByCurrentUser = userVotedProposalIds.includes(proposal.id);

  return (
    <div>
      <h3>{proposal.title}</h3>
      {isVotedByCurrentUser ? (
        <span>✓ You voted for this</span>
      ) : (
        <button onClick={() => vote(proposal.id)}>Vote</button>
      )}
    </div>
  );
}
```

---

## ✅ Step 3: Immediate Fix for Testing

### Clear Browser Data Completely

**Option 1: Hard Refresh**
```
Windows/Linux: Ctrl + Shift + Delete
Mac: Cmd + Shift + Delete
```
- Select "Cookies" and "Cached images and files"
- Time range: "All time"
- Click "Clear data"

**Option 2: Incognito/Private Window**
- Open new incognito window
- Login with User B
- Test voting

**Option 3: Different Browser**
- Login with User B in Chrome
- Login with User A in Firefox
- Verify they don't affect each other

---

## 🔧 Step 4: Proper Frontend Implementation

### Correct Voting Flow

```typescript
// 1. Fetch event with user's voting state
const fetchEvent = async (eventId: string) => {
  const response = await fetch(`/api/events/${eventId}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  const event = await response.json();

  // event.hasVoted - true if user voted
  // event.userVotes - array of user's votes
  return event;
};

// 2. Check if user has voted (for UI state)
const checkHasVoted = async (eventId: string) => {
  const response = await fetch(`/api/events/${eventId}/has-voted`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  const { hasVoted } = await response.json();
  return hasVoted;
};

// 3. Vote for proposals
const voteForProposals = async (eventId: string, proposalIds: string[]) => {
  try {
    const response = await fetch(`/api/events/${eventId}/proposals/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ proposalIds })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return await response.json();
  } catch (error) {
    console.error('Voting error:', error);
    throw error;
  }
};

// 4. Logout properly
const logout = () => {
  // Clear everything
  localStorage.clear();
  sessionStorage.clear();

  // Optionally clear cookies (if using)
  document.cookie.split(";").forEach(c => {
    document.cookie = c.replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });

  // Redirect
  window.location.href = '/login';
};
```

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T Store Voting State in Browser

```typescript
// ❌ Never do this
localStorage.setItem('hasVoted', 'true');
localStorage.setItem('votedProposals', JSON.stringify(proposalIds));
localStorage.setItem(`event-${eventId}-userVoted`, 'true');
```

### ❌ DON'T Check Proposal Vote Count

```typescript
// ❌ This checks if ANYONE voted, not if current user voted
if (proposal.voteCount > 0) {
  showAsVoted();
}
```

### ❌ DON'T Forget to Reset State on Logout

```typescript
// ❌ Incomplete logout
const logout = () => {
  localStorage.removeItem('token');  // Only removes token
  navigate('/login');
};

// ✅ Complete logout
const logout = () => {
  localStorage.clear();     // Clear all data
  sessionStorage.clear();   // Clear session data
  // Reset global state (Redux/Zustand/Context)
  dispatch(resetAllState());
  navigate('/login');
};
```

---

## ✅ Checklist for Fixing

- [ ] Logout clears ALL localStorage/sessionStorage
- [ ] Logout resets all global state (Redux/Zustand/Context)
- [ ] Voting UI checks `event.userVotes` from API, not localStorage
- [ ] No voting state is persisted in browser storage
- [ ] Using `event.hasVoted` flag from API response
- [ ] Testing with incognito window shows correct behavior
- [ ] Testing with two different browsers shows correct behavior

---

## 🧪 Testing After Fix

### Test 1: Basic Two-User Test
1. Login as User A
2. Vote for proposals [1, 2]
3. Logout
4. Login as User B
5. ✅ Verify User B does NOT see "already voted"
6. ✅ Verify proposals [1, 2] are not pre-selected

### Test 2: Incognito Test
1. Window 1 (normal): Login as User A, vote
2. Window 2 (incognito): Login as User B
3. ✅ Verify User B doesn't see User A's votes

### Test 3: API Response Test
```bash
# Get event as User B (who hasn't voted)
curl -H "Authorization: Bearer <userB-token>" \
  http://localhost:8000/api/events/<eventId>

# Should return: "hasVoted": false, "userVotes": []
```

---

## 📞 Need More Help?

If the issue persists:

1. **Check Network Tab:** See what the API actually returns
2. **Check Console:** Look for JavaScript errors
3. **Use Debug Endpoint:** `GET /api/debug/voting-state/:eventId`
4. **Share these details:**
   - Frontend framework (React, Vue, etc.)
   - State management (Redux, Zustand, Context)
   - Browser used
   - API response from `/api/events/:eventId`
   - Console logs during login/logout

---

## 🎯 Summary

**This is 99% likely a FRONTEND issue**, specifically:
1. ✅ Browser storage (localStorage/sessionStorage) not cleared on logout
2. ✅ Frontend checking `proposal.voteCount` instead of `userVotes`
3. ✅ State management not reset between users

**The backend is working correctly** - it properly checks `userId` when determining if a user has voted.
