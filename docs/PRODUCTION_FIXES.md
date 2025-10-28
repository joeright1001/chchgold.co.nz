# Production Fixes Documentation

## Overview
This document describes the critical production issues that were fixed to make the application production-ready.

## 1. PostgreSQL Session Store Implementation

### Problem Solved
**Previous Issue:** The application was using express-session's default MemoryStore, which caused:
- Memory leaks as sessions accumulated in RAM without proper cleanup
- Inability to scale horizontally (each server instance had separate memory)
- Session data loss on server restart/deployment
- Server crashes when memory was exhausted

### Solution Implemented
Switched to `connect-pg-simple` - a PostgreSQL-backed session store that:
- Persists sessions to the database (survives server restarts)
- Enables horizontal scaling (all instances share the same session data)
- Automatically cleans up expired sessions
- Eliminates memory leak issues

### Changes Made

#### 1. Dependencies Added
```json
"connect-pg-simple": "^10.0.0"
```

#### 2. Database Schema Updated
Created a `session` table in `schema.sql`:
```sql
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "session" ("expire");
```

#### 3. Server Configuration Updated (`server.js`)
Before:
```javascript
const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET || 'a_default_secret_for_development',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
```

After:
```javascript
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./src/config/database');

app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: false
  }),
  secret: process.env.SESSION_SECRET || 'a_default_secret_for_development',
  resave: false,
  saveUninitialized: false,  // Changed to prevent storing empty sessions
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days
  }
}));
```

### Benefits
- ✅ Sessions persist across server restarts
- ✅ No memory leaks
- ✅ Horizontal scaling support
- ✅ Automatic cleanup of expired sessions
- ✅ Production-safe architecture

## 2. Production Dependencies Audit

### Assessment
Reviewed all dependencies in `package.json` and confirmed:
- All current dependencies are production dependencies
- No development-only packages are present
- No action needed for dependency separation

### Current Dependencies (All Production)
```json
{
  "axios": "^1.13.0",           // HTTP client for API calls
  "connect-pg-simple": "^10.0.0", // Session store
  "dotenv": "^17.2.3",          // Environment configuration
  "ejs": "^3.1.10",             // Template engine
  "express": "^5.1.0",          // Web framework
  "express-basic-auth": "^1.2.1", // Admin authentication
  "express-session": "^1.18.2",   // Session management
  "pg": "^8.16.3",              // PostgreSQL client
  "winston": "^3.18.3"          // Logging
}
```

## Deployment Instructions

### For New Deployments
1. Ensure the `session` table is created in your database:
   ```bash
   psql <your-database-url> -f create_session_table.sql
   ```

2. Install dependencies:
   ```bash
   npm ci --production
   ```

3. Start the server:
   ```bash
   npm start
   ```

### For Existing Deployments (Railway)
The changes have already been applied to the production database and code. No additional steps needed - the next deployment will automatically use the PostgreSQL session store.

### Verification
After deployment, verify sessions are being stored in the database:
```sql
SELECT COUNT(*) FROM session;
```

You should see session records appear as users interact with the application.

## Monitoring

### Check Session Count
```sql
SELECT COUNT(*) FROM session;
```

### View Active Sessions
```sql
SELECT sid, expire FROM session WHERE expire > NOW();
```

### Check for Expired Sessions
```sql
SELECT COUNT(*) FROM session WHERE expire < NOW();
```

Note: Expired sessions are automatically cleaned up by connect-pg-simple.

## Rollback Plan (if needed)

If issues arise, you can temporarily revert to MemoryStore:

1. Comment out the pgSession configuration in `server.js`
2. Restore the original session configuration:
```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
```

3. Redeploy

**Note:** This should only be a temporary measure while investigating issues. The MemoryStore is not suitable for production use.

## Performance Impact

### Before (MemoryStore)
- Session data stored in server RAM
- No persistence across restarts
- Memory grows indefinitely
- Cannot scale horizontally

### After (PostgreSQL Store)
- Minimal performance impact (sessions are small JSON objects)
- Database queries are fast (primary key lookups with index)
- Sessions persist across restarts
- Full horizontal scaling support

### Expected Performance
- Session read: ~1-2ms
- Session write: ~2-5ms
- Automatic cleanup: Runs periodically in background

## Troubleshooting

### Issue: "relation 'session' does not exist"
**Solution:** Run `create_session_table.sql` against your database

### Issue: Sessions not persisting
**Solution:** Check database connection in logs, verify `session` table exists

### Issue: High database load
**Solution:** Check session count, may need to adjust `maxAge` cookie setting

## Testing Checklist

- [x] Server starts without errors
- [x] Session table created in database
- [x] Users can log in as customers
- [x] Staff can access admin pages
- [x] Sessions persist after server restart
- [ ] Load testing shows no memory leaks
- [ ] Session cleanup working properly

## Next Steps

1. **Monitor Production:** Watch for any session-related issues in the first 24-48 hours
2. **Load Testing:** Consider load testing to verify no memory leaks
3. **Session Analytics:** Track session counts and durations over time

## Additional Resources

- [connect-pg-simple Documentation](https://github.com/voxpelli/node-connect-pg-simple)
- [Express Session Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL Session Management](https://www.postgresql.org/docs/current/sql-createtable.html)

## Maintenance

### Regular Tasks
1. Monitor session table size
2. Review session cleanup logs
3. Check for orphaned sessions (should be rare with automatic cleanup)

### Periodic Cleanup (Optional)
While connect-pg-simple handles cleanup automatically, you can manually clean expired sessions:
```sql
DELETE FROM session WHERE expire < NOW();
```

## Summary

The switch from MemoryStore to PostgreSQL session storage addresses critical production readiness issues:
- ✅ Eliminates memory leaks
- ✅ Enables horizontal scaling
- ✅ Provides session persistence
- ✅ Production-safe architecture

The application is now ready for production deployment with proper session management.
