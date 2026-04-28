// ==================== BRAND LEVEL CONFIGURATION ====================

export interface BrandLevelConfig {
  level: number;
  usdcGiven: number;
  eventsCreated: number;
  uniqueParticipants: number;
  discountPercent: number;
}

// ==================== BRAND METRICS ====================

export interface BrandMetrics {
  usdcGiven: number;
  eventsCreated: number;
  uniqueParticipants: number;
}

export interface BrandLevelProgress {
  usdcGiven: number; // percentage 0-100
  eventsCreated: number; // percentage 0-100
  uniqueParticipants: number; // percentage 0-100
}

// ==================== BRAND LEVEL STATUS ====================

export interface NextLevelInfo {
  level: number;
  requirements: BrandMetrics;
  discountPercent: number;
  progress: BrandLevelProgress;
}

export interface BrandLevelStatus {
  level: number;
  discountPercent: number;
  metrics: BrandMetrics;
  nextLevel: NextLevelInfo | null; // null if at max level
}

// ==================== BRAND LEVEL UPDATE ====================

export interface BrandLevelUpdateResult {
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  metrics: BrandMetrics;
  discountPercent: number;
}

// ==================== API RESPONSE TYPES ====================

export interface BrandLevelStatusResponse {
  success: boolean;
  data: BrandLevelStatus;
}

export interface BrandDiscountResponse {
  success: boolean;
  discountPercent: number;
}

export interface BrandLevelHistoryResponse {
  success: boolean;
  snapshots: BrandLevelSnapshotSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface BrandLevelSnapshotSummary {
  id: string;
  level: number;
  previousLevel: number;
  totalUsdcGiven: number;
  eventsCreated: number;
  uniqueParticipants: number;
  discountPercent: number;
  triggeredBy: string;
  eventId: string | null;
  createdAt: Date;
}

export interface RecalculateBrandLevelResponse {
  success: boolean;
  data: BrandLevelUpdateResult;
}
