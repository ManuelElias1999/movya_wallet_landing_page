# Activate the whitelist on Vercel

The page includes an English/Spanish signup form. `POST /api/whitelist` stores emails in a private Supabase table. There is no simulated success: if storage is not configured or saving fails, the form shows an error and keeps the email available for retry.

## 1. Prepare the database

Use an existing Supabase project or a dedicated project for the landing. In the SQL editor, run:

`supabase/migrations/202610150001_movya_whitelist.sql`

The migration creates only `public.movya_whitelist`; it does not change wallet tables or accounts. The table stores email, language, signup time and consent time. Its primary key deduplicates normalized email addresses. RLS is enabled, and anonymous/signed-in client roles cannot read or write subscribers.

## 2. Add the server variables in Vercel

Open **Project → Settings → Environment Variables** and add these for the environment(s) where signups should work:

| Name                  | Value                                                               |
| --------------------- | ------------------------------------------------------------------- |
| `SUPABASE_URL`        | The project's HTTPS URL, such as `https://YOUR_PROJECT.supabase.co` |
| `SUPABASE_SECRET_KEY` | A Supabase server secret key beginning with `sb_secret_`            |

Find the current secret key in the Supabase project's API-key settings. This is a server credential, not the publishable/anonymous key used in a browser or mobile app. Keep it in Vercel's environment settings; do not paste it into client code, GitHub or chat.

The static build does not read or embed these variables. The Vercel Function reads them at runtime. There is no email provider: signup saves a record but sends no automatic confirmation email.

## 3. Redeploy and verify

Redeploy the latest `main` commit, then submit a test email with consent from the deployed page. Verify the row appears under **Supabase → Table Editor → movya_whitelist**. Try the same address again: it should still be one row. Delete your test row afterward if desired.

The form preserves failed submissions for retry and does not report success for a database or network failure. The endpoint rejects cross-origin browser requests, malformed/oversized input, missing consent and the hidden bot field. It only accepts POST; there is no public subscriber-list endpoint. Existing and new signups return the same minimal result.

## Managing signups

Read or export entries through the Supabase dashboard. For a removal request, delete the matching record there. The page directs removal requests to Movya's Instagram. No subscriber admin page or messaging integration is added.

## Other hosting

`api/whitelist.js` is a Vercel Function using the Web Request/Response handler. Netlify and static-only hosts can serve the landing, but cannot process this Vercel endpoint without an equivalent backend. Do not treat a static-only upload as a working signup service.

## Development checks

```sh
npm run build
npm run check
npm test
```

The test suite exercises actual Request/Response handling and a mock database transport, plus frontend submission states. Live persistence requires the configured Supabase project and a deployed Vercel Function; automated tests do not claim to verify those credentials.
