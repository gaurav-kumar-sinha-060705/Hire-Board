# Hire Board — Job Apply Portal (MVP)

India's culture-first hiring platform. A full-stack job portal where recruiters
register companies with real culture data, and job seekers evaluate companies
before they apply. Node/Express backend with Supabase PostgreSQL, React (Vite) frontend.

## What's included

### For Job Seekers
- Email/password sign-up with email verification
- Browse jobs with company culture context (type, size, tech stack, work culture)
- Company directory — explore organizations before applying
- Apply with name, email, and a cover note
- Track application statuses: applied → in review → shortlisted → rejected / accepted
- Seeker profiles: headline, skills, experience, bio, LinkedIn + resume upload
- Message recruiters per job application
- In-app notifications for application updates and messages

### For Recruiters
- Two-step registration: account → company profile
- Company culture profiles: tech stack, work culture, perks, growth stage
- Post jobs linked to registered company
- Manage postings: edit, close/reopen, delete
- View applicants per job with profile details
- Update applicant statuses with notifications
- Message applicants per job
- Recruiter trust signals (response rate, jobs posted)

### Platform Features
- Elegant blue-gray theme with shadows and consistent design
- Collapsible navbar with profile avatar dropdown
- Server-side pagination (Browse Jobs, Companies)
- Toast notifications (global context, no duplication)
- Job archive/deactivate for recruiters
- In-app notification center (alerts bell)
- 404 page for unknown routes
- Input validation with maxLength on all forms
- Rate limiting on auth endpoints
- JWT auth with bcrypt password hashing

## Requirements

- Node.js 18+ (`node -v`)
- npm
- Supabase account (free tier)

## Setup

### 1. Clone and open terminal

```
cd job-portal
```

### 2. Backend

```
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your Supabase credentials and JWT secret.

### 3. Frontend (new terminal)

```
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Project Structure

```
job-portal/
  ROADMAP.md              Startup roadmap: database, deploy, features, incubator
  backend/
    src/
      index.js            Express app entry point
      db.js               Database read/write helpers
      middleware/auth.js   JWT verification + role checks
      middleware/rateLimit.js  in-memory rate limiter
      routes/auth.js       register, login, forgot/reset password, email verify
      routes/companies.js  company CRUD
      routes/jobs.js       job CRUD, applications, status, archive
      routes/messages.js   conversations + messaging
      routes/notifications.js  in-app notifications
      routes/users.js      profiles + resume upload/removal
  frontend/
    src/
      pages/              All page components
      components/          Navbar, ApplyModal
      context/AuthContext.jsx   Auth + company state
      context/ToastContext.jsx  Global toast notifications
      api.js              Fetch wrapper for backend
      utils.js            Shared utilities
      status.js           Application status helpers
      styles.css          Blue-gray elegant theme
```

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full startup plan:
- Database migration (JSON → Supabase)
- Email verification & OTP
- Deploy to production (Render + Vercel)
- Landing page & branding
- Company culture features
- Trust layer & verification
- College portal
- Incubator application checklist
- Business model
