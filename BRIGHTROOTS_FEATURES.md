# Brightroots Feature Roadmap

> **Vision**: The best online course platform and digital product marketplace in Africa, where creatives create, sell, and get paid.

---

## Current State (What's Already Built)

| Feature | Status |
|---------|--------|
| Email/password auth + password reset | Done |
| Course CRUD + curriculum editor (admin-only) | Done |
| YouTube video player with server-side gating | Done |
| Lesson progress tracking | Done |
| Pro subscription via licence keys (Chariow) | Done |
| Admin dashboard (stats, courses, licences, students) | Done |
| Student dashboard (my courses, subscription, settings) | Done |
| Mobile responsive design | Done |
| Bilingual i18n (EN/FR) | Done |
| Email notifications (welcome, completion, renewal) | Done |
| Category-based course browsing | Done |
| WCAG 2.1 AA accessibility | Done |
| Image optimization (next/image) | Done |

---

## Phase 1 — Creator Economy Foundation

> **Goal**: Transform from single-admin to multi-creator marketplace. This is the #1 priority — without it, Brightroots is a personal course site, not a platform.

### 1.1 Creator Onboarding & Profiles

- [ ] **Creator application flow** — "Become a Creator" page with:
  - Bio, expertise area, social links, portfolio samples
  - ID verification (optional, for trust badge)
  - Admin approval queue before creators go live
- [ ] **Public creator profiles** — `/creators/[username]`
  - Avatar, banner image, bio, social links
  - Published courses and digital products listed
  - Student count, average rating, total reviews
  - "Follow" button for students to get updates
- [ ] **Creator roles** — New `creator` role between `student` and `admin`
  - Creators can manage their OWN courses only
  - Admin retains ability to manage ALL courses + approve creators
  - Students can browse/buy from any creator

### 1.2 Creator Dashboard

- [ ] **Creator home** — `/creator` with:
  - Revenue summary (today, this week, this month, all time)
  - Recent enrollments feed
  - Quick actions (create course, view analytics)
- [ ] **My Courses** — `/creator/courses`
  - List of creator's own courses with status (draft/published/under review)
  - Duplicate course functionality
  - Course-level analytics (enrollments, completion rate, revenue)
- [ ] **Course builder** — `/creator/courses/new` and `/creator/courses/[id]/edit`
  - Same curriculum editor that admins have, scoped to creator's courses
  - Cover image upload (Supabase Storage)
  - SEO fields (meta title, meta description)
  - Pricing: free, one-time purchase, or included in platform subscription
- [ ] **Creator analytics** — `/creator/analytics`
  - Revenue over time (chart)
  - Top-performing courses
  - Student demographics (country, language)
  - Completion rates per course
  - Funnel: views > enrollments > completions

### 1.3 Revenue & Payouts

- [ ] **Revenue split model** — Define platform commission (e.g. 80% creator / 20% Brightroots)
  - Configurable per creator (for partnerships or featured creators)
  - Transparent breakdown visible in creator dashboard
- [ ] **Payout system**
  - Support Mobile Money (Wave, Orange Money, MTN MoMo, M-Pesa)
  - Bank transfer option
  - Minimum payout threshold (e.g. 5,000 FCFA)
  - Payout schedule: weekly or monthly (creator chooses)
  - Payout history with downloadable receipts
- [ ] **Earnings ledger** — Per-transaction log
  - Student name, course, amount, platform fee, net earnings, date
  - Exportable as CSV

### 1.4 Course Pricing Models

- [ ] **Free courses** — Already supported
- [ ] **Platform subscription** (Pro) — Already supported (all-access pass)
- [ ] **Individual course purchase** — New
  - Creator sets price per course
  - One-time payment, lifetime access
  - Students can buy courses a-la-carte without Pro subscription
- [ ] **Course bundles** — Creator groups 2+ courses at a discounted price
- [ ] **Coupons & discounts** — Creator generates discount codes
  - Percentage or fixed amount off
  - Expiry date and usage limit
  - Trackable (which coupon drove which sales)

---

## Phase 2 — Trust, Quality & Discovery

> **Goal**: Build the systems that help students find great courses and trust creators.

### 2.1 Reviews & Ratings

- [ ] **Course reviews** — Students who completed 50%+ can leave a review
  - 1-5 star rating
  - Written review (optional)
  - Helpful/not helpful voting
  - Creator can respond to reviews
- [ ] **Creator rating** — Aggregate of all their course ratings
- [ ] **Review moderation** — Admin can hide/remove inappropriate reviews
- [ ] **Featured reviews** — Show top reviews on course detail page

### 2.2 Advanced Search & Discovery

- [ ] **Full-text search** — Server-side search across titles, descriptions, tags, creator names
- [ ] **Filters** — By category, level, language, price (free/paid), duration, rating
- [ ] **Sort options** — Most popular, newest, highest rated, most reviewed
- [ ] **Trending courses** — Based on recent enrollment velocity
- [ ] **Recommended for you** — Based on enrollment history and category preferences
- [ ] **"Students also bought"** — Course-to-course recommendations
- [ ] **Category landing pages** — `/categories/[slug]` with featured courses, popular creators

### 2.3 Course Quality Standards

- [ ] **Course review process** — Admin approves courses before they go live
  - Checklist: has description, has cover image, has at least 3 lessons, each lesson has video
  - Automated checks + manual review
- [ ] **Quality badges** — "Brightroots Certified" for courses that meet high standards
- [ ] **Completion certificates** — Auto-generated PDF certificates
  - Student name, course title, completion date, creator name
  - Unique verification URL
  - Shareable on social media / LinkedIn
- [ ] **Course preview** — First 1-2 lessons free for any course (configurable by creator)

---

## Phase 3 — Digital Products Marketplace

> **Goal**: Expand beyond courses into downloadable digital products.

### 3.1 Digital Product Types

- [ ] **Downloadable files** — PDFs, templates, presets, fonts, design assets
  - Secure download links (expire after X hours)
  - Download count tracking
  - File size limits per plan
- [ ] **E-books** — In-browser PDF reader or EPUB support
- [ ] **Templates & presets** — For Photoshop, Illustrator, Canva, Figma, etc.
- [ ] **Audio files** — Music, sound effects, podcasts
- [ ] **Design assets** — Icons, illustrations, mockups

### 3.2 Product Pages & Management

- [ ] **Product detail page** — `/products/[slug]`
  - Cover images (gallery), description, file format, size
  - Preview/sample download
  - Reviews and ratings
  - "Buy Now" button
- [ ] **Creator product dashboard** — `/creator/products`
  - Upload files to Supabase Storage
  - Set pricing, description, preview images
  - Track downloads and revenue

### 3.3 Bundles & Collections

- [ ] **Mixed bundles** — Combine courses + digital products
- [ ] **Creator shops** — Each creator gets a storefront page
  - `/creators/[username]/shop`
  - All their courses and products in one place

---

## Phase 4 — Engagement & Community

> **Goal**: Keep students coming back and build community around learning.

### 4.1 Student Engagement

- [ ] **Learning streaks** — Track consecutive days of learning
  - Visual streak counter on dashboard
  - Streak milestones (7 days, 30 days, 100 days)
- [ ] **Achievement badges** — Gamification
  - "First Course Completed", "5 Courses", "Speed Learner", etc.
  - Displayed on student profile
- [ ] **Learning goals** — Student sets weekly goals (e.g. 3 lessons/week)
  - Progress tracking against goal
  - Reminder notifications
- [ ] **Course notes** — Students can take notes alongside videos
  - Timestamped to video position
  - Exportable as PDF
- [ ] **Bookmarks** — Save specific lessons for later review

### 4.2 Community Features

- [ ] **Course Q&A** — Per-lesson discussion thread
  - Students ask questions, creator responds
  - Upvote best answers
  - Pinned responses from creator
- [ ] **Course announcements** — Creator can post updates to enrolled students
- [ ] **Student profiles** — Public profiles showing completed courses, badges
- [ ] **WhatsApp community links** — Creator can link WhatsApp group to course
  - Auto-invite on enrollment

### 4.3 Notifications Center

- [ ] **In-app notification bell** — Real-time feed
  - New course from followed creator
  - Review response from creator
  - Course update/new lesson added
  - Achievement earned
  - Subscription expiring
- [ ] **Push notifications** (PWA) — Optional browser push
- [ ] **WhatsApp notifications** — Course reminders and updates via WhatsApp API
- [ ] **Email digest** — Weekly summary of new courses, progress, and updates

---

## Phase 5 — Africa-Specific Optimizations

> **Goal**: Features that specifically serve the African market better than global competitors.

### 5.1 Payment Localization

- [ ] **Mobile Money first** — Primary payment, not afterthought
  - MTN Mobile Money (Cameroon, Ghana, Uganda, Rwanda)
  - Orange Money (Senegal, Mali, Cote d'Ivoire, Cameroon)
  - Wave (Senegal, Cote d'Ivoire, Mali, Burkina Faso)
  - M-Pesa (Kenya, Tanzania, DRC)
  - Airtel Money (multiple countries)
- [ ] **Multi-currency pricing** — Creator sets price in their local currency
  - Auto-convert for students in other countries
  - Supported: XOF, XAF, NGN, KES, GHS, ZAR, TZS, UGX, RWF, MAD, EGP
- [ ] **Installment payments** — Split course payment into 2-3 monthly installments
  - Critical for higher-priced courses in lower-income markets
- [ ] **Group purchases** — Buy course access for a team/school at bulk discount

### 5.2 Low Bandwidth & Offline

- [ ] **Adaptive video quality** — Auto-detect connection speed
  - 240p, 360p, 480p, 720p options
  - Remember quality preference per user
- [ ] **Offline mode (PWA)** — Download lessons for offline viewing
  - Service worker for caching
  - Sync progress when back online
- [ ] **Audio-only mode** — Listen to course audio without video
  - Saves 80%+ data
  - Background playback on mobile
- [ ] **Lightweight pages** — Lazy load images, defer non-critical JS
  - Target: first meaningful paint < 2s on 3G

### 5.3 Language Expansion

- [ ] **Portuguese** — For Mozambique, Angola, Cape Verde, Guinea-Bissau
- [ ] **Swahili** — For Kenya, Tanzania, Uganda, DRC
- [ ] **Arabic** — For North Africa (Morocco, Egypt, Tunisia, Algeria)
- [ ] **Amharic** — For Ethiopia
- [ ] **Creator chooses course language** — Tag courses by language
  - Students filter courses by their preferred language
- [ ] **Auto-subtitles** — AI-generated subtitles for video lessons
  - Multiple language options

### 5.4 WhatsApp Integration

- [ ] **WhatsApp login** — Sign in with phone number (via WhatsApp OTP)
- [ ] **Course sharing** — "Share on WhatsApp" button with deep link
- [ ] **WhatsApp marketing** — Creator can send course updates to opted-in students
- [ ] **WhatsApp payment** — Redirect to payment via WhatsApp chat flow
- [ ] **WhatsApp customer support** — Floating WhatsApp button for help

---

## Phase 6 — Growth & Marketing Tools

> **Goal**: Give creators the tools to grow their audience and revenue.

### 6.1 Creator Marketing

- [ ] **Affiliate program** — Students earn commission referring new students
  - Unique referral links per student
  - Configurable commission rate (e.g. 10-30%)
  - Dashboard to track referral earnings
- [ ] **Email marketing** — Creator can email enrolled students
  - Pre-built templates (new course, course update, special offer)
  - Segmentation (by course, completion status, enrollment date)
- [ ] **Landing page builder** — Custom sales pages for courses
  - Drag-and-drop sections (hero, features, testimonials, FAQ, CTA)
  - Custom domain support
- [ ] **Social proof widgets** — Embeddable "X students enrolled" widget
- [ ] **Pre-launch waitlist** — Collect emails before course goes live

### 6.2 Platform Growth

- [ ] **SEO optimization** — Dynamic meta tags, Open Graph, structured data
  - Course schema markup (Course, VideoObject)
  - Creator schema markup (Person)
  - Sitemap generation
- [ ] **Blog/content marketing** — `/blog` with articles about learning and creators
- [ ] **Featured creators program** — Homepage spotlight for top creators
- [ ] **Gift cards** — Buy course access as a gift
  - Digital gift card with custom message
  - Redeemable code
- [ ] **Corporate/institutional plans** — Sell to schools, companies, NGOs
  - Bulk licence management
  - Team dashboards
  - Custom branding

### 6.3 Analytics (Platform-wide)

- [ ] **Admin analytics dashboard** — Replace current placeholder
  - Revenue over time (total, per creator, per course)
  - New users / returning users
  - Conversion funnel: visit > signup > enrollment > completion
  - Geographic distribution
  - Device breakdown (mobile vs desktop)
  - Popular search queries
- [ ] **Creator leaderboard** — Top creators by revenue, students, ratings

---

## Phase 7 — Mobile App & Advanced Features

> **Goal**: Native mobile experience and advanced platform capabilities.

### 7.1 Mobile App

- [ ] **Progressive Web App (PWA)** — Installable, offline-capable
  - Service worker for caching
  - App manifest with splash screen
  - Push notifications
- [ ] **React Native app** (future) — Native iOS/Android
  - Offline video downloads
  - Background audio playback
  - Push notifications
  - Mobile-optimized video player

### 7.2 Live Features

- [ ] **Live classes** — Creator schedules live video sessions
  - Calendar integration
  - Live chat during session
  - Auto-recording (saved as lesson)
- [ ] **Webinars** — One-time live events
  - Registration page
  - Replay available after event

### 7.3 AI Features

- [ ] **AI course assistant** — Chatbot that answers questions about course content
- [ ] **AI-powered search** — Semantic search across all courses
- [ ] **Auto-generated quizzes** — AI creates review questions from lesson content
- [ ] **Personalized learning paths** — AI recommends next course based on history
- [ ] **AI subtitles & translation** — Auto-translate course content between languages

---

## Priority Matrix

| Phase | Impact | Effort | Priority |
|-------|--------|--------|----------|
| Phase 1: Creator Economy | Critical | High | P0 - Build first |
| Phase 2: Trust & Discovery | High | Medium | P1 - Build second |
| Phase 3: Digital Products | High | Medium | P2 |
| Phase 4: Engagement | Medium | Medium | P2 |
| Phase 5: Africa Optimizations | High | Medium | P1 - Parallel with Phase 2 |
| Phase 6: Growth Tools | Medium | High | P3 |
| Phase 7: Mobile & AI | Medium | Very High | P4 - Future |

---

## Technical Requirements

### Infrastructure Needed
- **Supabase Storage** — For course covers, digital products, creator avatars
- **Payment gateway** — Expand beyond Chariow (add Flutterwave or Paystack for wider Africa)
- **Email service** — Scale Resend, or migrate to SendGrid for volume
- **CDN** — Video delivery optimization (consider Mux or Bunny.net for adaptive streaming)
- **Background jobs** — For payout processing, email campaigns, analytics aggregation

### New Database Tables Needed
- `creator_profiles` — Bio, payout settings, social links, verification status
- `products` — Digital products (type, file_url, price, creator_id)
- `orders` — Individual purchases (user_id, product/course_id, amount, payment_ref)
- `payouts` — Creator payout records (creator_id, amount, method, status, processed_at)
- `reviews` — Course reviews (user_id, course_id, rating, text, created_at)
- `coupons` — Discount codes (code, creator_id, discount_type, amount, expires_at)
- `notifications` — In-app notification feed
- `follows` — Student-to-creator follow relationships
- `achievements` — Student badge/achievement records
- `course_qa` — Q&A threads per lesson
- `referrals` — Affiliate tracking

---

*Last updated: 2026-04-08*
