# Phase 0 Security Hardening - Manual Test Checklist

**Date:** 2025-01-27  
**Goal:** Verify CLIENT users cannot access planner vault/event routes or APIs

---

## Prerequisites

1. Create a test CLIENT user account (or use existing)
2. Create a test PRO_PLANNER or DIY_PLANNER account (or use existing)
3. Have at least one event created by a planner

---

## Test Cases

### 1. Vault Route Access (Server-Side Redirects)

#### 1.1 Legacy Vault List (`/app/vault`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Navigate directly to `/app/vault`
- [ ] **Expected:** Redirected to `/app` (not shown vault content)
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**

#### 1.2 Legacy Vault Detail (`/app/vault/[eventSlug]`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Navigate directly to `/app/vault/[known-event-slug]`
- [ ] **Expected:** Redirected to `/app` (not shown event detail)
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**

#### 1.3 DIY Planner Vault List (`/diy-planner/vault`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Navigate directly to `/diy-planner/vault`
- [ ] **Expected:** Redirected to `/app` (existing guard should work)
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**

#### 1.4 DIY Planner Vault Detail (`/diy-planner/vault/[eventSlug]`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Navigate directly to `/diy-planner/vault/[known-event-slug]`
- [ ] **Expected:** Redirected to `/app` (existing guard should work)
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**

#### 1.5 Pro Planner Vault List (`/pro/planner/vault`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Navigate directly to `/pro/planner/vault`
- [ ] **Expected:** Redirected to `/app` (existing guard should work)
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**

#### 1.6 Pro Planner Vault Detail (`/pro/planner/vault/[eventSlug]`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Navigate directly to `/pro/planner/vault/[known-event-slug]`
- [ ] **Expected:** Redirected to `/app` (existing guard should work)
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**

---

### 2. Event Sub-Page Access (Budget, Guests, Checklists)

#### 2.1 Event Budget Page (`/app/events/[eventSlug]/budget`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Navigate directly to `/app/events/[known-event-slug]/budget`
- [ ] **Expected:** Redirected to `/app` (not shown budget)
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**

#### 2.2 Event Guests Page (`/app/events/[eventSlug]/guests`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Navigate directly to `/app/events/[known-event-slug]/guests`
- [ ] **Expected:** Redirected to `/app` (not shown guest list)
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**

#### 2.3 Event Checklists Page (`/app/events/[eventSlug]/checklists`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Navigate directly to `/app/events/[known-event-slug]/checklists`
- [ ] **Expected:** Redirected to `/app` (not shown checklists)
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**

---

### 3. API Route Access (403 Forbidden)

#### 3.1 Create Event API (`POST /api/events/create`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Make POST request to `/api/events/create` with valid event data
- [ ] **Expected:** Response status `403 Forbidden` with error message
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**
- [ ] **Response Body:** (paste error message)

#### 3.2 Get Event API (`GET /api/events/[eventSlug]`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Make GET request to `/api/events/[known-event-slug]`
- [ ] **Expected:** Response status `403 Forbidden` with error message
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**
- [ ] **Response Body:** (paste error message)

#### 3.3 Delete Event API (`DELETE /api/events/[eventSlug]`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Make DELETE request to `/api/events/[known-event-slug]`
- [ ] **Expected:** Response status `403 Forbidden` with error message
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**
- [ ] **Response Body:** (paste error message)

#### 3.4 DIY Events API (`GET /api/diy/events`)
- [ ] **Test:** Sign in as CLIENT user
- [ ] **Action:** Make GET request to `/api/diy/events`
- [ ] **Expected:** Response status `403 Forbidden` with error message
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**
- [ ] **Response Body:** (paste error message)

---

### 4. Browser Console Checks

#### 4.1 Check for Redirects
- [ ] **Test:** Open browser DevTools → Network tab
- [ ] **Action:** Attempt to access vault routes as CLIENT user
- [ ] **Expected:** See redirect responses (status 307/308) to `/app`
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**

#### 4.2 Check for 403 Errors
- [ ] **Test:** Open browser DevTools → Network tab
- [ ] **Action:** Attempt to call planner APIs as CLIENT user
- [ ] **Expected:** See 403 Forbidden responses
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**

---

### 5. Server Log Checks

#### 5.1 Check Server Logs for CLIENT Access Attempts
- [ ] **Test:** Check server console/logs
- [ ] **Action:** Attempt to access vault routes as CLIENT user
- [ ] **Expected:** See warning logs like "CLIENT user attempted to access planner vault"
- [ ] **Status:** ✅ PASS / ❌ FAIL
- [ ] **Notes:**
- [ ] **Log Output:** (paste relevant log lines)

---

## Quick Test Script (cURL)

Use these commands to quickly test API endpoints:

```bash
# Set your CLIENT user session cookie/token here
CLIENT_SESSION_COOKIE="your-session-cookie"

# Test Create Event API
curl -X POST http://localhost:3000/api/events/create \
  -H "Content-Type: application/json" \
  -H "Cookie: $CLIENT_SESSION_COOKIE" \
  -d '{"name":"Test Event","event_type_raw":"wedding","budget_raw":"10000","date":"2025-12-31","city":"New York","state":"NY","zipCode":"10001","headcount":"100"}' \
  -v

# Expected: 403 Forbidden

# Test Get Event API
curl -X GET http://localhost:3000/api/events/[event-slug] \
  -H "Cookie: $CLIENT_SESSION_COOKIE" \
  -v

# Expected: 403 Forbidden

# Test Delete Event API
curl -X DELETE http://localhost:3000/api/events/[event-slug] \
  -H "Cookie: $CLIENT_SESSION_COOKIE" \
  -v

# Expected: 403 Forbidden

# Test DIY Events API
curl -X GET http://localhost:3000/api/diy/events \
  -H "Cookie: $CLIENT_SESSION_COOKIE" \
  -v

# Expected: 403 Forbidden
```

---

## Acceptance Criteria

All tests must pass:

- ✅ CLIENT users are redirected from all vault routes
- ✅ CLIENT users are redirected from all event sub-pages (budget, guests, checklists)
- ✅ CLIENT users receive 403 Forbidden from all planner APIs
- ✅ No planner data is exposed to CLIENT users via direct URL access
- ✅ Server logs show appropriate warnings for CLIENT access attempts

---

## Notes

- **Phase 0 Focus:** Security hardening only - no new models or features
- **Future Phases:** Will add proper client sharing/access mechanisms
- **Current State:** CLIENT users are completely blocked from planner routes (as intended)

---

## Test Results Summary

- **Total Tests:** 15
- **Passed:** ___ / 15
- **Failed:** ___ / 15
- **Date Completed:** ___________
- **Tester:** ___________

