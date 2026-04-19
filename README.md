# FASHN VAULT X

FASHN VAULT X is a free-tier-friendly full-stack fashion web app MVP designed to run without paid services.

## Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- Persistence: local JSON store in `data/store.json`
- Deployment path: Vercel serverless-friendly structure via `api/index.js`

## Included MVP features

- User signup and login
- Editable user profiles with username, bio, and fashion interests
- Fashion post uploads with image URL or local image file conversion to base64
- Permanent ownership records for every upload:
  - unique Design ID
  - timestamp
  - creator user ID
- Pinterest-style responsive feed/grid
- Like and save interactions
- Search and filter by text, tag, style, color, and type
- Trend system with:
  - Trending Styles
  - Rising Tags
  - Most Liked Fashion Types
- Simulated ad monetization framework:
  - ad slots inserted into the feed
  - impression tracking
  - click tracking
  - revenue estimation using `impressions × 0.01`
- Brand / analytics dashboard with creator activity and ad metrics
- Admin-only brand ad placeholder uploader
- Locked premium placeholder UI for boosted posts, analytics, and creator insights

## Demo accounts

- Admin: `vault-admin` / `admin123`
- Creator: `noir.archive` / `demo123`

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Free hosting notes

### Vercel

- `api/index.js` exports the Express app.
- Static assets remain in the project root.
- Current structure is already compatible with a free-tier Vercel deployment pattern.

### Netlify

- Frontend can be hosted statically.
- The Express routes can be moved into Netlify Functions later without changing the frontend data model.

### Firebase free tier migration

- Replace `data/store.json` with Firestore collections for `users`, `posts`, `ads`, and `sessions`.
- The current API boundaries are already separated enough to migrate storage without rewriting the UI.

## Future-ready architecture

- Post records, ad records, and analytics are separated, so real ad systems can be added later.
- Simulated ad tracking can map to real CPM/CPC or sponsorship dashboards.
- Premium UI is isolated as a placeholder, which makes future upgrades additive instead of disruptive.
- Ownership metadata is already stored per fashion asset, ready for Firestore or another free-tier database when needed.
