# GET-RISE

Privacy-focused, browser-based video metadata cleaning. Inspect hidden tags, choose what to remove, and download a cleaned copy. Processing runs locally with MediaInfo and FFmpeg WebAssembly. Videos are not uploaded to Supabase Storage by default.

This is an independent GET-RISE product. It is inspired by the idea of a browser metadata cleaner, not a copy of another brand or codebase.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, and Row Level Security
- mediainfo.js for inspection
- `@ffmpeg/ffmpeg` for local cleaning
- Vercel for deployment

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The landing page and `/clean` work without Supabase. Sign-in, dashboard, history, and profile require the environment variables below.

## Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is also accepted if your project uses that name. Do not use the service-role key in the browser or in `NEXT_PUBLIC_*` variables.

Set `NEXT_PUBLIC_SITE_URL` to your production origin, for example `https://your-app.vercel.app`.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the Project URL and anon/publishable key into `.env.local`.
3. Open SQL Editor and run `supabase/schema.sql`.
4. Authentication → URL configuration:
   - Site URL: `http://localhost:3000` locally, then your Vercel URL in production
   - Redirect URLs: `http://localhost:3000/auth/callback` and `https://your-app.vercel.app/auth/callback`
5. Enable email auth. Turn on email confirmation if you want verification before login.

The SQL file creates:

- `profiles`
- `cleaning_history`
- `user_plans`
- RLS so users can only read and write their own rows
- a signup trigger that creates a profile and Free plan
- `increment_plan_usage()` for recorded cleans

## How cleaning works

1. The file stays in browser memory.
2. MediaInfo reads container and stream tags that are actually present.
3. FFmpeg WebAssembly remuxes with stream copy (`-c copy`) and strips selected container metadata.
4. You download the cleaned file from the same page.
5. If you are signed in, GET-RISE stores a history row (name, sizes, type, removed categories). The video itself is not stored.

### Honest limits

- GPS, titles, comments, and similar container tags can be removed.
- Codec, resolution, duration, and frame rate remain so playback still works.
- Encoder traces inside compressed bitstreams may remain.
- Location cleaning uses a broader container metadata wipe because GPS is often stored in QuickTime atoms.
- Browser memory limits files to 350 MB. Supported containers: MP4, MOV, M4V, WebM, MKV, AVI.

## Vercel deployment

1. Push this repository to GitHub.
2. Import the project in Vercel. Framework preset: Next.js.
3. Add the same environment variables from `.env.example`.
4. Set `NEXT_PUBLIC_SITE_URL` to the production URL.
5. Add that URL to the Supabase auth redirect allow list.
6. Deploy.

No extra SPA rewrite is required. Next.js handles routing.

FFmpeg core is loaded from jsDelivr as blob URLs so the cleaner can run without Cross-Origin Isolation headers that would break auth popups. MediaInfo WASM is served from `/public/wasm`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Privacy

See `/privacy` in the app. Do not log uploaded file contents. Do not add a service-role key to this frontend.
