
// Mocking the scoring function for verification
function calculateEventScore(event: any) {
    let score = 0;
    if (event.status === 'posting') score += 1000;
    else if (event.status === 'voting') score += 800;
    else return -1;
    const totalReward = (event.baseReward || 0) + (event.topReward || 0) + (event.leaderboardPool || 0);
    score += Math.min(500, Math.log10(totalReward + 1) * 125);
    const now = Date.now();
    const endTime = new Date(event.endTime).getTime();
    const hoursLeft = (endTime - now) / (1000 * 60 * 60);
    if (hoursLeft > 0 && hoursLeft < 48) {
        score += (48 - hoursLeft) * (300 / 48);
    }
    const startTime = new Date(event.startTime).getTime();
    const hoursActive = Math.max(1, (now - startTime) / (1000 * 60 * 60));
    const submissionsCount = event._count?.submissions || 0;
    const votesCount = event._count?.votes || 0;
    const engagementDensity = ((submissionsCount * 5) + votesCount) / hoursActive;
    score += Math.min(200, engagementDensity * 50);
    const createdAt = new Date(event.createdAt).getTime();
    const hoursOld = (now - createdAt) / (1000 * 60 * 60);
    if (hoursOld < 72) {
        score += (72 - hoursOld) * (200 / 72);
    }
    if (event.brand?.isVerified) score += 100;
    score += (event.brand?.level || 0) * 10;
    return score;
}

const mockEvents = [
    { 
        id: '1', title: 'High Prize New', status: 'posting', 
        baseReward: 1000, endTime: new Date(Date.now() + 86400000).toISOString(),
        startTime: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        brand: { isVerified: true, level: 5 },
        _count: { submissions: 10, votes: 100 }
    },
    { 
        id: '2', title: 'Low Prize Old', status: 'posting', 
        baseReward: 10, endTime: new Date(Date.now() + 86400000 * 5).toISOString(),
        startTime: new Date(Date.now() - 86400000 * 4).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        brand: { isVerified: false, level: 1 },
        _count: { submissions: 1, votes: 5 }
    },
    { 
        id: '3', title: 'Ending Soon', status: 'voting', 
        baseReward: 100, endTime: new Date(Date.now() + 3600000).toISOString(),
        startTime: new Date(Date.now() - 86400000 * 2).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        brand: { isVerified: true, level: 3 },
        _count: { submissions: 20, votes: 500 }
    }
];

const results = mockEvents.map(e => ({ name: e.title, score: calculateEventScore(e) }));
results.sort((a, b) => b.score - a.score);
console.log(JSON.stringify(results, null, 2));
