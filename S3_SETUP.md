# AWS S3 Setup Guide

This guide will help you configure AWS S3 for file storage in your Nexuses Asset application.

## Step 1: Create IAM User and Access Keys

1. **Go to AWS IAM Console**
   - Navigate to: https://console.aws.amazon.com/iam/
   - Click on "Users" in the left sidebar
   - Click "Create user"

2. **Create User**
   - Username: `nexuses-asset-uploader` (or any name you prefer)
   - Select "Provide access to users through access keys"
   - Click "Next"

3. **Set Permissions**
   - Click "Attach policies directly"
   - Search for and select: `AmazonS3FullAccess` (or create a custom policy with only necessary permissions)
   - Click "Next" → "Create user"

4. **Get Access Keys**
   - Click on the created user
   - Go to "Security credentials" tab
   - Click "Create access key"
   - Select "Application running outside AWS"
   - Click "Next" → "Create access key"
   - **IMPORTANT**: Copy both:
     - Access key ID
     - Secret access key (you won't see it again!)

## Step 2: Configure S3 Bucket

1. **Go to S3 Console**
   - Navigate to: https://s3.console.aws.amazon.com/
   - Click on your bucket name

2. **Configure CORS (Cross-Origin Resource Sharing)**
   - Click on "Permissions" tab
   - Scroll to "Cross-origin resource sharing (CORS)"
   - Click "Edit" and paste this configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

   - Click "Save changes"

3. **Configure Bucket Policy (Optional - for public access)**
   - If you want public access to files, go to "Permissions" → "Bucket policy"
   - Click "Edit" and add (replace `YOUR-BUCKET-NAME` with your bucket name):

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

   - **Note**: Only use this if you want files to be publicly accessible. For private files, skip this step.

4. **Block Public Access Settings**
   - If you want public access: Go to "Permissions" → "Block public access" → "Edit" → Uncheck all options → Save
   - If you want private access: Keep block public access enabled (default)

## Step 3: Get Your AWS Region

1. **Find your region**
   - Look at the top-right corner of AWS Console
   - Common regions: `us-east-1`, `us-west-2`, `eu-west-1`, etc.
   - Note down your region

## Step 4: Add Environment Variables

### For Local Development (.env.local)

Create or update `.env.local` in your project root:

```env
# Existing MongoDB config
MONGODB_URI=mongodb+srv://nexuses-asset:asset2025@cluster0.bltna7c.mongodb.net/?appName=Cluster0
NEXTAUTH_SECRET=your-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3000

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id-here
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name-here
AWS_S3_PUBLIC=false
AWS_CLOUDFRONT_URL=
```

**Replace:**
- `your-access-key-id-here` with your Access Key ID from Step 1
- `your-secret-access-key-here` with your Secret Access Key from Step 1
- `us-east-1` with your actual AWS region
- `your-bucket-name-here` with your S3 bucket name

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Click on "Settings" → "Environment Variables"
3. Add each variable:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `AWS_S3_BUCKET_NAME`
   - `AWS_S3_PUBLIC` (set to `false` or `true`)
   - `AWS_CLOUDFRONT_URL` (optional, leave empty if not using CloudFront)

## Step 5: Test the Configuration

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Test upload:**
   - Go to `/admin/dashboard`
   - Try uploading a file
   - Check your S3 bucket to see if the file appears in the `uploads/` folder

## Step 6: (Optional) Set Up CloudFront for Better Performance

If you want to use CloudFront CDN for faster file delivery:

1. **Create CloudFront Distribution**
   - Go to: https://console.aws.amazon.com/cloudfront/
   - Click "Create distribution"
   - Origin domain: Select your S3 bucket
   - Origin access: Choose based on your bucket settings
   - Default cache behavior: Configure as needed
   - Click "Create distribution"

2. **Update Environment Variable**
   - Wait for distribution to deploy (15-20 minutes)
   - Copy the distribution domain name (e.g., `d1234abcd.cloudfront.net`)
   - Update `AWS_CLOUDFRONT_URL` in your environment variables:
     ```env
     AWS_CLOUDFRONT_URL=https://d1234abcd.cloudfront.net
     ```

## Troubleshooting

### Issue: "Access Denied" when uploading
- **Solution**: Check IAM user permissions and bucket policy

### Issue: CORS error in browser
- **Solution**: Verify CORS configuration in S3 bucket settings

### Issue: Files not accessible
- **Solution**: 
  - If using public bucket: Enable public access and add bucket policy
  - If using private bucket: The app will use presigned URLs automatically

### Issue: "S3 is not configured" error
- **Solution**: Verify all environment variables are set correctly

## Security Best Practices

1. **Use IAM Policy with Least Privilege** (Recommended)
   Instead of `AmazonS3FullAccess`, create a custom policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
        }
    ]
}
```

2. **Rotate Access Keys Regularly**
   - Change access keys every 90 days
   - Never commit keys to version control

3. **Use Environment Variables**
   - Never hardcode credentials in code
   - Use environment variables for all sensitive data

## Next Steps

Once configured, your application will:
- Upload files directly from client to S3 (bypassing Vercel limits)
- Store file references in MongoDB
- Serve files via presigned URLs or public URLs
- Support files up to 200MB (or S3's limit)

The system automatically falls back to MongoDB GridFS if S3 is not configured.




