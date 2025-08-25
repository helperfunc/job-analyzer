# Database-Driven Testing Setup

## Overview
The tests now use real database data instead of mocks, providing more realistic and reliable testing.

## Setup Steps

### 1. Configure Test Environment

Update your `.env.test` file with your database credentials:

```env
# Test Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=test-jwt-secret-key
NODE_ENV=test
```

### 2. Database Setup Options

**Option A: Use existing database**
- Tests will create test data with `test-` prefixes
- Data is automatically cleaned up after tests

**Option B: Create separate test database**
- Create a separate Supabase project for testing
- Use different credentials in `.env.test`

### 3. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 4. Database Schema

Ensure your database has these tables:
- `users` (id, username, email, display_name, created_at, is_verified)
- `jobs` (id, title, company, location, salary_min, salary_max, skills, created_at)
- `research_papers` (id, title, authors, abstract, company, publication_date, url, created_at)
- `bookmarks` (id, user_id, bookmark_type, paper_id, resource_id, created_at)
- `job_thoughts` (id, job_id, user_id, content, created_at)
- `paper_insights` (id, paper_id, user_id, content, upvotes, downvotes, created_at)

## Running Database Tests

```bash
# Run all tests with database
npm test

# Run specific database-driven tests
npx jest __tests__/api/get-summary.test.ts

# Run with verbose output to see database operations
npx jest __tests__/api/get-summary.test.ts --verbose
```

## Test Data Management

### Automatic Seeding
- Test data is seeded before all tests run
- Includes sample users, jobs, and papers
- Uses `test-` prefixes for easy identification

### Automatic Cleanup
- All test data is cleaned up after tests complete
- No impact on your production data
- Fails gracefully if cleanup has issues

### Manual Data Management
```javascript
import { createTestUser, createTestJob, cleanupTestRecord } from '../helpers/database'

// In your tests
beforeEach(async () => {
  const user = await createTestUser({
    username: 'testuser',
    email: 'test@example.com'
  })
  
  const job = await createTestJob({
    title: 'Test Engineer',
    company: 'TestCorp'
  })
})
```

## Advantages of Database Testing

### ✅ Benefits
- **Real data structures** - Tests match production exactly
- **Actual API responses** - No mock mismatches
- **Database constraints** - Tests real validation rules
- **Integration testing** - Full stack testing
- **Confidence** - Tests prove the entire system works

### ⚠️ Considerations
- **Slower tests** - Database calls take longer than mocks
- **Setup required** - Need database credentials
- **Network dependency** - Tests require database connection
- **Parallel issues** - Multiple tests might conflict

## Best Practices

1. **Use transactions** for test isolation when possible
2. **Clean up data** after each test
3. **Use unique identifiers** (timestamps, UUIDs)
4. **Test with realistic data** that matches production
5. **Handle async operations** properly with await
6. **Mock external services** (email, payment) but not your database

## Troubleshooting

### Common Issues

**Database Connection Failed**
```
Error: Missing Supabase environment variables
```
- Check `.env.test` file exists
- Verify credentials are correct
- Ensure database is accessible

**Permission Errors**
```
Error: Row level security policy violated
```
- Check RLS policies on tables
- Verify test user has proper permissions
- Use service role key if needed

**Test Data Conflicts**
```
Error: duplicate key value violates unique constraint
```
- Use unique identifiers in test data
- Clean up data between tests
- Check for existing test data

### Debug Commands
```bash
# Check environment variables
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"

# Test database connection
node -e "const { testSupabase } = require('./lib/test-db'); testSupabase.from('users').select('count').then(console.log)"
```