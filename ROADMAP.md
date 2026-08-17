# Hire Board — Startup Roadmap

From MVP to incubator-ready product. Each phase builds on the last.
**Do them in order.** Estimated total: 2-3 weeks of focused work.

---

## Phase 1 — Database Migration (JSON → Supabase)

**Why:** `data.json` resets on every deploy. Supabase gives you free PostgreSQL (500MB, 50K rows).

### Steps

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project, pick a region close to your users (Mumbai)
3. Go to **Table Editor** and create these tables:

```
users           (id, name, email, password, role, profile JSONB, createdAt)
jobs            (id, title, companyId, company, location, type, mode, salary,
                 description, requirements, recruiterId, recruiterName,
                 isActive boolean, postedAt)
companies       (id, name, location, type, size, website, description,
                 recruiterId, createdAt, updatedAt)
applications    (id, jobId, seekerId, name, email, note, status, appliedAt)
conversations   (id, jobId, recruiterId, seekerId, createdAt, lastMessageAt)
messages        (id, conversationId, senderId, body, sentAt, read boolean)
passwordResets  (id, userId, token, expiresAt)
notifications   (id, userId, type, message, link, read boolean, createdAt)
```

4. Add sequences for auto-increment IDs:
```
nextUserId, nextJobId, nextCompanyId, nextAppId, nextConvId, nextMsgId, nextNotifId
```

5. Install Supabase client in backend:
```
cd backend && npm install @supabase/supabase-js
```

6. Create `backend/src/supabase.js`:
```js
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
```

7. Rewrite `backend/src/db.js` to use Supabase queries instead of `fs.readFileSync`
8. Update all `routes/*.js` files — replace `db.users.find(...)` with `supabase.from("users").select(...)`
9. Add `SUPABASE_URL` and `SUPABASE_KEY` to `.env`
10. Test every flow: register, login, post job, apply, message, notifications

### Files to change
- `backend/src/db.js` — full rewrite
- `backend/src/routes/auth.js` — Supabase queries
- `backend/src/routes/jobs.js` — Supabase queries
- `backend/src/routes/companies.js` — Supabase queries
- `backend/src/routes/messages.js` — Supabase queries
- `backend/src/routes/notifications.js` — Supabase queries
- `backend/src/routes/users.js` — Supabase queries
- `backend/src/index.js` — Supabase init
- `backend/package.json` — add @supabase/supabase-js
- `backend/.env` — add SUPABASE_URL, SUPABASE_KEY

---

## Phase 2 — Email Verification & OTP

**Why:** No email = fake accounts, no password reset, no trust. Incubators will ask about this.

### Steps

1. Create a free account at [resend.com](https://resend.com) (100 emails/day free)
2. Install: `cd backend && npm install resend`
3. Add `RESEND_API_KEY` and `FROM_EMAIL` to `.env`

### 2a. Email Verification on Signup

4. In `routes/auth.js` register handler:
   - Generate a 6-digit OTP, store it in a `emailOtps` table with 10-min expiry
   - Send verification email via Resend with the OTP
   - Return `user` but mark `emailVerified: false`
5. Create new route `POST /auth/verify-email`:
   - Accept `{ email, otp }`
   - Match OTP against `emailOtps` table
   - Set `emailVerified: true` on user
6. Create frontend page `VerifyEmail.jsx`:
   - Show after registration: "We sent a code to your email"
   - 6-digit input field
   - Resend OTP button (60s cooldown)
7. Update `App.jsx` routes, add `/verify-email`
8. Block job posting/applications until `emailVerified: true`

### 2b. Password Reset via Email

9. In `routes/auth.js` forgot-password handler:
   - Send reset link via Resend instead of returning token in response
   - Link format: `https://yourdomain.com/reset-password?token=xxx`
10. Update `ForgotPassword.jsx`:
    - Remove dev-mode token display
    - Show: "Check your email for a reset link"
11. Update `backend/.env` with production URL

### Files to change
- `backend/src/routes/auth.js` — OTP + email sending
- `backend/src/db.js` — add emailOtps table
- `frontend/src/pages/ForgotPassword.jsx` — remove dev token
- `frontend/src/pages/VerifyEmail.jsx` — new file
- `frontend/src/App.jsx` — add route
- `frontend/src/api.js` — add verifyEmail method

---

## Phase 3 — Deploy to Production

**Why:** Live URL = real product. Incubators won't take you seriously without one.

### Steps

### 3a. Backend → Render

1. Push code to GitHub (create private repo)
2. Go to [render.com](https://render.com), connect GitHub
3. Create a **New Web Service**:
   - Region: Mumbai or Singapore
   - Build command: `npm install`
   - Start command: `node src/index.js`
   - Environment variables:
     ```
     NODE_ENV=production
     JWT_SECRET=<random 64-char hex>
     SUPABASE_URL=<your supabase url>
     SUPABASE_KEY=<your supabase anon key>
     RESEND_API_KEY=<your resend key>
     FROM_EMAIL=noreply@yourdomain.com
     FRONTEND_URL=https://yourdomain.vercel.app
     ```
4. Note the backend URL: `https://your-app.onrender.com`

### 3b. Frontend → Vercel

1. Go to [vercel.com](https://vercel.com), connect GitHub
2. Import the repo, set root directory to `frontend/`
3. Environment variables:
   ```
   VITE_API_URL=https://your-app.onrender.com
   ```
4. Update `frontend/src/api.js`:
   ```js
   const BASE = import.meta.env.VITE_API_URL || "/api";
   ```
5. Deploy — you get `https://your-project.vercel.app`

### 3c. Custom Domain (optional but recommended)

6. Buy domain from Namecheap or Cloudflare (~₹500-800/year)
7. Add domain to Vercel (frontend) and Render (backend)
8. Enable HTTPS (automatic on both)

### 3d. CORS & Security

9. Update `backend/src/index.js`:
   ```js
   app.use(cors({ origin: process.env.FRONTEND_URL }));
   ```
10. Add helmet: `npm install helmet`
11. Update `index.js`:
    ```js
    import helmet from "helmet";
    app.use(helmet());
    ```

### 3e. Resend Domain (after deployment)

12. Go to [resend.com/domains](https://resend.com/domains), click **"Add Domain"**
13. Enter your domain (e.g. `hireboard.app`)
14. Resend gives you 3 DNS records (TXT, CNAME, MX) — add them to your DNS provider
15. Click **"Verify"** in Resend dashboard (takes 5-30 min)
16. Update `FROM_EMAIL` in backend env to `noreply@yourdomain.com`
17. Remove `onboarding@resend.dev`

### Files to change
- `frontend/src/api.js` — env-based API URL
- `backend/src/index.js` — CORS origin, helmet
- `backend/.env` — all production env vars
- `backend/package.json` — add helmet
- `frontend/package.json` — (no change)

---

## Phase 4 — Landing Page & Branding

**Why:** First impression. The `/` route should sell the product, not just list jobs.

### Steps

1. Create `frontend/src/pages/Landing.jsx`:
   - Hero section: headline + CTA ("See companies. Know before you apply.")
   - Three feature cards: Culture Profiles | Free SMB Hiring | Campus Access
   - Stats section (placeholder numbers for now)
   - How it works (3 steps)
   - CTA: "Join Hire Board" with Recruiter / Seeker buttons
2. Update `App.jsx`:
   - `/` shows `<Landing />` for logged-out users
   - `/` shows `<BrowseJobs />` for logged-in users
3. Create `frontend/public/og-image.png` (1200x630) for social sharing
4. Update `frontend/index.html`:
   - `<title>Hire Board — Know Before You Apply</title>`
   - Add `<meta name="description">` and Open Graph tags
5. Create `frontend/public/favicon.svg` — simple "HB" mark in black

### Files to change
- `frontend/src/pages/Landing.jsx` — new file
- `frontend/src/App.jsx` — conditional landing
- `frontend/index.html` — meta tags, title
- `frontend/public/favicon.svg` — new file
- `frontend/public/og-image.png` — new file

---

## Phase 5 — Company Culture Features

**Why:** This is your differentiation. No Indian platform shows real company culture data.

### Steps

### 5a. Enhanced Company Profiles

1. Add fields to companies table:
   ```
   techStack    (text)     — "React, Node.js, PostgreSQL"
   workCulture  (text)     — "Flexible hours, async-first, no meetings on Friday"
   perks        (text)     — "Health insurance, learning budget, 25 days PTO"
   growthStage  (text)     — "Series A, Growing 3x YoY"
   founded      (text)     — "2022"
   ```
2. Update `routes/companies.js` validateCompany to accept new fields
3. Update `RegisterCompany.jsx` and `EditCompany.jsx` forms with new fields
4. Update `CompanyProfile.jsx` to display culture data in cards/blocks

### 5b. Company Reviews (Phase 2 feature)

5. Create `reviews` table:
   ```
   id, companyId, userId, rating, pros, cons, role, status, createdAt
   ```
6. Create `routes/reviews.js` — CRUD + average rating
7. Add reviews section to CompanyProfile page
8. Limit: 1 review per user per company

### Files to change
- `backend/src/routes/companies.js` — new fields
- `backend/src/routes/reviews.js` — new file
- `backend/src/index.js` — mount reviews route
- `backend/src/db.js` — add reviews table
- `frontend/src/pages/RegisterCompany.jsx` — new fields
- `frontend/src/pages/EditCompany.jsx` — new fields
- `frontend/src/pages/CompanyProfile.jsx` — culture display + reviews

---

## Phase 6 — Trust Layer & Verification

**Why:** Fake job postings kill trust. Verification = competitive advantage.

### Steps

### 6a. Company Verification

1. Add to companies table:
   ```
   verified      (boolean, default false)
   verifiedAt    (timestamp, nullable)
   ```
2. Add "Request verification" button on company profile (recruiter only)
3. Manual verification initially (you review company docs via email)
4. Show verified badge (✓) next to company name across the platform

### 6b. Recruiter Trust Signals

5. Add to jobs API response:
   - `recruiterResponseRate` — % of messages replied to
   - `avgResponseTime` — hours
   - `totalJobsPosted` — lifetime count
6. Calculate these from messages/applications data
7. Show on job detail page near recruiter info

### 6c. Job Posting Quality

8. Add `expiresAt` field to jobs (auto-archive after 30 days)
9. Add job report button (flag inappropriate postings)
10. Admin panel later to review reports

### Files to change
- `backend/src/routes/companies.js` — verification fields
- `backend/src/routes/jobs.js` — trust signals, expiry
- `frontend/src/pages/CompanyProfile.jsx` — verified badge
- `frontend/src/pages/JobDetail.jsx` — recruiter trust signals

---

## Phase 7 — College Portal

**Why:** 1.5M engineers/year, broken campus placement system = huge market.

### Steps

1. Add to users table:
   ```
   college     (text)     — "Delhi Technological University"
   graduation  (integer)  — 2025
   degree      (text)     — "B.Tech Computer Science"
   ```
2. Add college fields to seeker profile (Profile.jsx)
3. Add college filter to job search: "Hiring from your college"
4. Create `/colleges` page:
   - List of colleges with student counts
   - Company can see students from a specific college
5. Add "College Tier" to company profiles (Tier 1/2/3)
6. Create job posting filter: "Open to Tier 2/3 colleges"

### Files to change
- `backend/src/routes/users.js` — college fields
- `backend/src/routes/jobs.js` — college filter
- `frontend/src/pages/Profile.jsx` — college input
- `frontend/src/pages/BrowseJobs.jsx` — college filter
- `frontend/src/pages/Colleges.jsx` — new file

---

## Phase 8 — Incubator Application

**Why:** Funding + mentorship + network. Apply NOW — don't wait for perfection.

### Deliverables needed

1. **Live product** — deployed URL with real database (Phase 1-3)
2. **Landing page** — tells the story (Phase 4)
3. **Demo video** — 2 min screen recording showing:
   - Recruiter registers → fills company culture profile → posts job
   - Seeker browses → sees company culture → applies
   - Recruiter sees applicant → updates status → messages seeker
4. **5-10 real users** — friends, family, anyone
5. **Pitch deck** (10 slides):

```
Slide 1:  Title — "Hire Board: Know Before You Apply"
Slide 2:  Problem — India's hiring is broken: fake jobs, no culture info, SMBs priced out
Slide 3:  Solution — Culture-first company profiles + free SMB hiring + campus access
Slide 4:  Demo — screenshots or video embed
Slide 5:  Market — India recruitment market ₹15,000 Cr+, 63M MSMEs, 1.5M engineers/year
Slide 6:  Competition — Indeed/LinkedIn/Naukri (big, expensive, no culture) vs You (free, culture-first)
Slide 7:  Traction — X users, Y companies, Z jobs posted (even small numbers count)
Slide 8:  Business Model — freemium: free for SMBs, premium for large companies (₹999/mo for featured listings)
Slide 9:  Team — you + your skills (mention you built full-stack solo)
Slide 10: Ask — ₹5-10L seed funding, office space, mentorship
```

### Where to apply

| Program | Deadline | Funding | Link |
|---------|----------|---------|------|
| Startup India Seed Fund | Rolling | Up to ₹20L | startupindia.gov.in |
| T-Hub (Hyderabad) | Rolling | Varies | t-hub.co |
| NASSCOM 10K Startups | Check site | Mentorship | nasscom.in |
| IIT Incubators | Check site | Varies | (if student/alumni) |
| District Startup Cell | Varies | State-specific | (your state govt site) |
| CIIE.CO (IIM-A) | Check site | Varies | ciie.co |

### Timeline

```
Week 1:  Phase 1 (database) + Phase 3 (deploy)
Week 2:  Phase 2 (email) + Phase 4 (landing page)
Week 3:  Phase 5 (culture features) + Phase 6 (trust)
Week 4:  Phase 7 (college) + Phase 8 (apply to incubators)
```

---

## Phase 9 — Business Model

**How you'll make money eventually:**

| Tier | Price | What they get |
|------|-------|---------------|
| Free | ₹0 | Basic company profile, post up to 5 jobs |
| Pro | ₹999/mo | Featured listings, analytics, priority support |
| Enterprise | ₹4,999/mo | API access, bulk posting, custom branding |

---

## Phase 10 — Post-Incubator Features

Once you have users and funding, build these:

- [ ] Mobile app (React Native or Flutter)
- [ ] Google OAuth login
- [ ] Job alerts email (weekly digest)
- [ ] AI job matching (suggest jobs based on profile)
- [ ] Resume builder (in-app)
- [ ] Video introductions (30-sec seeker videos)
- [ ] Analytics dashboard for recruiters
- [ ] Multi-language support (Hindi, Tamil, Telugu...)
- [ ] Admin dashboard (manage users, reports, verification)
- [ ] API for third-party integrations
