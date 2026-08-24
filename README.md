# 🍽️ Mise en Place — Recipe & Meal Planner

A full-stack recipe management app built with Next.js 14 and Vercel Postgres.

Accounts are per cook. Guests can browse public recipes. Planner, shopping lists, settings, ratings, and notes require sign-in. Sessions are stored in Postgres (they survive a process restart).

If `/api/setup` runs against an empty users table, it creates one moderator from `BOOTSTRAP_OWNER_LOGIN` and `BOOTSTRAP_OWNER_PASSWORD`. After that, that account is a normal user — password changes happen in Settings. Do not commit those values.

## Features

- **Recipe Library** — Save recipes manually or import from any recipe website via URL scraping (supports JSON-LD schema, AllRecipes, BBC Good Food, Serious Eats, and more)
- **Recipe Editor** — Full CRUD with ingredients (amount/unit/name), step-by-step instructions, tags, timing, and images
- **Weekly Meal Planner** — Assign recipes to any day of the week with meal type and serving count
- **Smart Shopping List** — Auto-generates a consolidated, alphabetised shopping list from your weekly plan, aggregating quantities across recipes with unit conversion (cups→ml, oz→g, etc.)
- **Print & Copy** — Print your shopping list or copy to clipboard

## Tech Stack

- **Framework**: Next.js 14 App Router
- **Database**: Vercel Postgres (via `@vercel/postgres`)
- **Scraping**: Cheerio (JSON-LD schema + heuristic fallback)
- **Deployment**: Vercel

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo>
cd recipe-app
npm install
```

### 2. Create a Vercel Postgres database

1. Go to [vercel.com](https://vercel.com) → your project → **Storage** tab
2. Click **Create Database** → **Postgres**
3. Name it (e.g. `recipes-db`) and click Create
4. Go to the database → **Settings** → **.env.local** tab
5. Copy all the environment variables

### 3. Set up local environment

```bash
cp .env.local.example .env.local
# Paste your Vercel Postgres credentials into .env.local
```

### 4. Initialise the database

Visit this URL once. If no users exist yet, set `BOOTSTRAP_OWNER_LOGIN` and `BOOTSTRAP_OWNER_PASSWORD` on this same host first:
```
http://localhost:3000/api/setup
```

That creates kitchen tables and, when needed, the first moderator. Sign in with that login. Existing accounts are left as they are.

`npm run db:setup` only creates the older recipe/planner tables and does **not** create users. Prefer `/api/setup`.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Link your Postgres database to the project in the Vercel dashboard
# under Project → Storage → Connect Database
```

After deploying, visit `https://your-app.vercel.app/api/setup` once to create the database tables. Only set `BOOTSTRAP_OWNER_LOGIN` and `BOOTSTRAP_OWNER_PASSWORD` if no users exist yet.

---

## Project Structure

```
recipe-app/
├── app/
│   ├── api/
│   │   ├── recipes/         # GET all, POST new
│   │   │   └── [id]/        # GET, PUT, DELETE by ID
│   │   ├── scrape/          # POST — scrape recipe from URL
│   │   ├── planner/         # GET, POST, DELETE meal plans
│   │   ├── shopping-list/   # GET consolidated shopping list
│   │   └── setup/           # GET — initialise database tables
│   ├── recipes/             # Recipe library page
│   ├── planner/             # Weekly meal planner page
│   ├── shopping-list/       # Shopping list page
│   ├── globals.css          # All styles (editorial magazine aesthetic)
│   └── layout.tsx
├── components/
│   ├── Sidebar.tsx
│   └── Toast.tsx
├── lib/
│   ├── db.ts                # All database queries
│   ├── scraper.ts           # Recipe URL scraper
│   └── shopping.ts          # Shopping list aggregation logic
└── scripts/
    └── setup-db.js          # Database initialisation script
```

---

## Scraper Support

The scraper uses **JSON-LD schema.org/Recipe** markup first, which most major recipe sites include. Falls back to CSS heuristics for sites without structured data.

Tested with:
- AllRecipes
- BBC Good Food
- Serious Eats
- NYT Cooking
- Taste.com.au
- Delicious.com.au
- RecipeTin Eats
- Bon Appétit

---

## Shopping List Logic

Quantities are aggregated per ingredient (normalized by name) and converted to consistent units:

- Volume: tsp → tbsp → cups → ml → L
- Weight: oz → lb → g → kg
- Counts: kept as-is (e.g. "3 eggs")

Servings are scaled automatically based on the servings you set in the meal planner.
