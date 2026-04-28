// import { UserRole } from "@prisma/client";

/**
 * Demographic criteria for hard and soft filtering.
 */
export interface EventDemographics {
  preferredGender: string | null; // Soft/Hard fallback
  ageGroup: string | null;        // Soft
  regions: string[];             // Hard
  ageRestriction: number | null;   // Hard
  genderRestriction: string | null; // Hard
}

/**
 * User data required for demographic checking.
 */
export interface UserDemographics {
  gender: string | null;
  dateOfBirth: Date | null;
  region: string | null;
}

/**
 * Central utility to enforce strict demographic restrictions (Hard Filters).
 * Throws an Error if the user is ineligible.
 */
export function enforceEventDemographics(
  event: EventDemographics,
  user: UserDemographics | null
): void {
  // If user is unknown (unauthenticated), skip demographic filtering —
  // restrictions are enforced at participation time, not at discovery.
  if (!user) return;

  // 1. Hard Gender Restriction (Strict Enforcement)
  if (event.genderRestriction) {
    const userGender = (user.gender ?? '').trim().toUpperCase();
    if (userGender !== event.genderRestriction.toUpperCase()) {
      throw new Error(`This event is strictly restricted to ${event.genderRestriction === 'M' ? 'male' : 'female'} participants only.`);
    }
  }

  // 2. Hard Age Restriction (Strict Enforcement)
  if (event.ageRestriction) {
    if (!user.dateOfBirth) {
      throw new Error('Your profile is missing a date of birth. This event requires strict age verification.');
    }
    
    const age = (Date.now() - new Date(user.dateOfBirth).getTime()) / (31557600000); // ms in a year
    if (age < event.ageRestriction) {
      throw new Error(`Access Denied: You must be at least ${event.ageRestriction} years old to view or participate in this event.`);
    }
  }

  // 3. Regional Hard Filter
  if (event.regions && event.regions.length > 0) {
    if (!user.region || !event.regions.map(r => r.toLowerCase()).includes(user.region.toLowerCase())) {
      throw new Error(`This event is not available in your current region (${user.region || 'Unknown'}).`);
    }
  }
}

/**
 * Helper to calculate age from date of birth.
 */
export function calculateAge(dob: Date | string): number {
  return (Date.now() - new Date(dob).getTime()) / (31557600000);
}
