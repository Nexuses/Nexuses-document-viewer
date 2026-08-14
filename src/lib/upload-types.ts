export const ALLOWED_UPLOAD_TYPES = [
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/html',
];

export function isAllowedUploadType(contentType: string, fileName?: string): boolean {
  if (ALLOWED_UPLOAD_TYPES.includes(contentType)) return true;
  const name = (fileName || '').toLowerCase();
  return /\.(pdf|ppt|pptx|doc|docx|mp4|webm|mov|jpe?g|png|webp|gif|html?)$/.test(name);
}
