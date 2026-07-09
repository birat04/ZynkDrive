# ZynkDrive Setup Guide

Welcome to ZynkDrive! This guide will help you get the application up and running.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Authentication Setup](#authentication-setup)
5. [Local Development](#local-development)
6. [Project Structure](#project-structure)
7. [Key Features Explained](#key-features-explained)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Make sure you have the following installed:

- **Node.js**: v18 or higher
- **npm** or **yarn**: Package manager
- **Git**: Version control (optional, for cloning)
- **Docker** (optional): For running Appwrite locally

### Verify Installation

```bash
node --version  # Should be v18+
npm --version
```

## Environment Setup

### Step 1: Clone or Download the Project

```bash
cd ZynkDrive
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages including:
- Next.js 15 (React framework)
- Appwrite SDK (backend)
- Tailwind CSS (styling)
- Zod (validation)
- date-fns (date utilities)

### Step 3: Create Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

This creates a `.env.local` file with all required variables. You'll need to fill in the values in the next step.

## Database Configuration

### Option A: Use Appwrite Cloud (Recommended for Getting Started)

1. **Create a Free Account**
   - Go to [Appwrite Cloud](https://cloud.appwrite.io)
   - Sign up and create a new project
   - Note your Project ID

2. **Create API Key**
   - Go to Settings → API Keys
   - Create a new API key with database permissions
   - Copy the key for use in `.env.local`

3. **Get Your Endpoint**
   - In Settings → General, find your Appwrite endpoint
   - Usually: `https://cloud.appwrite.io/v1`

### Option B: Run Appwrite Locally (Advanced)

```bash
# Install Docker if not already installed
docker run -d --name appwrite_server \
    -p 80:80 -p 443:443 \
    appwrite/appwrite:latest

# Access at http://localhost:80
# Create account and project in the web interface
```

### Step 4: Setup Database Collections

Follow the detailed guide in [docs/DATABASE_SETUP.md](DATABASE_SETUP.md):

**Quick Summary:**
1. Create 9 collections (Users, Files, Folders, Shares, etc.)
2. Create 2 storage buckets (files, thumbs)
3. Set up proper indexes for performance

The `docs/DATABASE_SETUP.md` file includes a comprehensive table showing all fields for each collection.

### Step 5: Update .env.local

Fill in your `.env.local` with values from Appwrite:

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite-instance.com/v1
NEXT_PUBLIC_APPWRITE_PROJECT=your_project_id
NEXT_APPWRITE_KEY=your_api_key
NEXT_PUBLIC_APPWRITE_DATABASE=your_database_id
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION=users
# ... other collection IDs
```

See `.env.example` for all available variables.

## Authentication Setup

### Email Service (Recommended: Resend)

1. **Sign Up for Email Service**
   - Go to [Resend](https://resend.com) (free tier available)
   - Create API key
   - Verify email address

2. **Update .env.local**
   ```bash
   EMAIL_PROVIDER=resend
   EMAIL_API_KEY=your_email_api_key
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_FROM_NAME=ZynkDrive
   ```

### Optional: Social Authentication

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID and Secret to `.env.local`

#### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/github/callback`
4. Copy Client ID and Secret to `.env.local`

## Local Development

### Start Development Server

```bash
npm run dev
```

The application will start at `http://localhost:3000`

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm start

# Run type checking
npm run type-check

# Run linting
npm run lint

# Format code
npm run format
```

### Development Environment Checklist

- ✅ Node.js installed
- ✅ Dependencies installed (`npm install`)
- ✅ `.env.local` file created and populated
- ✅ Appwrite collections created
- ✅ Storage buckets created
- ✅ Email service configured (if needed)
- ✅ `npm run dev` running without errors

## Project Structure

```
ZynkDrive/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── sign-in/
│   │   ├── sign-up/
│   │   └── layout.tsx
│   ├── (root)/                   # Main application routes
│   │   ├── page.tsx              # Dashboard
│   │   ├── [type]/               # File type routes
│   │   └── layout.tsx
│   ├── shared/[token]/           # Public share page
│   └── layout.tsx                # Root layout
│
├── components/                    # React components
│   ├── ui/                       # shadcn/ui components
│   ├── ActionDropdown.tsx
│   ├── FileUploader.tsx
│   ├── Search.tsx
│   └── ...
│
├── lib/                           # Core business logic
│   ├── appwrite/                 # Appwrite client setup
│   ├── actions/                  # Server actions
│   │   ├── file.actions.ts       # File operations
│   │   ├── folder.actions.ts     # Folder management
│   │   ├── share.actions.ts      # Sharing system
│   │   ├── activity.actions.ts   # Audit logging
│   │   ├── notification.actions.ts
│   │   ├── device.actions.ts
│   │   ├── comment.actions.ts
│   │   ├── version.actions.ts
│   │   ├── search.actions.ts
│   │   └── user.actions.ts
│   ├── utils/                    # Utilities
│   │   └── formatting.ts         # Format functions
│   ├── constants/                # App constants
│   ├── validators/               # Zod schemas
│   └── utils.ts                  # General utilities
│
├── middleware/                    # Next.js middleware
│   ├── auth.ts                   # Authentication middleware
│   └── rateLimit.ts              # Rate limiting
│
├── public/                        # Static assets
├── styles/                        # Global styles
├── .env.example                   # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Key Features Explained

### 1. File Management
- **Upload/Download**: Stream-based file handling
- **Folder Hierarchy**: Nested folders with path tracking
- **Soft Delete**: Files go to trash for 30 days
- **Restore/Permanent Delete**: User control over deletion

### 2. Sharing System
- **Public Links**: Generate shareable URLs
- **Password Protection**: Optional password for shares
- **Download Limits**: Control access frequency
- **Expiration**: Time-limited shares
- **End-to-End Encryption**: Encrypted shares for privacy

### 3. Activity Logging
- **Audit Trail**: Track all user actions
- **Statistics**: Usage insights and trends
- **Recently Accessed**: Smart file suggestions
- **Action Timeline**: Detailed activity history

### 4. Notifications
- **Share Alerts**: Notify when files shared
- **Comments**: Collaboration notifications
- **Mentions**: Tag users in comments
- **Security Events**: New device alerts
- **Quota Warnings**: Storage limit alerts

### 5. Search & Filter
- **Full-Text Search**: Find files by name
- **Advanced Filters**: By type, date, size
- **Recent Searches**: Smart suggestions
- **Search History**: Client-side persistence

### 6. Security
- **Device Tracking**: Monitor active sessions
- **Two-Factor Auth**: TOTP verification
- **Email Verification**: Gate sensitive operations
- **Rate Limiting**: Prevent abuse
- **Security Headers**: CORS, CSP, X-Frame-Options

### 7. Versioning (Optional)
- **File Versions**: Keep history of changes
- **Restore Previous**: Revert to old versions
- **Version Stats**: Storage usage analysis
- **Auto Cleanup**: Remove old versions

### 8. Collaboration (Optional)
- **Comments**: Discuss files
- **Mentions**: Tag users with @
- **Threaded Discussions**: Organized comments
- **Notifications**: Stay updated on feedback

## Configuration

### Feature Flags

Enable/disable features via `.env.local`:

```bash
# Enable end-to-end encryption
NEXT_PUBLIC_ENCRYPTION_ENABLED=false

# Enable AI features (OCR, summarization)
NEXT_PUBLIC_AI_FEATURES_ENABLED=false

# Enable collaboration (comments, mentions)
NEXT_PUBLIC_COLLABORATION_ENABLED=false

# Enable version history
NEXT_PUBLIC_VERSION_HISTORY_ENABLED=true

# Enable two-factor authentication
NEXT_PUBLIC_2FA_ENABLED=true
```

### Storage Plans

Three tiers available:

1. **Free**: 5GB storage, basic features
2. **Pro**: 2TB storage, advanced features, $9.99/month
3. **Team**: 5TB storage, collaboration, $24.99/month

### Rate Limiting

Protect your API with rate limits:

- **Login**: 5 attempts per 15 minutes
- **Upload**: 100 files per hour
- **Download**: 1000 files per hour
- **Share**: 50 shares per hour

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# macOS/Linux: Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Appwrite Connection Issues

1. **Check endpoint URL** - Verify NEXT_PUBLIC_APPWRITE_ENDPOINT
2. **Check project ID** - Confirm NEXT_PUBLIC_APPWRITE_PROJECT
3. **Check API key** - Verify NEXT_APPWRITE_KEY
4. **Check collections** - Ensure all 9 collections exist
5. **Check network** - Can you access Appwrite console?

### Database Query Errors

If getting "Collection not found" errors:

1. Go to Appwrite console
2. Verify all 9 collections exist with correct IDs
3. Update `.env.local` with exact collection IDs
4. Check database ID is correct

### Build Errors

Clear cache and rebuild:

```bash
rm -rf .next
npm run build
```

### Authentication Issues

1. Check `.env.local` has NEXTAUTH_SECRET set
2. Verify email service API key
3. Check OAuth credentials if using social auth
4. Ensure redirect URIs match your domain

## Getting Help

- **Documentation**: See `README.md` and `docs/` folder
- **Appwrite Docs**: https://appwrite.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Stack Overflow**: Tag with `appwrite` and `nextjs`

## Next Steps

1. ✅ Complete setup following this guide
2. 📝 Create your first user account
3. 📤 Upload your first file
4. 🔗 Create a share link
5. 💬 Add comments to files
6. 🎯 Explore advanced features

## Production Deployment

When ready to deploy:

1. **Choose a Platform**: Vercel, Netlify, Docker, AWS, etc.
2. **Set Environment Variables**: Add all `.env.example` values
3. **Build for Production**: `npm run build`
4. **Deploy**: Follow platform-specific instructions
5. **Monitor**: Set up error tracking (Sentry)
6. **Backup**: Implement regular backups

See `docs/DEPLOYMENT.md` for detailed deployment guide (if available).

---

**Happy storing!** 🚀 Questions? Check the documentation or open an issue on GitHub.
