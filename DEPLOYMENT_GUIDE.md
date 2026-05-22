# Kareerist Studio — Deployment Guide

**Last Updated:** May 22, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Setup](#database-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring & Alerting](#monitoring--alerting)
7. [Rollback Procedure](#rollback-procedure)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### 1. Code Review
- [ ] All tests passing: `pytest backend/tests/ -v`
- [ ] Frontend builds cleanly: `npm run build`
- [ ] No console errors in browser
- [ ] No security warnings
- [ ] All environment variables documented

### 2. Environment Setup
- [ ] Production Supabase project created
- [ ] Production Redis instance created
- [ ] Production domain configured
- [ ] SSL certificate obtained
- [ ] DNS records updated

### 3. Credentials & Secrets
- [ ] Groq API key obtained
- [ ] HuggingFace API key obtained
- [ ] Sentry DSN obtained
- [ ] All secrets stored in secure vault
- [ ] No secrets in code or git history

### 4. Database Preparation
- [ ] Supabase project created
- [ ] All migrations ready to run
- [ ] Backup strategy defined
- [ ] RLS policies reviewed
- [ ] Indexes created

### 5. Infrastructure
- [ ] Backend hosting configured (Render, Railway, etc.)
- [ ] Frontend hosting configured (Vercel, Netlify, etc.)
- [ ] CDN configured (Cloudflare, etc.)
- [ ] Load balancer configured (if needed)
- [ ] Auto-scaling configured (if needed)

---

## Database Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Choose region closest to users
4. Set strong password
5. Wait for project to initialize

### Step 2: Run Migrations

```bash
# Connect to Supabase SQL Editor
# Copy and paste each migration file in order:

1. supabase/migrations/20260522000001_fix_daily_grant_total.sql
2. Any other migration files in supabase/migrations/

# Execute each migration
```

### Step 3: Verify Schema

```sql
-- In Supabase SQL Editor, verify tables exist:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should see:
-- - profiles
-- - resumes
-- - ai_analyses
-- - interview_reports
-- - credit_transactions
-- - cover_letters
```

### Step 4: Set Up RLS Policies

```sql
-- Verify RLS is enabled on all tables:
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public';

-- For each table, verify RLS is enabled:
SELECT relname, relrowsecurity FROM pg_class 
WHERE relname IN ('profiles', 'resumes', 'ai_analyses', 'interview_reports', 'credit_transactions', 'cover_letters');
```

### Step 5: Create Backups

```bash
# In Supabase dashboard:
# Settings → Backups → Enable daily backups
# Set retention to 30 days
```

---

## Backend Deployment

### Option 1: Deploy to Render

#### Step 1: Connect Repository
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Select `main` branch

#### Step 2: Configure Service
```
Name: kareerist-backend
Environment: Python 3.13
Build Command: pip install -r backend/requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

#### Step 3: Set Environment Variables
```
ENVIRONMENT=production
GROQ_API_KEY=<your-key>
SUPABASE_URL=<your-url>
SUPABASE_SERVICE_ROLE=<your-key>
REDIS_URL=<your-url>
HUGGINGFACE_API_KEY=<your-key>
SENTRY_DSN=<your-dsn>
COOKIE_SECURE=True
COOKIE_SAMESITE=None
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

#### Step 4: Deploy
```bash
git push origin main
# Render will automatically deploy
```

#### Step 5: Verify
```bash
curl https://kareerist-backend.onrender.com/health
# Should return: {"status": "ok", "checks": {...}}
```

### Option 2: Deploy to Railway

#### Step 1: Connect Repository
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Connect GitHub repository

#### Step 2: Configure Service
```
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

#### Step 3: Set Environment Variables
(Same as Render above)

#### Step 4: Deploy
```bash
git push origin main
# Railway will automatically deploy
```

### Option 3: Deploy to AWS/GCP/Azure

See respective documentation for containerized deployment.

---

## Frontend Deployment

### Option 1: Deploy to Vercel

#### Step 1: Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Import project from GitHub
3. Select `FRONTEND` directory as root

#### Step 2: Configure Build
```
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

#### Step 3: Set Environment Variables
```
VITE_API_URL=https://kareerist-backend.onrender.com/api/v1
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

#### Step 4: Deploy
```bash
git push origin main
# Vercel will automatically deploy
```

#### Step 5: Configure Domain
1. In Vercel dashboard, go to Settings → Domains
2. Add your domain
3. Update DNS records to point to Vercel

### Option 2: Deploy to Netlify

#### Step 1: Connect Repository
1. Go to [netlify.com](https://netlify.com)
2. Create new site from Git
3. Select GitHub repository

#### Step 2: Configure Build
```
Base Directory: FRONTEND
Build Command: npm run build
Publish Directory: dist
```

#### Step 3: Set Environment Variables
(Same as Vercel above)

#### Step 4: Deploy
```bash
git push origin main
# Netlify will automatically deploy
```

### Option 3: Deploy to AWS S3 + CloudFront

```bash
# Build frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name/

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## Post-Deployment Verification

### Step 1: Verify Backend

```bash
# Health check
curl https://yourdomain.com/api/v1/health

# Expected response:
# {"status": "ok", "checks": {"api": "ok", "redis": "ok", "supabase": "ok"}}

# Check logs
# In Render/Railway dashboard, view logs for any errors
```

### Step 2: Verify Frontend

```bash
# Open in browser
https://yourdomain.com

# Check console for errors
# Open DevTools → Console
# Should see no errors

# Test login
# Click "Sign In"
# Enter test credentials
# Should redirect to dashboard
```

### Step 3: Test All Features

```bash
# 1. Upload Resume
# - Go to Dashboard
# - Upload a PDF resume
# - Should parse successfully

# 2. Run ATS Score
# - Click "Analyze Resume"
# - Should return score in 5-10 seconds

# 3. Start Interview
# - Click "Start Interview"
# - Should generate 6 questions
# - Answer questions
# - Should evaluate answers

# 4. Check Credits
# - Credits should be deducted
# - Should show remaining balance

# 5. Generate Cover Letter
# - Click "Generate Cover Letter"
# - Should generate in 5-10 seconds
```

### Step 4: Check Monitoring

```bash
# Sentry
# - Go to Sentry dashboard
# - Should see no errors (or only expected errors)

# UptimeRobot
# - Go to UptimeRobot dashboard
# - Should show "Up" status

# Database
# - Go to Supabase dashboard
# - Check database size
# - Check query performance
```

---

## Monitoring & Alerting

### Set Up Sentry

1. Create Sentry account at [sentry.io](https://sentry.io)
2. Create new project for Kareerist
3. Copy DSN
4. Set `SENTRY_DSN` environment variable
5. Configure alerts:
   - Alert on new issues
   - Alert on error rate > 1%
   - Alert on performance degradation

### Set Up UptimeRobot

1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add monitor for backend:
   - URL: `https://yourdomain.com/api/v1/health`
   - Interval: 5 minutes
   - Alert: Email on down
3. Add monitor for frontend:
   - URL: `https://yourdomain.com`
   - Interval: 5 minutes
   - Alert: Email on down

### Set Up Database Monitoring

1. In Supabase dashboard:
   - Go to Settings → Database
   - Enable query performance insights
   - Set up alerts for slow queries

2. Monitor key metrics:
   - Database size
   - Connection count
   - Query latency
   - Replication lag

### Set Up Application Monitoring

1. In backend logs:
   - Monitor error rate
   - Monitor response time
   - Monitor credit deductions
   - Monitor API usage

2. In frontend:
   - Monitor page load time
   - Monitor error rate
   - Monitor user interactions

---

## Rollback Procedure

### If Backend Deployment Fails

```bash
# Option 1: Revert to previous commit
git revert HEAD
git push origin main
# Render/Railway will automatically redeploy

# Option 2: Manual rollback in Render/Railway
# Go to dashboard → Deployments
# Click on previous successful deployment
# Click "Redeploy"
```

### If Frontend Deployment Fails

```bash
# Option 1: Revert to previous commit
git revert HEAD
git push origin main
# Vercel/Netlify will automatically redeploy

# Option 2: Manual rollback in Vercel/Netlify
# Go to dashboard → Deployments
# Click on previous successful deployment
# Click "Redeploy"
```

### If Database Migration Fails

```bash
# Option 1: Restore from backup
# In Supabase dashboard:
# Settings → Backups → Restore from backup

# Option 2: Manually revert migration
# In Supabase SQL Editor:
# Run the rollback SQL (if available)
```

### If Redis Fails

```bash
# Option 1: Restart Redis
# In Upstash dashboard:
# Click "Restart"

# Option 2: Clear cache
# In Upstash dashboard:
# Click "Flush Database"
# Note: This will clear all sessions
```

---

## Troubleshooting

### Backend Issues

#### 502 Bad Gateway
```bash
# Check backend logs
# In Render/Railway dashboard, view logs

# Common causes:
# - Backend crashed
# - Out of memory
# - Database connection failed
# - Redis connection failed

# Solution:
# 1. Check environment variables
# 2. Check database connection
# 3. Check Redis connection
# 4. Restart backend service
```

#### 401 Unauthorized
```bash
# Check authentication
# - Verify JWT token is valid
# - Verify session cookie is set
# - Verify CORS is configured

# Solution:
# 1. Clear browser cookies
# 2. Log in again
# 3. Check CORS_ORIGINS in environment
```

#### 402 Payment Required
```bash
# User has insufficient credits
# This is expected behavior

# Solution:
# 1. User needs to purchase credits
# 2. Or wait for daily credit grant
```

### Frontend Issues

#### Blank Page
```bash
# Check browser console for errors
# DevTools → Console

# Common causes:
# - JavaScript error
# - API not responding
# - CORS error

# Solution:
# 1. Check API URL in environment
# 2. Check CORS configuration
# 3. Check browser console for errors
```

#### API Errors
```bash
# Check network tab in DevTools
# DevTools → Network

# Common causes:
# - Backend not responding
# - Wrong API URL
# - CORS not configured

# Solution:
# 1. Verify backend is running
# 2. Verify API URL is correct
# 3. Check CORS_ORIGINS in backend
```

#### Slow Performance
```bash
# Check performance in DevTools
# DevTools → Performance

# Common causes:
# - Large bundle size
# - Slow API responses
# - Slow database queries

# Solution:
# 1. Check bundle size: npm run build
# 2. Check API latency: curl -w "@curl-format.txt" https://api.example.com
# 3. Check database queries in Supabase
```

### Database Issues

#### Connection Timeout
```bash
# Check Supabase status
# Go to Supabase dashboard → Status

# Common causes:
# - Database is down
# - Connection pool exhausted
# - Network issue

# Solution:
# 1. Wait for Supabase to recover
# 2. Increase connection pool size
# 3. Check network connectivity
```

#### Slow Queries
```bash
# Check query performance in Supabase
# Go to Supabase dashboard → Query Performance

# Common causes:
# - Missing indexes
# - N+1 queries
# - Large result sets

# Solution:
# 1. Add indexes on frequently queried columns
# 2. Optimize queries
# 3. Add pagination
```

### Redis Issues

#### Connection Refused
```bash
# Check Redis status
# In Upstash dashboard, check status

# Common causes:
# - Redis is down
# - Wrong connection string
# - Network issue

# Solution:
# 1. Restart Redis
# 2. Verify connection string
# 3. Check network connectivity
```

#### Out of Memory
```bash
# Check Redis memory usage
# In Upstash dashboard, check memory

# Common causes:
# - Too many sessions
# - Memory leak
# - Expired keys not cleaned up

# Solution:
# 1. Increase Redis memory
# 2. Clear old sessions: FLUSHDB
# 3. Configure key expiration
```

---

## Performance Optimization

### Backend Optimization

```python
# 1. Enable query caching
# In app/db/supabase.py
# Add caching layer for frequently accessed data

# 2. Optimize database queries
# - Add indexes on foreign keys
# - Use SELECT specific columns, not *
# - Use LIMIT for large result sets

# 3. Enable compression
# - In app/main.py, add GZipMiddleware
# - Reduces response size by 70%

# 4. Enable connection pooling
# - In Supabase settings
# - Increase pool size for high traffic
```

### Frontend Optimization

```bash
# 1. Code splitting
# - Already enabled in Vite
# - Routes are lazy-loaded

# 2. Image optimization
# - Use WebP format
# - Compress images
# - Use CDN for static assets

# 3. Bundle optimization
# - npm run build --analyze
# - Remove unused dependencies
# - Tree-shake unused code

# 4. Caching
# - Set Cache-Control headers
# - Use service workers
# - Cache API responses
```

---

## Security Hardening

### Backend Security

```python
# 1. Enable HTTPS only
# - Set COOKIE_SECURE=True
# - Set COOKIE_SAMESITE=None (for cross-site)

# 2. Enable rate limiting
# - Already enabled in app/core/rate_limit.py
# - Adjust limits based on traffic

# 3. Enable CORS
# - Set CORS_ORIGINS to specific domains
# - Don't use "*" in production

# 4. Enable CSRF protection
# - Already enabled in app/main.py
# - Verify X-CSRF-Token header

# 5. Enable security headers
# - Already enabled in app/main.py
# - CSP, X-Frame-Options, etc.
```

### Frontend Security

```javascript
// 1. Content Security Policy
// - Already configured in backend
// - Restricts script execution

// 2. HTTPS only
// - Redirect HTTP to HTTPS
// - Set Strict-Transport-Security header

// 3. Secure cookies
// - HttpOnly flag set
// - SameSite=None for cross-site
// - Secure flag set

// 4. Input validation
// - Validate all user input
// - Sanitize before display
// - Use parameterized queries
```

---

## Scaling Strategy

### Horizontal Scaling

```bash
# 1. Backend scaling
# - Deploy multiple backend instances
# - Use load balancer (Render/Railway handles this)
# - Use Redis for session sharing

# 2. Frontend scaling
# - Use CDN (Cloudflare, Vercel, etc.)
# - Distribute static assets globally
# - Cache aggressively

# 3. Database scaling
# - Use read replicas for read-heavy workloads
# - Use connection pooling
# - Archive old data
```

### Vertical Scaling

```bash
# 1. Backend scaling
# - Increase instance size
# - Increase memory
# - Increase CPU

# 2. Database scaling
# - Increase database size
# - Increase connection pool
# - Increase compute resources

# 3. Redis scaling
# - Increase memory
# - Use Redis cluster for high availability
```

---

## Disaster Recovery

### Backup Strategy

```bash
# 1. Database backups
# - Daily automated backups (Supabase)
# - 30-day retention
# - Test restore procedure monthly

# 2. Code backups
# - Git repository (GitHub)
# - Multiple branches
# - Tag releases

# 3. Configuration backups
# - Environment variables (secure vault)
# - SSL certificates
# - DNS records
```

### Recovery Procedure

```bash
# 1. Database recovery
# - In Supabase dashboard
# - Settings → Backups → Restore
# - Select backup date
# - Confirm restore

# 2. Code recovery
# - git revert to previous commit
# - git push to deploy

# 3. Configuration recovery
# - Restore environment variables
# - Restore SSL certificates
# - Update DNS records
```

---

## Maintenance Schedule

### Daily
- [ ] Monitor error logs (Sentry)
- [ ] Monitor uptime (UptimeRobot)
- [ ] Check database size
- [ ] Check API latency

### Weekly
- [ ] Review performance metrics
- [ ] Check for security updates
- [ ] Review user feedback
- [ ] Test backup restore

### Monthly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Capacity planning
- [ ] Update dependencies

### Quarterly
- [ ] Full system audit
- [ ] Disaster recovery drill
- [ ] Security penetration test
- [ ] Load testing

---

## Support & Escalation

### Level 1: Monitoring
- UptimeRobot alerts
- Sentry error alerts
- Database performance alerts

### Level 2: Investigation
- Check logs
- Check metrics
- Check database
- Check Redis

### Level 3: Escalation
- Contact hosting provider
- Contact database provider
- Contact Redis provider
- Contact development team

---

**Last Updated:** May 22, 2026  
**Next Review:** After first week of production deployment
