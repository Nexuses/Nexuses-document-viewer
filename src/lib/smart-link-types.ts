export type SmartLinkStatus = 'draft' | 'published';

export type SmartLinkContentType =
  | 'pdf'
  | 'ppt'
  | 'video'
  | 'image'
  | 'website'
  | 'html'
  | 'doc'
  | 'utm'
  | 'lead_form';

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

export interface LeadFormConfig {
  heading?: string;
  collectName?: boolean;
  collectEmail?: boolean;
  collectCompany?: boolean;
}

export interface SmartLinkContentItem {
  id: string;
  type: SmartLinkContentType;
  title?: string;
  url?: string;
  fileUrl?: string;
  fileName?: string;
  pageCount?: number;
  slideCount?: number;
  html?: string;
  utm?: UtmParams;
  leadForm?: LeadFormConfig;
}

export interface SmartLink {
  _id?: string;
  title: string;
  description?: string;
  coverImage?: string;
  companyLogo?: string;
  slug: string;
  owner: string;
  status: SmartLinkStatus;
  content: SmartLinkContentItem[];
  views: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'smart-link'
  );
}
