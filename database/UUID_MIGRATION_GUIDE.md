# UUID Migration Guide

This guide explains the UUID-based user authentication system implemented in this project.

## Overview

The system uses industry-standard UUIDs for internal user identification while maintaining compatibility with external authentication providers (Google, GitHub, etc.) through a mapping table.

## Architecture

### 1. Users Table
- Primary key: `id` (UUID)
- All internal references use this UUID

### 2. User Auth Providers Table
- Maps external provider IDs to internal UUIDs
- Columns:
  - `user_id` (UUID) - References users.id
  - `provider` (VARCHAR) - 'google', 'github', 'demo', etc.
  - `provider_user_id` (TEXT) - The ID from the auth provider

### 3. All User-Related Tables
These tables now use UUID for user_id with proper foreign keys:
- `user_resources`
- `job_thoughts`
- `paper_insights`
- `interview_resources`
- `job_resources`
- `skill_gaps`
- `user_insights`
- `user_saved_papers`
- `projects`
- `resource_thoughts`

## Migration Steps

### For New Installations
1. Run `complete-schema.sql` - This creates all tables with proper UUID types

### For Existing Installations
1. Run `smart-auth-provider-migration.sql` - This:
   - Creates the auth provider mapping table
   - Converts existing TEXT user_ids to UUIDs
   - Creates mappings for existing users
   - Sets up proper foreign keys

## API Integration

### Authentication Flow
1. User logs in with external provider (e.g., Google)
2. API receives provider user ID (e.g., "google-aHVpeHVjb21AZ21haWwuY29t")
3. `getUserUUID()` function converts this to internal UUID
4. All database operations use the UUID

### Helper Functions

```typescript
// Get or create UUID for a provider user ID
await getOrCreateUserUUID(providerUserId, provider, userInfo)

// Get UUID from any text user ID
await getUserUUID(textUserId)
```

## Benefits

1. **Security**: UUIDs are harder to guess/enumerate than sequential IDs
2. **Scalability**: UUIDs can be generated without database coordination
3. **Standards**: Follows industry best practices
4. **Flexibility**: Supports multiple auth providers per user
5. **Performance**: Fixed-size UUIDs with efficient indexing

## Demo User

A demo user is pre-configured:
- UUID: `00000000-0000-0000-0000-000000000001`
- Provider mappings: 'demo-user' and 'default'

## Troubleshooting

### Error: "invalid input syntax for type uuid"
- Run the migration: `smart-auth-provider-migration.sql`
- This converts TEXT columns to UUID

### Error: "function get_user_uuid does not exist"
- You're trying to run the old migration on tables that already have UUID
- Use `smart-auth-provider-migration.sql` instead

## Files Modified

1. **Database**:
   - `complete-schema.sql` - All tables use UUID for user_id
   - `smart-auth-provider-migration.sql` - Handles migration
   - `add-auth-provider-mapping.sql` - Original migration (for TEXT->UUID)

2. **API**:
   - `lib/auth-helpers.ts` - UUID conversion functions
   - `pages/api/user/user-resources.ts` - Uses UUID for queries
   - `pages/api/auth/me-simple.ts` - Uses UUID for stats

3. **Frontend**:
   - No changes needed - frontend continues using text IDs
   - API layer handles the conversion transparently