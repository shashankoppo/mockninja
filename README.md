# Mock Ninja

Independent practice platform. Not affiliated with NTA.

## Run locally

1. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Install dependencies with `npm install`.
3. Start the dev server with `npm run dev`. It listens on all interfaces at port 5173 (change with `PORT`) and accepts any host name.

## Run with Docker

1. Create `.env` as above.
2. Run `docker compose up --build`.
3. Open `http://localhost:8080`.

The Supabase values are baked into the build, so rebuild the image after changing them. Set `PORT` in `.env` to use a different host port.

## Build for any host

`npm run build` creates a static site in `dist/`. Serve it with any static host or web server that falls back to `index.html` for unknown paths.
