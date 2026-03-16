# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Neon on Vercel

1. Add `DATABASE_URL` to your Vercel project environment variables.
2. Deploy the project to Vercel.
3. Visit `/api/db-test` to verify the Neon connection.

For local testing with Vercel Functions, use `vercel dev`.

## Clerk Webhook Sync

1. Add `CLERK_WEBHOOK_SIGNING_SECRET` to Vercel.
2. Point your Clerk webhook to `/api/clerk-webhook`.
3. New `user.created` events will be upserted into the `users` table in Neon.
