# Vercel Deployment Guide

This directory is configured to be deployed to Vercel as a Serverless Express application.

## Configuration Overview

- **`vercel.json`**: Configures rewrites to direct all traffic to `api/index.ts`.
- **`api/index.ts`**: The entry point for Vercel Serverless Functions. It wraps the Express app.
- **`prisma/`**: Copied from the root to ensure schema availability during build.
- **`tsconfig.json`**: Updated to include `api/` and set `rootDir` to `.` for proper compilation.
- **`package.json`**: Updated scripts to point to local `prisma` schema and new `dist` structure.

## Deployment Steps

1.  **Install Vercel CLI** (optional, or use Vercel Dashboard):
    ```bash
    npm i -g vercel
    ```

2.  **Deploy**:
    Run the following command from the `backend-migration` directory:
    ```bash
    vercel
    ```

3.  **Environment Variables**:
    Make sure to set the following environment variables in your Vercel Project Settings:
    - `DATABASE_URL`: Your PostgreSQL connection string.
    - `JWT_SECRET`: Secret for JWT signing.
    - `NODE_ENV`: `production`
    - Any other variables defined in `.env.example`.

## Directory Structure Changes

- `api/` folder added for Vercel entry point.
- `prisma/` folder copied from project root.
- `dist/` structure changed to include `src/` subfolder.

## Local Development

You can still run the app locally using:
```bash
npm run dev
```
or
```bash
npm start
```
(Note: `npm start` now points to `dist/src/server.js`)
