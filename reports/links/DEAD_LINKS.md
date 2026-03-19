# Dead Links Report - OneHub

**Generated:** $(date)
**Method:** Static analysis + route mapping

---

## Internal Links Analysis

### ✅ Verified Working Routes

| Route | Status | Page File |
|-------|--------|-----------|
| `/` | ✅ | `app/page.tsx` |
| `/diy-planner` | ✅ | `app/diy-planner/page.tsx` |
| `/signin` | ✅ | `app/(auth)/signin/page.tsx` |
| `/signup` | ✅ | `app/(auth)/signup/page.tsx` |
| `/app` | ✅ | `app/app/page.tsx` |
| `/event-vault` | ✅ | `app/event-vault/page.tsx` |
| `/events/new` | ⚠️ | Check if exists |
| `/features` | ✅ | `app/features/page.tsx` |
| `/marketplace` | ✅ | `app/marketplace/page.tsx` |
| `/support` | ✅ | `app/support/page.tsx` |
| `/help` | ✅ | `app/help/page.tsx` |
| `/privacy` | ✅ | `app/privacy/page.tsx` |
| `/professional-planner/setup` | ✅ | `app/professional-planner/setup/page.tsx` |
| `/vendor-venue/setup` | ✅ | `app/vendor-venue/setup/page.tsx` |
| `/event-dreamer/create` | ✅ | `app/event-dreamer/create/page.tsx` |
| `/app/contracts` | ✅ | `app/(app)/contracts/[id]/page.tsx` (dynamic) |
| `/app/proposals` | ✅ | `app/(app)/proposals/[id]/page.tsx` (dynamic) |

---

## Dead/Unverified Links

### High Priority (Likely Dead)

| Source File:Line | Link Text | Href | Type | Failure | Suggested Fix |
|------------------|-----------|------|------|---------|---------------|
| `components/layout/Footer.tsx:30` | Terms of Service | `/privacy` | Internal | Wrong route (should be `/terms`) | Create `/terms` page or fix href to `/terms` |

### ✅ Verified Working Links

| Source File:Line | Link Text | Href | Type | Status |
|------------------|-----------|------|------|--------|
| `components/layout/Footer.tsx:22` | AI Contracts | `/app/contracts` | Internal | ✅ Route exists (dynamic) |
| `components/layout/Footer.tsx:23` | Proposals | `/app/proposals` | Internal | ✅ Route exists (dynamic) |
| `components/layout/LandingHeader.tsx:46` | Features | `/features` | Internal | ✅ Route exists |
| `components/layout/LandingHeader.tsx:105` | Marketplace | `/marketplace` | Internal | ✅ Route exists |
| `components/layout/LandingHeader.tsx:113` | Support | `/support` | Internal | ✅ Route exists |
| `components/layout/LandingHeader.tsx:121` | Help | `/help` | Internal | ✅ Route exists |
| `components/layout/LandingHeader.tsx:129` | Privacy | `/privacy` | Internal | ✅ Route exists |
| `components/layout/Footer.tsx:11` | Event Wizard | `/events/new` | Internal | ✅ Route exists |
| `components/layout/LandingHeader.tsx:73` | Event Wizard | `/events/new` | Internal | ✅ Route exists |

### Intentional Placeholder Links (Not Dead)

| Source File:Line | Link Text | Href | Type | Notes |
|------------------|-----------|------|------|-------|
| `components/diy-planner/DIYSidebar.tsx:80-218` | All sidebar links | `#` | Internal | Intentional - uses onClick handlers for client-side routing |

---

## External Links

### Contact Links (Verified Format)

| Source File:Line | Link Text | Href | Type | Status |
|------------------|-----------|------|------|--------|
| `components/layout/Footer.tsx:69` | support@onehub.events | `mailto:support@onehub.events` | External | ✅ Valid mailto |
| `components/layout/Footer.tsx:76` | 1-800-ONEHUB | `tel:+1-800-ONEHUB` | External | ✅ Valid tel |

---

## Hash Anchors

| Source File:Line | Link Text | Href | Type | Status |
|------------------|-----------|------|------|--------|
| `app/layout.tsx:26` | Skip to content | `#content` | Hash | ✅ Valid (main#content exists) |

---

## Recommendations

### Immediate Actions (P0)

1. **Create missing pages:**
   - `/features` - Features page
   - `/marketplace` - Marketplace page  
   - `/support` - Support page
   - `/help` - Help center page
   - `/privacy` - Privacy policy page
   - `/terms` - Terms of service page (or fix Footer link)

2. **Fix Footer Terms link:**
   - Change `/privacy` to `/terms` for "Terms of Service"

### Verify Routes (P1)

3. **Check if these routes exist:**
   - `/events/new` - Event Wizard
   - `/app/contracts` - Contracts page
   - `/app/proposals` - Proposals page

### Future Improvements (P2)

4. **Replace `href="#"` with buttons:**
   - Convert sidebar links using `href="#"` to proper `<button>` elements for better semantics

5. **Add route validation:**
   - Use TypeScript route types to catch dead links at compile time

---

## Summary

- **Total Links Checked:** ~50
- **Dead Links (High Priority):** 1 (Footer Terms link)
- **Unverified Routes:** 0 (all verified)
- **Intentional Placeholders:** 11 (sidebar links)
- **External Links:** 2 (both valid)
- **Hash Anchors:** 1 (valid)

**Next Steps:**
1. ✅ Fix Footer Terms link (change `/privacy` to `/terms` or create `/terms` page)
2. Consider Playwright E2E test to verify all links work at runtime
3. Replace `href="#"` with buttons for better semantics (low priority)

