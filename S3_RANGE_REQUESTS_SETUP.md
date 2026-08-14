# S3 Range Requests Setup for Fast PDF Loading

## Critical: Enable Range Requests in S3

For 30-40 MB files to load quickly, your S3 bucket **MUST** support range requests. Here's how to ensure it's configured correctly:

### Step 1: Verify CORS Configuration

Go to your S3 bucket → Permissions → CORS configuration and add:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "Content-Range",
            "Accept-Ranges",
            "Content-Length",
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

**CRITICAL:** The `ExposeHeaders` must include `Content-Range` and `Accept-Ranges` for range requests to work!

### Step 2: Verify Bucket Policy

Your bucket policy should allow public read access:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::nexuses-asset/*"
        }
    ]
}
```

### Step 3: Check S3 Object Metadata

Ensure your uploaded files have:
- `Content-Type` set correctly (e.g., `application/pdf` for PDFs)
- `Cache-Control` header (optional but recommended)

### Step 4: Use CloudFront (RECOMMENDED for 30-40 MB files)

For large files, CloudFront CDN is **highly recommended**:

1. Create CloudFront distribution pointing to your S3 bucket
2. Set `AWS_CLOUDFRONT_URL` environment variable
3. CloudFront automatically handles range requests better than direct S3

### Why Range Requests Matter

- **Without range requests:** Browser downloads entire 30-40 MB file before showing anything (15-18 seconds)
- **With range requests:** Browser downloads only first 8-64 KB for metadata + first page (1-2 seconds)

### Testing Range Requests

Test if range requests work by running in browser console:

```javascript
fetch('YOUR_S3_URL', {
  headers: { 'Range': 'bytes=0-1023' }
}).then(r => {
  console.log('Range request works:', r.status === 206);
  console.log('Content-Range header:', r.headers.get('Content-Range'));
});
```

Should return status `206 Partial Content` with `Content-Range` header.



