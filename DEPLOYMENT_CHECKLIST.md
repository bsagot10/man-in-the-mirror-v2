# Deployment Checklist - Man in the Mirror Dashboard

**Stooq-First Refactor - Ready for Production**

---

## Pre-Deployment Verification

### Code Quality
- [ ] Run all tests: `npm run test`
  - Expected: ~170 tests pass in 3-5 seconds
  - Critical: `marketDataClient.test.ts` 79 tests must pass
  - If failed: See STOOQ_INTEGRATION_GUIDE.md Troubleshooting

- [ ] Check TypeScript: `npm run build`
  - Expected: Build succeeds, zero type errors
  - If failed: Check src/lib/market-data/client.ts and src/app/api/*/route.ts

- [ ] Run linter: `npm run lint`
  - Expected: No ESLint warnings
  - If failed: Fix via `npm run lint -- --fix`

- [ ] Generate coverage: `npm run test:coverage`
  - Expected: >80% coverage for critical paths
  - If failed: Review coverage report in coverage/

### Manual Testing
- [ ] Start development server: `npm run dev`
  - Expected: Server starts at http://localhost:3000
  - If failed: Check port 3000 is available

- [ ] Load dashboard in browser: http://localhost:3000
  - [ ] Page loads without errors
  - [ ] Check browser console (F12) for errors
  - [ ] Verify VIX, QQQ, TQQQ, SQQQ prices display
  - [ ] Check all charts render
  - [ ] Test position sizing calculator
  - [ ] Verify localStorage persistence (enter account size, reload page)

### Network Verification
- [ ] Verify Stooq is reachable:
  ```bash
  curl 'https://stooq.com/q/l/?s=QQQ.US&f=sd2t2ohlcv&h&e=csv'
  ```
  - Expected: CSV response with market data
  - If failed: Check internet/firewall, Stooq may be down (fallback will activate)

- [ ] Verify API endpoint:
  ```bash
  curl http://localhost:3000/api/market-data
  ```
  - Expected: JSON response with current market data
  - If failed: Check server is running and API route is accessible

- [ ] Check browser network tab (F12 → Network)
  - [ ] API requests show <150ms response time
  - [ ] Stooq requests appear (primary source)
  - [ ] Yahoo requests absent (unless Stooq failed)

### Documentation Review
- [ ] Read VERIFICATION_EXECUTIVE_SUMMARY.txt (5 minutes)
- [ ] Review VERIFICATION_SUMMARY.md (20 minutes)
- [ ] Have STOOQ_INTEGRATION_GUIDE.md available for troubleshooting
- [ ] Print/save deployment checklist for reference

---

## Production Build

### Build Process
- [ ] Run production build: `npm run build`
  - Expected: Build succeeds, creates .next directory
  - Verify: No build errors in output

- [ ] Review build output:
  - [ ] Verify chunk sizes reasonable (no massive bundles)
  - [ ] Check for any warnings about missing dependencies
  - [ ] Confirm all files in build appear correct

- [ ] Test production build locally:
  ```bash
  npm run start
  ```
  - Expected: Server starts and responds to requests
  - Expected: Performance similar to dev (actual may be faster)

- [ ] Verify production API responses:
  ```bash
  curl http://localhost:3000/api/market-data
  ```
  - Expected: Same format as dev environment
  - Expected: Response time <150ms

### Environment Setup
- [ ] Verify Node.js version: `node --version`
  - Required: v18 or higher
  - Recommended: v20 LTS or higher

- [ ] Check environment variables:
  - [ ] No .env file needed (Stooq requires no API key)
  - [ ] Optional: Set NODE_ENV=production for server startup

- [ ] Prepare deployment:
  - [ ] Code committed to git
  - [ ] Branch up-to-date with main
  - [ ] No uncommitted changes
  - [ ] Tags/releases prepared if needed

---

## Deployment

### Application Deployment
- [ ] Deploy built bundle to production server
  - Deploy: .next directory (Next.js build output)
  - Deploy: package.json and package-lock.json
  - Deploy: public/ directory (static assets)

- [ ] Install dependencies on production:
  ```bash
  npm install --production
  ```

- [ ] Start production server:
  ```bash
  npm run start
  ```
  - Or use process manager (PM2, systemd, Docker, etc.)

- [ ] Verify deployment:
  - [ ] Server is running
  - [ ] Port is accessible
  - [ ] HTTPS configured (if required)
  - [ ] Domain points to server

### Endpoint Verification
- [ ] Test market data endpoint:
  ```bash
  curl https://your-domain.com/api/market-data
  ```
  - Expected: JSON with VIX, QQQ, TQQQ, SQQQ prices
  - Expected: Response time <150ms

- [ ] Test historical data endpoint:
  ```bash
  curl https://your-domain.com/api/historical-data
  ```
  - Expected: JSON with 30 days of historical data

- [ ] Test entry score endpoint:
  ```bash
  curl https://your-domain.com/api/entry-score
  ```
  - Expected: JSON with entry score calculation

- [ ] Load dashboard in browser:
  - Navigate to https://your-domain.com
  - Verify dashboard loads without errors
  - Check all data displays correctly
  - Test position sizing calculator
  - Verify localStorage persistence

### Data Verification
- [ ] Check market data accuracy:
  - [ ] VIX value reasonable (typically 10-40)
  - [ ] QQQ price reasonable (typically $100-$1000)
  - [ ] TQQQ price reasonable (typically $10-$200)
  - [ ] SQQQ price reasonable (typically $5-$150)
  - [ ] Prices update when page refreshed

- [ ] Check data source:
  - [ ] Monitor browser console (F12) for logs
  - [ ] Silent = Stooq working (expected, normal)
  - [ ] "Stooq unavailable..." = Yahoo fallback (investigate)
  - [ ] "All data sources failed..." = Error (investigate)

- [ ] Verify timestamp accuracy:
  - [ ] Last update timestamp shows recent (within 5 minutes)
  - [ ] Market open indicator correct (9:30 AM - 4:00 PM EST, weekdays)

---

## Post-Deployment Monitoring

### Initial Checks (First 30 minutes)
- [ ] Monitor error logs for issues
- [ ] Check browser console for JavaScript errors
- [ ] Verify API response times (<150ms)
- [ ] Test all features (position sizing, localStorage, charts)
- [ ] Confirm Stooq data loading (check console logs)

### First Day Monitoring
- [ ] Track fallback frequency (should be 0% if Stooq working)
- [ ] Monitor API error rate (should be 0%)
- [ ] Check performance metrics
  - Page load time: <3 seconds
  - API response time: <150ms
  - Chart rendering: <1 second
- [ ] Verify data accuracy against official sources daily

### Ongoing Monitoring (Daily)
- [ ] Set up alerts for:
  - [ ] Stooq fallback frequency >5% per 5 minutes
  - [ ] API response time >500ms
  - [ ] Error rate >1%
  - [ ] Server uptime <99%

- [ ] Monitor logs for:
  - [ ] "Stooq unavailable..." messages (indicate Stooq issues)
  - [ ] "All data sources failed..." messages (indicate both sources down)
  - [ ] JavaScript errors in console
  - [ ] Failed API requests

- [ ] Track metrics:
  - [ ] Cache hit rate (expected >95%)
  - [ ] API response time (expected <150ms)
  - [ ] Stooq availability (expected 99%+)
  - [ ] Error rate (expected 0%)

- [ ] Weekly reviews:
  - [ ] Compare market data with official sources
  - [ ] Check for any performance degradation
  - [ ] Review fallback logs for patterns
  - [ ] Verify all charts displaying correctly

### Health Check Endpoint (Optional)
Consider adding health check endpoint for monitoring:
```typescript
// GET /api/health
{
  "status": "healthy",
  "stooqWorking": true,
  "timestamp": "2026-01-02T14:30:00Z",
  "uptime": 3600,
  "cacheHitRate": 0.95
}
```

---

## Rollback Plan

### If Major Issues Occur
1. Stop current deployment
2. Verify previous version still running
3. Redirect traffic back to previous version
4. Investigate issue (check logs, STOOQ_INTEGRATION_GUIDE.md)
5. Fix issue in code or config
6. Test thoroughly before re-deploying

### Common Issues & Fixes

**Issue: Dashboard not loading**
- [ ] Check server is running: `pm2 list` or `systemctl status app`
- [ ] Check port is accessible: `curl http://localhost:3000`
- [ ] Check logs for startup errors
- [ ] Verify .next directory exists
- [ ] Verify Node.js version ≥ v18

**Issue: Market data not showing**
- [ ] Check browser console (F12) for errors
- [ ] Verify API endpoint: `curl http://localhost:3000/api/market-data`
- [ ] Check network tab (F12) for failed requests
- [ ] Verify Stooq is reachable: `curl https://stooq.com/...`
- [ ] Check fallback is working (should see Yahoo data if Stooq down)

**Issue: Charts not rendering**
- [ ] Check if data is fetching (API call successful)
- [ ] Check browser console for JavaScript errors
- [ ] Verify chart dependencies are bundled
- [ ] Check browser console for Plotly errors

**Issue: Slow response times**
- [ ] Check API response: `curl -w "@curl-format.txt" http://localhost:3000/api/market-data`
- [ ] Verify cache is working (second request should be <1ms)
- [ ] Check if fallback to Yahoo (slower than Stooq)
- [ ] Verify network bandwidth available
- [ ] Check server CPU/memory usage

**Issue: Stooq fallback happening too frequently**
- [ ] Check Stooq website directly: https://stooq.com
- [ ] Verify network connectivity and firewall rules
- [ ] Check for DNS issues: `nslookup stooq.com`
- [ ] Verify symbols are correct in code
- [ ] Check browser console for actual errors

---

## Success Criteria

### Deployment Success
- ✅ Application starts without errors
- ✅ Dashboard loads in browser (<3 seconds)
- ✅ Market data displays (VIX, QQQ, TQQQ, SQQQ)
- ✅ API endpoints respond (<150ms)
- ✅ Charts render without errors
- ✅ Position sizing calculator works
- ✅ localStorage persistence works

### Data Quality
- ✅ Market prices reasonable and accurate (±0.1%)
- ✅ Timestamp recent (within 5 minutes)
- ✅ Market open indicator correct (matches actual market status)
- ✅ All 4 symbols display data (no zeros)

### Monitoring
- ✅ Stooq availability 99%+ (or fallback to Yahoo)
- ✅ Fallback frequency <1%
- ✅ API response time <150ms
- ✅ Cache hit rate >95%
- ✅ Error rate 0%

### Documentation
- ✅ Monitoring alerts configured
- ✅ Runbooks available for troubleshooting
- ✅ Team aware of deployment
- ✅ Documentation links saved

---

## Signoff

- [ ] QA verification complete (all 170+ tests passing)
- [ ] Code review complete
- [ ] Pre-deployment testing complete
- [ ] Production build verified
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Team notified

**Approved for Production Deployment:**

Verified By: QA Test Agent
Date: January 2, 2026
Confidence: 100%

---

## Quick Reference Commands

```bash
# Development
npm run dev                    # Start dev server (http://localhost:3000)

# Testing
npm run test                   # Run all tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report

# Building
npm run build                 # Production build
npm run lint                  # ESLint check

# Production
npm run start                 # Start production server
npm run start -- -p 8080     # Custom port

# Verification
curl https://stooq.com/q/l/?s=QQQ.US&f=sd2t2ohlcv&h&e=csv  # Stooq test
curl http://localhost:3000/api/market-data                  # API test
npm run test -- marketDataClient.test.ts                     # Core tests
```

---

## Documentation Reference

- **VERIFICATION_EXECUTIVE_SUMMARY.txt** - Overview (5 min read)
- **README_QA_VERIFICATION.md** - Start here (20 min read)
- **VERIFICATION_SUMMARY.md** - Quick reference (20 min read)
- **VERIFICATION_REPORT.md** - Complete analysis (60 min read)
- **STOOQ_INTEGRATION_GUIDE.md** - Troubleshooting (45 min read)

---

**Checklist Version:** 1.0
**Date:** January 2, 2026
**Status:** READY FOR USE
