import { EventType } from '@prisma/client';
import { ValidationError } from '../../utils/errors.js';
import {
  CreateEventRequest,
  EventStatusType,
  VALID_TRANSITIONS,
  LOCKED_FIELDS_MAP,
  TimestampData,
  ValidationResult,
} from '../../types/event.js';

export class EventValidationService {

  // ==================== VALIDATION HELPERS ====================

  /**
   * Validate event data fields
   */
  static validateEventData(
    data: Partial<CreateEventRequest>,
    eventType: EventType
  ): ValidationResult {
    const errors: string[] = [];

    // Title validation
    if (data.title !== undefined) {
      const trimmedTitle = data.title.trim();
      if (trimmedTitle.length === 0) {
        errors.push('Title cannot be empty');
      }
      if (trimmedTitle.length > 200) {
        errors.push('Title must be 200 characters or less');
      }
    }

    // Description validation
    if (data.description !== undefined && data.description.length > 2000) {
      errors.push('Description must be 2000 characters or less');
    }

    // Event type specific validations
    if (eventType === 'post_and_vote') {
      // leaderboardPool is optional — defaults to 0
      if (data.leaderboardPool !== undefined && (data.leaderboardPool as any) < 0) {
        errors.push('leaderboardPool cannot be negative');
      }
    }

    // Samples validation for post_and_vote — optional, skip if not provided
    if (eventType === 'post_and_vote') {
      if (data.samples && data.samples.length > 10) {
        errors.push('Maximum 10 sample images allowed');
      }

      // Validate sample CIDs only if samples are provided
      if (data.samples && data.samples.length > 0) {
        const invalidCids = data.samples
          .filter(s => !s.startsWith('http'))
          .some(cid => !/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,})$/.test(cid));
        if (invalidCids) {
          errors.push('One or more sample CIDs are invalid');
        }
      }
    }

    // IPFS CID validation (only if imageUrl is not provided)
    if (data.imageCid != null && data.imageCid.length > 0 && !data.imageUrl) {
      if (!/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,})$/.test(data.imageCid)) {
        errors.push('Invalid IPFS CID format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }


  /**
   * Validate timestamp logic and ordering
   */
  static validateTimestamps(
    data: TimestampData,
    eventType: EventType
  ): ValidationResult {
    const errors: string[] = [];
    const now = new Date();

    const { startTime, endTime, postingStart, postingEnd } = data;

    // Start time must be in the future (with 5 minute buffer for clock drift)
    if (startTime <= new Date(now.getTime() - 300000)) {
      errors.push('startTime must be in the future');
    }

    // End time must be after start time
    if (endTime <= startTime) {
      errors.push('endTime must be after startTime');
    }

    // Validate posting phase timestamps for post_and_vote events
    // postingStart/postingEnd are optional — if omitted they are auto-derived by the caller
    if (eventType === 'post_and_vote' && postingStart && postingEnd) {
      // Posting start must be before or equal to event start
      if (postingStart > startTime) {
        errors.push('postingStart must be before or equal to startTime');
      }

      // Posting end must be after posting start
      if (postingEnd <= postingStart) {
        errors.push('postingEnd must be after postingStart');
      }

      // Posting end must be before or equal to event end
      if (postingEnd > endTime) {
        errors.push('postingEnd must be before or equal to endTime');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }


  /**
   * Get locked fields for a given event status
   */
  public static getLockedFields(status: string): string[] {
    return LOCKED_FIELDS_MAP[status as EventStatusType] || [];
  }


  /**
   * Check if a status transition is valid
   */
  static isValidStatusTransition(
    currentStatus: string,
    newStatus: string
  ): boolean {
    const validNextStatuses = VALID_TRANSITIONS[currentStatus as EventStatusType];
    return validNextStatuses?.includes(newStatus as EventStatusType) ?? false;
  }


  /**
   * Parse ISO 8601 date string to Date object
   */
  static parseDate(dateString: string): Date {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new ValidationError(`Invalid date format: ${dateString}`);
    }
    return date;
  }
}
