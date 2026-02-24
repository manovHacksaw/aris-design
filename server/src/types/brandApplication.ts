/**
 * Brand document types
 */
export type BrandDocumentType =
  | 'COMPANY_REGISTRATION'
  | 'GST_CERTIFICATE'
  | 'PAN_CARD'
  | 'BRAND_LOGO'
  | 'OTHER';

/**
 * Document upload interface
 */
export interface DocumentUpload {
  documentType: BrandDocumentType;
  fileName: string;
  fileData: string; // Base64 encoded file data or IPFS CID
  fileUrl?: string; // Optional direct URL
  expiryDate?: Date;
}

/**
 * Brand application request
 */
export interface BrandApplicationRequest {
  brandName: string;
  companyName?: string;
  tagline?: string;
  description?: string;
  categories: string[];
  contactEmail: string;
  contactPersonName: string;
  contactRole: string;
  phoneNumber?: string;
  telegramHandle?: string;
  socialLinks?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    facebook?: string;
  };
  gstNumber?: string;
  panNumber?: string;
  platformUsageReason: string;
  agreementAuthorized: boolean;
  agreementAccurate: boolean;
  documents: DocumentUpload[];
}

/**
 * Brand application response
 */
export interface BrandApplicationResponse {
  success: boolean;
  applicationId: string;
  message: string;
  application?: {
    id: string;
    brandName: string;
    contactEmail: string;
    status: string;
    submittedAt: Date;
  };
}
