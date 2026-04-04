
function calculateCreatorScore(user: any) {
    let score = 0;
    score += Math.min(500, (user.totalSubmissions || 0) * 50);
    score += Math.min(300, (user.totalVotes || 0) * 2);
    score += (user.trustScore || 0.5) * 100;
    score += (user.level || 1) * 20;
    if (user.lastLoginAt) {
        const hoursSinceLogin = (Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLogin < 168) {
            score += (168 - hoursSinceLogin) * (200 / 168);
        }
    }
    return score;
}

const mockCreators = [
    { id: '1', username: 'active_pro', totalSubmissions: 10, totalVotes: 100, trustScore: 0.9, level: 5, lastLoginAt: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', username: 'newbie', totalSubmissions: 1, totalVotes: 5, trustScore: 0.5, level: 1, lastLoginAt: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', username: 'old_pro', totalSubmissions: 20, totalVotes: 500, trustScore: 0.8, level: 10, lastLoginAt: new Date(Date.now() - 86400000 * 10).toISOString() }
];

const results = mockCreators.map(c => ({ username: c.username, score: calculateCreatorScore(c) }));
results.sort((a, b) => b.score - a.score);
console.log(JSON.stringify(results, null, 2));
