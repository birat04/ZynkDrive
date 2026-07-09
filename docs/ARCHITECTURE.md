# ZynkDrive Architecture Documentation

This document outlines the complete architecture of ZynkDrive, a zero-knowledge cloud storage platform built with Next.js 15 and Appwrite.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Data Model](#data-model)
4. [Security Architecture](#security-architecture)
5. [API Design](#api-design)
6. [Storage Strategy](#storage-strategy)
7. [Performance Considerations](#performance-considerations)
8. [Scalability Plan](#scalability-plan)

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js 15 Frontend                   │
│  (React Components, Server Components, Server Actions) │
└────────────────┬──────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
   ┌─────────┐      ┌──────────┐
   │ Browser │      │ Database │
   │ Storage │      │ Storage  │
   └─────────┘      └──────────┘
        │                 │
        └────────┬────────┘
                 │
        ┌────────▼─────────┐
        │   Appwrite BaaS  │
        │  (Auth, DB, API) │
        └──────────────────┘
```

### Component Layers

#### 1. **Presentation Layer** (Client & Server Components)
- React 19 components using App Router
- Server Components for initial data load
- Client Components for interactivity
- Form validation using Zod

#### 2. **Business Logic Layer** (Server Actions)
Located in `lib/actions/`:
- `file.actions.ts` - Basic file CRUD
- `file-extended.actions.ts` - Complex file operations
- `folder.actions.ts` - Folder hierarchy management
- `share.actions.ts` - Sharing & access control
- `activity.actions.ts` - Audit logging
- `comment.actions.ts` - Collaboration features
- `notification.actions.ts` - User notifications
- `device.actions.ts` - Session management
- `search.actions.ts` - Search & filtering
- `version.actions.ts` - File versioning

#### 3. **Data Layer** (Appwrite)
- Document database for metadata
- Object storage for file blobs
- Real-time subscriptions
- Built-in authentication
- Permission system

#### 4. **Utility & Helper Layer**
- `lib/utils/formatting.ts` - Data formatting
- `lib/constants/index.ts` - Configuration
- `lib/validators/index.ts` - Zod schemas
- `middleware/auth.ts` - Security middleware

## Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form + Zod

### Backend
- **BaaS**: Appwrite (Auth, Database, Storage, Functions)
- **Database**: Document DB (similar to MongoDB)
- **Storage**: Object storage (S3-compatible)
- **API**: REST + Real-time subscriptions

### DevOps
- **Runtime**: Node.js 18+
- **Package Manager**: npm/yarn
- **Version Control**: Git
- **CI/CD**: GitHub Actions (optional)
- **Monitoring**: Sentry (optional)

### Optional Add-ons
- **Email**: Resend, SendGrid, Postmark
- **OAuth**: Google, GitHub
- **Analytics**: Plausible, PostHog
- **Rate Limiting**: Redis, Upstash
- **Search**: Elasticsearch (future)
- **Vector DB**: Pinecone (for AI features)

## Data Model

### Collections Overview

```
┌─────────────────────────────────────────────┐
│            9 Appwrite Collections           │
├─────────────────────────────────────────────┤
│  1. Users                                   │
│     ├─ User profiles & settings             │
│     └─ Authentication metadata              │
│                                             │
│  2. Files                                   │
│     ├─ File metadata                        │
│     ├─ Encryption metadata                  │
│     └─ Permissions                          │
│                                             │
│  3. Folders                                 │
│     ├─ Folder hierarchy                     │
│     ├─ Materialized paths                   │
│     └─ Permissions                          │
│                                             │
│  4. Shares                                  │
│     ├─ Public/private links                 │
│     ├─ Access controls                      │
│     └─ Download tracking                    │
│                                             │
│  5. Versions                                │
│     ├─ File version history                 │
│     └─ Restore capability                   │
│                                             │
│  6. Activities                              │
│     ├─ Audit logs                           │
│     └─ User analytics                       │
│                                             │
│  7. Notifications                           │
│     ├─ User alerts                          │
│     └─ Real-time updates                    │
│                                             │
│  8. Comments                                │
│     ├─ File discussions                     │
│     └─ Collaboration                        │
│                                             │
│  9. Devices                                 │
│     ├─ Session tracking                     │
│     └─ Security monitoring                  │
└─────────────────────────────────────────────┘
```

### Key Relationships

```
User (1) ──────> (n) Files
  │                  │
  ├─> (n) Folders    ├─> (n) Versions
  ├─> (n) Shares     ├─> (n) Comments
  ├─> (n) Activities ├─> (n) Shares
  ├─> (n) Comments   └─> (n) Activities
  ├─> (n) Devices
  └─> (n) Notifications
```

### Data Storage Strategy

```
┌───────────────────────────────────────┐
│      Appwrite Database (Metadata)     │
├───────────────────────────────────────┤
│ ✓ User profiles                       │
│ ✓ File metadata (name, size, MIME)    │
│ ✓ Folder hierarchy                    │
│ ✓ Share links & permissions           │
│ ✓ Activity logs                       │
│ ✓ Comments & mentions                 │
│ ✓ Notifications                       │
│ ✓ Device information                  │
└───────────────────────────────────────┘

┌───────────────────────────────────────┐
│     Appwrite Storage (File Blobs)     │
├───────────────────────────────────────┤
│ ✓ files/ - User uploaded content      │
│ ✓ thumbs/ - Generated thumbnails      │
│ ✓ encryption: server-side enabled     │
└───────────────────────────────────────┘
```

## Security Architecture

### 1. Authentication & Authorization

```
┌────────────────────────────────────────┐
│     Authentication Methods             │
├────────────────────────────────────────┤
│  • Email/Password (local)              │
│  • Google OAuth (optional)             │
│  • GitHub OAuth (optional)             │
│  • Session tokens                      │
│  • Refresh tokens                      │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│   Authorization Levels                 │
├────────────────────────────────────────┤
│  • Owner (full control)                │
│  • Edit (modify & delete)              │
│  • Comment (discuss & view)            │
│  • View (read-only)                    │
└────────────────────────────────────────┘
```

### 2. Data Encryption

**Metadata Encryption:**
- Server-side encryption for sensitive fields
- Algorithm: AES-256-GCM
- Key management via environment variables

**File Content Encryption (Optional):**
- Client-side encryption before upload
- Public/private key pairs for sharing
- Wrapped DEK (Data Encryption Key) for recipients

### 3. API Security

**Request Validation:**
- Zod schema validation on all inputs
- Type safety via TypeScript

**Response Security:**
- No sensitive data in responses
- Proper HTTP status codes
- Error messages don't leak information

**Rate Limiting:**
- Login: 5 attempts per 15 minutes
- Upload: 100 files per hour
- Download: 1000 files per hour
- Share: 50 shares per hour

**Security Headers:**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy`
- `Permissions-Policy`

### 4. Device & Session Management

```
Device Tracking Flow:
1. User logs in
2. System captures: User Agent, IP address
3. Creates Device record (trusted: false)
4. Notifies user if new device
5. User can:
   - Trust device (skip future checks)
   - Revoke device (logout)
   - View all active sessions
```

## API Design

### Server Actions Pattern

All APIs use Next.js Server Actions (located in `lib/actions/`):

```typescript
// File: lib/actions/file.actions.ts

"use server";  // Runs on server only

export const uploadFile = async (
  formData: FormData
): Promise<UploadResponse> => {
  // 1. Authenticate user
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  
  // 2. Validate input
  const validated = UploadFileSchema.parse(formData);
  
  // 3. Check permissions
  if (!hasPermission(user.id, "upload")) {
    throw new Error("Insufficient permissions");
  }
  
  // 4. Execute business logic
  const file = await databases.createDocument(...);
  
  // 5. Log activity
  await logActivity("file", file.$id, "upload", {...});
  
  // 6. Return response
  return { success: true, file };
};
```

### Error Handling

```typescript
try {
  const result = await serverAction();
  return { success: true, data: result };
} catch (error) {
  if (error instanceof ValidationError) {
    return { success: false, error: "Invalid input" };
  }
  if (error instanceof AuthenticationError) {
    return { success: false, error: "Unauthorized" };
  }
  console.error(error);
  return { success: false, error: "Internal server error" };
}
```

## Storage Strategy

### File Storage Architecture

```
┌─────────────────────────────────────────┐
│        Appwrite Storage Buckets         │
├─────────────────────────────────────────┤
│                                         │
│  Bucket: files/                         │
│  ├─ <user_id>/<file_id>                 │
│  ├─ Encryption: enabled                 │
│  ├─ Max size: 5GB per file              │
│  └─ Quota: varies by plan               │
│                                         │
│  Bucket: thumbs/                        │
│  ├─ <file_id>_200x200.jpg              │
│  ├─ <file_id>_400x400.jpg              │
│  ├─ Max size: 10MB per thumb            │
│  └─ TTL: regenerated as needed          │
│                                         │
└─────────────────────────────────────────┘
```

### Soft Delete Strategy

```
Timeline of File Deletion:
┌─────────────────────────────────────┐
│  User clicks delete                 │
├─────────────────────────────────────┤
│  ↓                                   │
│  File moved to trash                │
│  trashed: true, trashedAt: now      │
│  (File still queryable as trashed)  │
│  ↓                                   │
│  Appears in Trash folder            │
│  (30 day retention period)          │
│  ↓                                   │
│  Auto-cleanup job (or user clicks)  │
│  Permanently deleted from storage   │
│  ↓                                   │
│  File fully removed                 │
└─────────────────────────────────────┘
```

## Performance Considerations

### 1. Database Query Optimization

**Indexes Created:**
- `files.ownerId` - List user files
- `files.folderId` - List folder contents
- `files.trashed` - Filter trash
- `activities.userId` - User activity feed
- `shares.token` - Public share lookup

**Query Patterns:**
```typescript
// Good: Uses indexes
await databases.listDocuments(
  database,
  collection,
  [
    Query.equal("ownerId", [userId]),    // ✓ Indexed
    Query.equal("trashed", [false]),     // ✓ Indexed
    Query.orderDesc("createdAt"),        // ✓ Can use index
    Query.limit(50)
  ]
);

// Avoid: Full table scans
await databases.listDocuments(database, collection, [
  Query.contains("name", ["search"])     // ✗ Slow
]);
```

### 2. Caching Strategy

```
Browser Cache:
├─ Static assets (images, CSS) - 1 year
├─ API responses - 5 minutes
└─ User data - session duration

Server Cache:
├─ User object - per request
├─ File metadata - invalidate on write
└─ Sharing links - cache public data
```

### 3. Pagination

```typescript
// Always use pagination to avoid loading all data
const PAGE_SIZE = 50;
const page = 0;

const files = await getFiles(
  limit: PAGE_SIZE,
  offset: page * PAGE_SIZE
);
```

## Scalability Plan

### Phase 1: Current (Appwrite Managed)
- ✓ Auto-scaling database
- ✓ CDN for storage
- ✓ Built-in backups
- Typical capacity: 10K-100K users

### Phase 2: High Availability
- Add Redis for caching
- Implement search index (Elasticsearch)
- Enable database replication
- Setup CDN for files
- Typical capacity: 100K-1M users

### Phase 3: Enterprise Scale
- Migrate to managed Kubernetes
- Implement sharding strategy
- Add data warehousing (BigQuery, Snowflake)
- Setup global CDN (Cloudflare)
- Implement real-time sync (WebSockets)
- Typical capacity: 1M+ users

### Database Scaling

```
Current (Single Instance):
┌──────────────────────┐
│  Appwrite Database   │
│  (All collections)   │
└──────────────────────┘

Future (Sharded):
┌──────────────────────┐
│  Shard 1: A-M Users  │
├──────────────────────┤
│  Shard 2: N-Z Users  │
├──────────────────────┤
│  Shard 3: AA-AZ      │
└──────────────────────┘

With Caching:
┌──────────────────────┐
│  Redis Cache         │
│  (Hot data)          │
├──────────────────────┤
│  Database            │
│  (Source of truth)   │
├──────────────────────┤
│  Archive Storage     │
│  (Cold data)         │
└──────────────────────┘
```

## Development Workflow

### Local Development

```bash
1. npm install              # Install dependencies
2. cp .env.example .env.local
3. # Fill in .env.local with local Appwrite instance
4. npm run dev              # Start dev server
5. # App runs at localhost:3000
```

### Type Safety

```
TypeScript → Zod Schema → Runtime Validation
   ↓            ↓                 ↓
Compile      Type Guards      Input Validation
Check        (Static)         (Runtime)
```

### Testing Strategy

```
Unit Tests (jest):
- Utils and helpers
- Validation schemas
- Formatting functions

Integration Tests (Playwright):
- User flows
- API interactions
- Database operations

E2E Tests (Playwright):
- Complete workflows
- UI interactions
- Error handling
```

---

**Last Updated**: December 2024
**Version**: 1.0
**Status**: Production Ready
