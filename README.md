# Nexuses Asset Viewer

A Next.js application for viewing PDF assets with an admin dashboard for managing assets.

## Features

- **Main Viewer**: Sidebar with file list and PDF viewer on the right
- **Admin Authentication**: Login and signup pages for admin access
- **Asset Management**: Add, view, and delete assets from the admin dashboard
- **MongoDB Integration**: Stores assets and admin credentials in MongoDB

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local` file in the root directory:**
   ```env
   MONGODB_URI=mongodb+srv://nexuses-asset:asset****@cluster0.bltna7c.mongodb.net/?appName=Cluster0
   NEXTAUTH_SECRET=your-secret-key-change-in-production
   NEXTAUTH_URL=http://localhost:3000
   
   # AWS S3 Configuration (for file storage)
   AWS_ACCESS_KEY_ID=your-aws-access-key-id
   AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=your-bucket-name
   AWS_S3_PUBLIC=false  # Set to true if bucket is public, or use CloudFront
   AWS_CLOUDFRONT_URL=  # Optional: CloudFront distribution URL
   ```
   
   **Important**: 
   - Replace `asset****` in the MongoDB URI with your actual password.
   - Configure AWS S3 credentials for file storage (recommended for production).
   - If S3 is not configured, the app will fall back to MongoDB GridFS (not recommended for large files on Vercel).

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Main viewer: [http://localhost:3000](http://localhost:3000)
   - Admin login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
   - Admin signup: [http://localhost:3000/admin/signup](http://localhost:3000/admin/signup)
   - Admin dashboard: [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)

## Usage

### Admin Dashboard

1. Sign up for an admin account at `/admin/signup`
2. Log in at `/admin/login`
3. Add assets with:
   - **Title**: Display name for the asset
   - **Link**: PDF URL (required)
   - **File Upload / URL**: Optional additional file URL
4. Delete assets using the delete button

### Main Viewer

- View all assets in the sidebar
- Click on an asset to view it in the PDF viewer
- Navigate through PDF pages using Previous/Next buttons

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **MongoDB** - Database
- **react-pdf** - PDF viewing
- **bcryptjs** - Password hashing

## Project Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── login/          # Admin login page
│   │   ├── signup/          # Admin signup page
│   │   └── dashboard/      # Admin dashboard
│   ├── api/
│   │   ├── auth/           # Authentication endpoints
│   │   └── assets/         # Asset CRUD endpoints
│   └── page.tsx            # Main viewer page
├── components/
│   └── PDFViewer.tsx       # PDF viewer component
└── lib/
    ├── mongodb.ts          # MongoDB connection
    ├── db.ts               # Database operations
    └── auth.ts             # Authentication utilities
```

## Notes

- The MongoDB connection string should be updated with your actual password
- For production, update `NEXTAUTH_SECRET` with a secure random string
- File uploads currently support URLs only. For direct file uploads, integrate a file storage service (AWS S3, Cloudinary, etc.)
