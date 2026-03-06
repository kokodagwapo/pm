# PropertyPro

A Next.js 15 property management application using the App Router (`src/app/`).

## Stack
- **Framework**: Next.js 15.5.9 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with Radix UI components
- **Database**: MongoDB via Mongoose
- **Auth**: NextAuth v5 (beta) with MongoDB adapter
- **Payments**: Stripe
- **Storage**: Cloudflare R2 / AWS S3
- **AI**: OpenAI
- **Package Manager**: npm

## Project Structure
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components
- `src/lib/` - Utility libraries
- `src/models/` - Mongoose models
- `src/hooks/` - Custom React hooks
- `src/stores/` - Zustand state stores
- `src/middleware/` - Custom middleware (audit)
- `src/scripts/` - Seed scripts
- `src/styles/` - Global styles
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions
- `src/templates/` - Email/notification templates
- `src/locales/` - i18n translations

## Running
- Dev: `npm run dev` (port 5000, bound to 0.0.0.0)
- Build: `npm run build`
- Start: `npm run start` (port 5000, bound to 0.0.0.0)

## Required Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `AUTH_SECRET` - NextAuth secret
- `NEXTAUTH_URL` - NextAuth base URL
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe
- `OPENAI_API_KEY`, `OPENAI_MODEL` - OpenAI
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_R2_PUBLIC_URL` - Cloudflare R2
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` - AWS S3
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
