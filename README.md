# IPL Playoff Predictor Frontend

React + Vite frontend for the nightly playoff snapshot.

## Live Deployment

- https://ipl-playoff-predictor-eta.vercel.app/

## Run locally

```bash
npm install
npm run dev
```

## Automatic Vercel deployment on push to main

This repo includes [`.github/workflows/vercel-deploy.yml`](.github/workflows/vercel-deploy.yml).

Set these GitHub repository secrets before the workflow can deploy:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### How to get the values

1. Install Vercel CLI locally if needed: `npm i -g vercel`
2. Run `vercel login`
3. Inside this project, run `vercel link`
4. Open `.vercel/project.json` and copy:
   - `orgId` -> `VERCEL_ORG_ID`
   - `projectId` -> `VERCEL_PROJECT_ID`
5. Create `VERCEL_TOKEN` from Vercel account settings:
   - Vercel Dashboard -> Settings -> Tokens

After secrets are added, every push to `main` triggers a production deployment automatically.
