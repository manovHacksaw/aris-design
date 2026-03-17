import { apiRequest } from "./api";

export interface Brand {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logoCid: string | null;
  logoUrls?: { thumbnail: string; medium: string; full: string };
  categories: string[];
  socialLinks: Record<string, string> | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  isActive: boolean;
  isVerified: boolean;
  level: number;
  eventsCreated: number;
  uniqueParticipants: number;
  totalUsdcGiven: number;
  lockedFields: string[];
  applicationData: {
    companyName: string;
    gstNumber: string;
    panNumber: string;
    contactPersonName: string;
    contactRole: string;
    phoneNumber: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertBrandData {
  name?: string;
  tagline?: string;
  description?: string;
  logoCid?: string;
  categories?: string[];
  socialLinks?: Record<string, string>;
}

export async function getCurrentBrand(): Promise<Brand> {
  return apiRequest<Brand>("/brands/me");
}

export async function upsertBrandProfile(data: UpsertBrandData): Promise<{ success: boolean; brand: Brand }> {
  return apiRequest<{ success: boolean; brand: Brand }>("/brands", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getBrandAnalyticsOverview(): Promise<any> {
  return apiRequest<any>("/analytics/brand/overview");
}

export async function getBrandById(id: string): Promise<Brand> {
  return apiRequest<Brand>(`/brands/${id}`);
}

export async function getAllBrands(params?: { limit?: number; offset?: number }): Promise<{ success: boolean; brands: Brand[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  const qs = searchParams.toString();
  return apiRequest<{ success: boolean; brands: Brand[] ; total: number }>(`/brands${qs ? `?${qs}` : ""}`);
}
