# Performance Optimization for PDF Loading

## Current Setup
The application now uses **direct S3 URLs** instead of proxying through Vercel, which significantly improves loading speed.

## Option 1: Public S3 Bucket (FASTEST - Recommended)

This is the fastest option as files are served directly from S3 with no redirects or authentication.

### Steps:

1. **Make your S3 bucket public:**
   - Go to S3 Console → Your bucket → Permissions
   - Click "Block public access" → Edit
   - Uncheck all 4 options → Save
   - Click "Bucket policy" → Edit → Add:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

2. **Update environment variable:**
   ```env
   AWS_S3_PUBLIC=true
   ```

3. **Redeploy to Vercel**

**Result:** PDFs will load instantly as they're served directly from S3 CDN.

---

## Option 2: CloudFront CDN (FAST + SECURE)

Use CloudFront for fast global delivery while keeping the bucket private.

### Steps:

1. **Create CloudFront Distribution:**
   - Go to CloudFront Console
   - Create distribution
   - Origin: Your S3 bucket
   - Default cache behavior: Allow GET, HEAD, OPTIONS
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Create distribution

2. **Wait for deployment** (15-20 minutes)

3. **Update environment variable:**
   ```env
   AWS_CLOUDFRONT_URL=https://d1234abcd.cloudfront.net
   ```

4. **Redeploy to Vercel**

**Result:** PDFs load fast from CloudFront edge locations worldwide.

---

## Option 3: Presigned URLs (CURRENT - SLOWER)

Currently using presigned URLs with 24-hour validity. This works but requires a redirect.

**Performance:** Moderate (redirect adds ~100-200ms)

---

## CORS Configuration (Required for all options)

Make sure your S3 bucket has proper CORS configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag", "Content-Length"],
        "MaxAgeSeconds": 3000
    }
]
```

---

## Performance Comparison

| Method | Speed | Security | Setup |
|--------|-------|----------|-------|
| Public S3 | ⚡⚡⚡ Fastest | Public | Easy |
| CloudFront | ⚡⚡ Very Fast | Private | Medium |
| Presigned URLs | ⚡ Moderate | Private | Easy |

---

## Recommendation

For best performance with public assets (PDFs, videos):
- **Use Option 1 (Public S3)** - Fastest and simplest
- Files are already in S3, making them public is safe if they're meant to be viewed

For private/secure assets:
- **Use Option 2 (CloudFront)** - Fast with security




