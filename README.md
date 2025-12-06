# Personal Dashboard

A local web dashboard showing GitHub PRs/issues awaiting your action, plus quick-access links.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add:
   - `GITHUB_TOKEN`: Personal access token with `repo` scope
   - `GITHUB_USERNAME`: Your GitHub username

3. **Configure quick links:**

   Edit `links.yaml` to add your frequently used links.

4. **Run:**
   ```bash
   npm run dev
   ```

   Open http://localhost:5173

## Features

- PRs awaiting your review (review-requested, mentioned, assigned)
- Issues mentioning or assigned to you
- One-click quick links (configured in `links.yaml`)
- Auto-refresh every 5 minutes
- Manual refresh button

## Portability

To take this to a new job:
1. Copy the entire folder
2. Update `.env` with new GitHub token
3. Update `links.yaml` with new links
4. `npm install && npm run dev`
