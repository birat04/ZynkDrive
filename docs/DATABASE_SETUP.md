# ZynkDrive Database Setup Guide

This guide walks you through setting up all required collections in Appwrite for ZynkDrive.

## Prerequisites

- Appwrite instance running (local or cloud)
- Appwrite CLI or console access
- Appwrite project created

## Collections to Create

### 1. Users Collection

Stores user account information.

**Collection ID:** `users`

| Attribute | Type | Required | Additional Settings |
|-----------|------|----------|---------------------|
| email | email | Yes | Unique |
| displayName | string | Yes | Max length: 100 |
| avatarUrl | url | No | |
| publicKey | string | No | Encrypted: true |
| encryptedPrivateKey | string | No | Encrypted: true |
| plan | enum | Yes | Options: free, pro, team; Default: free |
| storageUsed | integer | Yes | Default: 0 |
| storageLimit | integer | Yes | Default: 5368709120 |
| mfaEnabled | boolean | Yes | Default: false |
| twoFactorSecret | string | No | Encrypted: true |
| emailVerified | boolean | Yes | Default: false |
| createdAt | datetime | Yes | |
| updatedAt | datetime | Yes | |

**Indexes:**
- email (unique)
- plan

---

### 2. Files Collection

Stores file metadata.

**Collection ID:** `files`

| Attribute | Type | Required | Additional Settings |
|-----------|------|----------|---------------------|
| ownerId | string | Yes | Indexed |
| name | string | Yes | Max length: 255; Fulltext indexed |
| folderId | string | No | Indexed |
| encryptedName | string | No | |
| mimeType | string | Yes | Indexed |
| size | integer | Yes | |
| encryptionMeta | object | No | |
| currentVersion | integer | Yes | Default: 1 |
| trashed | boolean | Yes | Indexed; Default: false |
| trashedAt | datetime | No | Indexed |
| starred | boolean | Yes | Default: false |
| tags | array(string) | No | |
| downloadCount | integer | Yes | Default: 0 |
| createdAt | datetime | Yes | |
| updatedAt | datetime | Yes | |

**Indexes:**
- ownerId
- folderId
- trashed
- trashedAt
- name (fulltext)
- mimeType

---

### 3. Folders Collection

Stores folder information and hierarchy.

**Collection ID:** `folders`

| Attribute | Type | Required | Additional Settings |
|-----------|------|----------|---------------------|
| ownerId | string | Yes | Indexed |
| parentId | string | No | Indexed |
| name | string | Yes | Max length: 255 |
| path | string | No | Materialized path for breadcrumbs |
| trashed | boolean | Yes | Default: false |
| createdAt | datetime | Yes | |
| updatedAt | datetime | Yes | |

**Indexes:**
- ownerId
- parentId
- trashed

---

### 4. Shares Collection

Stores share link information.

**Collection ID:** `shares`

| Attribute | Type | Required | Additional Settings |
|-----------|------|----------|---------------------|
| token | string | Yes | Unique; Indexed |
| fileId | string | No | Indexed |
| folderId | string | No | Indexed |
| type | enum | Yes | Options: public, private, password |
| permission | enum | Yes | Options: view, comment, edit |
| passwordHash | string | No | Encrypted: true |
| expiresAt | datetime | No | Indexed |
| downloadLimit | integer | No | |
| downloadCount | integer | Yes | Default: 0 |
| wrappedKey | string | No | For E2EE |
| createdBy | string | Yes | Indexed |
| createdAt | datetime | Yes | |

**Indexes:**
- token (unique)
- fileId
- folderId
- createdBy
- expiresAt

---

### 5. Versions Collection

Stores file version history.

**Collection ID:** `versions`

| Attribute | Type | Required | Additional Settings |
|-----------|------|----------|---------------------|
| fileId | string | Yes | Indexed |
| storageObjectId | string | Yes | |
| versionNumber | integer | Yes | |
| size | integer | Yes | |
| createdAt | datetime | Yes | |
| createdBy | string | Yes | Indexed |

**Indexes:**
- fileId
- createdBy

---

### 6. Activities Collection

Stores activity logs for user actions.

**Collection ID:** `activities`

| Attribute | Type | Required | Additional Settings |
|-----------|------|----------|---------------------|
| userId | string | Yes | Indexed |
| resourceType | enum | Yes | Options: file, folder, share, comment; Indexed |
| resourceId | string | Yes | Indexed |
| action | enum | Yes | Options: upload, download, rename, delete, restore, share, comment, view, copy, move |
| metadata | object | No | |
| createdAt | datetime | Yes | Indexed |

**Indexes:**
- userId
- resourceType
- resourceId
- createdAt

---

### 7. Notifications Collection

Stores user notifications.

**Collection ID:** `notifications`

| Attribute | Type | Required | Additional Settings |
|-----------|------|----------|---------------------|
| userId | string | Yes | Indexed |
| type | enum | Yes | Options: share, comment, mention, quota, security |
| read | boolean | Yes | Indexed; Default: false |
| payload | object | Yes | |
| createdAt | datetime | Yes | |

**Indexes:**
- userId
- read
- createdAt

---

### 8. Comments Collection

Stores file comments.

**Collection ID:** `comments`

| Attribute | Type | Required | Additional Settings |
|-----------|------|----------|---------------------|
| fileId | string | Yes | Indexed |
| authorId | string | Yes | Indexed |
| body | string | Yes | Max length: 5000 |
| mentions | array(string) | No | |
| createdAt | datetime | Yes | |

**Indexes:**
- fileId
- authorId

---

### 9. Devices Collection

Stores user device information.

**Collection ID:** `devices`

| Attribute | Type | Required | Additional Settings |
|-----------|------|----------|---------------------|
| userId | string | Yes | Indexed |
| userAgent | string | Yes | |
| lastIp | string | No | |
| lastActiveAt | datetime | Yes | |
| trusted | boolean | Yes | Default: false |

**Indexes:**
- userId

---

## Permissions

### For User Collections (Files, Folders, Shares, Activities, Notifications)
Each document should have permissions set based on ownership:

**Users Collection:**
- Users can read/update their own document: `role:any` can read/write their own

**Files/Folders:**
- Owner has full permissions
- Shared users have read/write based on permission level

**Implementation Note:**
Appwrite document-level permissions can handle these, but due to complexity, use application-level permission checks in server actions.

## Storage Buckets

### 1. Files Bucket
Stores actual file blobs.

**Bucket ID:** `files`
**Encryption:** Enabled (server-side)
**Settings:**
- Allow file size up to 5GB
- No file type restrictions

### 2. Thumbnails Bucket
Stores generated thumbnails.

**Bucket ID:** `thumbs`
**Encryption:** Enabled (server-side)
**Settings:**
- Max file size: 10MB
- File types: images only

## Environment Variables

After setting up collections and buckets, update your `.env.local`:

```bash
NEXT_PUBLIC_APPWRITE_DATABASE=your_database_id
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION=users
NEXT_PUBLIC_APPWRITE_FILES_COLLECTION=files
NEXT_PUBLIC_APPWRITE_FOLDERS_COLLECTION=folders
NEXT_PUBLIC_APPWRITE_SHARES_COLLECTION=shares
NEXT_PUBLIC_APPWRITE_VERSIONS_COLLECTION=versions
NEXT_PUBLIC_APPWRITE_ACTIVITIES_COLLECTION=activities
NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION=notifications
NEXT_PUBLIC_APPWRITE_COMMENTS_COLLECTION=comments
NEXT_PUBLIC_APPWRITE_DEVICES_COLLECTION=devices
NEXT_PUBLIC_APPWRITE_BUCKET=files
NEXT_PUBLIC_APPWRITE_THUMBS_BUCKET=thumbs
```

## Automated Setup

### Using Appwrite CLI

```bash
# Initialize Appwrite project
appwrite init

# Create database
appwrite databases create \
  --databaseId your_database_id

# Create collections (run the script below for each)
# See script: scripts/setup-appwrite.ts
```

### Using Node.js Script

See `scripts/setup-appwrite.ts` for an automated setup script.

## Indexes and Performance

### Critical Indexes
These indexes are essential for query performance:

1. `files.ownerId` - listing user files
2. `files.folderId` - listing folder contents
3. `files.trashed` - filtering trash
4. `activities.userId` - user activity feed
5. `shares.token` - public share lookup

### Full-Text Indexes
For search functionality:

1. `files.name` - file name search
2. `folders.name` - folder name search

## Data Retention Policies

### Trash Cleanup
Files in trash are automatically deleted after 30 days via a Cloud Function.

### Activity Logs
- Activity logs retained for 1 year
- Audit logs retained for 7 years
- Implement via a scheduled Cloud Function

## Backup Considerations

### What to Backup
1. All collection data (metadata)
2. Appwrite Storage buckets
3. User encryption keys (encrypted)

### Backup Frequency
- Daily incremental backups
- Weekly full backups
- Monthly archival

### Important Notes
- **Do NOT backup unencrypted user passwords** - they're hashed with Argon2
- **Preserve encryption keys** - data recovery depends on them

## Migration from Other Providers

If migrating from another cloud storage:

1. Create a migration script that:
   - Maps users to Users collection
   - Maps files to Files collection with proper encryption metadata
   - Maps shares to Shares collection
   - Cleans up old storage

2. Test migration in staging environment first

## Troubleshooting

### Query Timeout
- Add indexes to frequently queried fields
- Reduce query results with pagination
- Check Appwrite logs for slow queries

### Permission Denied Errors
- Verify collection-level permissions
- Check document-level permissions
- Confirm session authentication

### Storage Quota Issues
- Monitor storage bucket usage
- Implement storage quota per user
- Set up cleanup jobs for old versions

## Next Steps

1. Create all collections in order
2. Set up storage buckets
3. Configure environment variables
4. Run migration script if needed
5. Test queries with sample data
6. Deploy Cloud Functions for maintenance tasks

## Support

For issues with Appwrite setup:
- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Community Discord](https://appwrite.io/discord)
