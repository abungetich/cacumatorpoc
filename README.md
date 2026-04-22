This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## SMTP Email Setup (ZeptoMail)

The app sends tenant invite emails from `POST /api/protected/settings/users` and re-invite from `POST /api/protected/settings/users/:userId/reinvite`.

Preferred setup (ZeptoMail REST API) in your local `.env`:

```bash
ZEPTO_URL=https://api.zeptomail.com/v1.1/email
ZEPTO_TOKEN="Zoho-enczapikey <your-token>"
ZEPTO_FROM_ADDRESS=noreply@waziflow.com
ZEPTO_FROM_NAME=Cacumator
```

Optional SMTP fallback:

```bash
SMTP_HOST=smtp.zeptomail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=emailapikey
SMTP_PASS=<your-smtp-password>
SMTP_FROM="Cacumator <no-reply@waziflow.com>"
```

Recommended test action:

1. Sign in as `PLATFORM_ADMIN`.
2. Go to `Settings -> Users`.
3. Click `Add User` and submit.
4. Confirm toast shows `Invite Sent` (instead of `Invite Link Copied`).
5. Check recipient inbox for the invite email.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
