# SafeBite — Community Food Sharing Platform

A food-sharing platform that connects neighbors to reduce food waste. Features AI-powered label verification, privacy-preserving fuzzy location, and Commute Relay matching that surfaces pickups along your daily route.

---

## Project Structure

```
safeBite/
├── index.html          # Landing page
├── browse.html         # Browse & claim listings
├── share.html          # Post a food listing
├── profile.html        # User profile, badges, stats
├── css/
│   └── style.css       # All shared styles (mobile-first, responsive)
├── js/
│   └── app.js          # Shared logic: mock data, badges, localStorage
└── README.md
```

---

## Frontend

### Tech Stack

| | |
|---|---|
| Language | Vanilla HTML + CSS + JavaScript (no frameworks) |
| Maps | [Leaflet.js 1.9.4](https://leafletjs.com/) + CartoDB Positron tiles |
| Fonts / Icons | System font stack + inline SVG icons |
| State | `localStorage` for badges and stats |

### Running the Frontend

No build step required. Open directly in browser:

```bash
# Option 1 — just open the file
open index.html

# Option 2 — local dev server (avoids CORS on file:// protocol)
npx serve .
# then visit http://localhost:3000
```

> **Note:** The frontend is currently a static prototype with mock data defined in `js/app.js`. No backend connection is required to run it.

### Key Frontend Features

| Feature | Implementation |
|---|---|
| AI label scan | Simulated with `simulateAIScan()` — random delay + keyword detection on filename |
| Fuzzy location | Leaflet map with ±150m random coordinate offset + privacy circle overlay |
| Commute Relay | Hardcoded `commuteMatch: true` on 2 listings; animated dashed polyline on map |
| Badge system | `localStorage`-backed stat counters; unlocks when thresholds met |
| Claimed items | Session-only array (resets on refresh — intentional for demo) |

---

## Backend (Design — Not Yet Implemented)

### Tech Stack

| | |
|---|---|
| Runtime | Python 3.11+ |
| Framework | [FastAPI](https://fastapi.tiangolo.com/) |
| Database | [PostgreSQL 15](https://www.postgresql.org/) + [PostGIS](https://postgis.net/) extension |
| Auth | JWT (phone number + OTP) |
| AI Scan | [OpenAI Vision API](https://platform.openai.com/docs/guides/vision) |
| File Storage | `BYTEA` column in PostgreSQL — no external storage service needed |

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       Client (Browser)                        │
│           index / browse / share / profile .html              │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS / REST JSON
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     FastAPI  (Python)                         │
│                                                               │
│  /auth        /listings      /scan          /commute          │
│  JWT login    CRUD + geo     Vision OCR     route match       │
│                                                               │
│  /messages    /profile                                        │
│  HTTP poll    stats + badges                                  │
└──────────┬───────────────────────────────┬───────────────────┘
           │                               │
           ▼                               ▼
┌──────────────────────┐       ┌───────────────────────┐
│  PostgreSQL           │       │  OpenAI Vision API    │
│  + PostGIS            │       │  (expiry date OCR)    │
└──────────────────────┘       └───────────────────────┘
```

### API Endpoints

```
POST   /api/auth/login              # Phone + OTP login, returns JWT

GET    /api/listings                # Nearby listings (?lat=&lng=&radius=km)
POST   /api/listings                # Create listing (photo as base64 in body)
GET    /api/listings/:id            # Single listing detail
POST   /api/listings/:id/claim      # Claim a listing
DELETE /api/listings/:id            # Remove listing (donor only)

POST   /api/scan                    # Upload photo → OCR → return expiry date

GET    /api/commute/match           # Pass origin+destination → return route listings

GET    /api/profile/me              # Stats, badges, activity history

GET    /api/messages/:listingId     # Message thread for a listing
POST   /api/messages/:listingId     # Send message
```

### Database Tables

| Table | Key Fields |
|---|---|
| `users` | id, name, phone, joined_at |
| `listings` | id, donor_id, name, category, expiry, coords (geo point), photo (binary), ai_verified, neutral_spot, status |
| `claims` | listing_id, claimer_id, accepted_terms_at |
| `messages` | listing_id, sender_id, body, created_at |
| `commute_routes` | user_id, route (geo polyline) |

### Key Backend Logic

**Fuzzy location** — exact coordinates are stored in the database but never returned directly to the client. Every API response applies a random ±200m offset to the coordinates before sending, so the donor's precise address is never exposed.

**Commute Relay matching** — when a user saves their commute route (origin + destination), the backend uses PostGIS to find all available listings within 500m of that route line. Results are flagged as route matches and surfaced in the browse feed.

**AI scan** — the client encodes the photo as base64 and sends it to `/api/scan`. The backend forwards it to OpenAI Vision API with a prompt asking it to extract the expiry date from the food label. The result (`safe` / `warn` + detected date) is returned to the client and stored against the listing as `ai_verified`.

### Running the Backend (when implemented)

```bash
# 1. Install dependencies
pip install fastapi uvicorn psycopg2-binary postgis sqlalchemy python-jose openai

# 2. Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost:5432/safebite"
export OPENAI_API_KEY="sk-..."
export JWT_SECRET="your-secret-key"

# 3. Apply database schema
psql $DATABASE_URL -f schema.sql

# 4. Start the server
uvicorn main:app --reload --port 8000

# API docs auto-generated at:
# http://localhost:8000/docs
```

---

## Privacy & Legal Design

| Concern | Approach |
|---|---|
| Exact address exposure | Only fuzzy coordinates (±200m) returned by API |
| Pickup safety | Neutral Spot suggested automatically — public locations only |
| Liability | `claims.accepted_terms_at` timestamp logged as audit trail |
| AI verification | `ai_verified` + `scan_confidence` stored per listing as evidence |

Good Samaritan Food Sharing Agreement (§ 4.2): donors are exempt from liability for unintentional harm when items are shared in good faith with AI-verified labels.

---

## Demo Walkthrough

1. **Home** — stats counter animates on load; Commute Relay route visualization
2. **Browse** → open any listing → map shows fuzzy privacy zone → tick safety checkbox → neutral spot revealed → Claim
3. **Share** → upload any photo → AI scan animation → fill form → submit → badge unlocked
4. **Profile** → CO₂ ring animates → badges show locked/unlocked state
