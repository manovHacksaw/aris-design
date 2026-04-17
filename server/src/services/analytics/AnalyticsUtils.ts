export function getAgeGroup(dateOfBirth: Date | null): string {
    if (!dateOfBirth) return 'unknown';
    const now = new Date();
    const age = Math.floor((now.getTime() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age <= 24) return '24_under';
    if (age <= 34) return '25_34';
    if (age <= 44) return '35_44';
    if (age <= 54) return '45_54';
    if (age <= 64) return '55_64';
    return '65_plus';
}

export function normalizeGender(gender: string | null): string {
    if (!gender) return 'unknown';
    const g = gender.toLowerCase().trim();
    if (g === 'male') return 'male';
    if (g === 'female') return 'female';
    if (g === 'non-binary') return 'nonBinary';
    if (g === 'prefer not to say') return 'unknown';
    return 'other';
}

export function computeEntropy(voteCounts: number[], totalVotes: number): number {
    if (totalVotes === 0) return 0;
    let entropy = 0;
    for (const count of voteCounts) {
        if (count === 0) continue;
        const p = count / totalVotes;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

export function initGenderCounts() {
    return { male: 0, female: 0, nonBinary: 0, other: 0, unknown: 0 };
}

export function initAgeGroupCounts() {
    return { '24_under': 0, '25_34': 0, '35_44': 0, '45_54': 0, '55_64': 0, '65_plus': 0, unknown: 0 };
}
