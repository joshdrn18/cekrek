# GGapi Cek Rekening — Cloudflare Pages + Functions + D1

Dark premium admin dashboard with a public checker. This is a starter project; it has not been deployed or tested against your GGapi account.

## Files
- `index.html`: public checker
- `admin.html`: private admin UI
- `functions/api/catalog.js`: bank/e-wallet catalog proxy
- `functions/api/check.js`: lookup proxy, D1 history, per-IP rate limits
- `functions/api/admin/*`: admin APIs
- `functions/_lib/*`: auth, GGapi, and HTTP helpers
- `schema.sql`: D1 schema

## Verified GGapi endpoints
Public GGapi product docs currently list:
- `GET https://use.ggapi.co.id/api/bank-verification/codes`
- `GET https://use.ggapi.co.id/api/bank-verification/validate?code=014&account_number=...`
- `GET https://use.ggapi.co.id/api/ewallet-verification/codes`
- `GET https://use.ggapi.co.id/api/ewallet-verification/validate?code=GOPAY&account_number=...`
- Auth header: `x-ggapi-co-id`
- Bank response fields documented: `found`, `account_name`, `account_type`.
Actual response shape may differ by account/API version. Test with your API key and inspect sanitized responses if the catalog parser needs adjustment.

## Deploy (Git integration recommended)
1. Upload these files to a new GitHub repository.
2. In Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Use the repository. Framework preset: None. Build command: leave empty. Build output directory: `/` or `.` as accepted by the dashboard; for a static-root repo, set the project root to the repository root. Ensure `functions/` is at the root beside `index.html`.
4. Create a D1 database, e.g. `ggapi-admin-db`.
5. Open D1 → Console and execute all SQL in `schema.sql`.
6. Pages project → Settings → Bindings → Add D1 database. Variable name MUST be `DB`; choose the database. Redeploy.
7. Pages project → Settings → Variables and Secrets → add encrypted secrets:
   - `GGAPI_API_KEY`: your GGapi key
   - `ADMIN_PASSWORD`: a long unique admin password (at least 16 characters)
   - `SESSION_SECRET`: a cryptographically random secret, at least 32 random bytes
   - `RATE_HASH_SECRET`: a separate random secret used to hash IP addresses (recommended)
   Add secrets to production and preview only if you intend to test preview deployments; preview credentials should be different.
8. Redeploy after setting secrets.
9. Open `/admin.html`, sign in using `ADMIN_PASSWORD`.
10. Open `/` and test one request you are authorized to check. Provider lookups may incur points/charges; GGapi documents that invalid results can still be charged.

## Generate secrets
Use a password manager for `ADMIN_PASSWORD`. For random secrets, generate 32+ bytes with a trusted password manager or local cryptographic tool. Never commit secrets to GitHub or paste them into chat.

## Important implementation notes
- Admin authentication uses an HMAC-signed, 8-hour, HttpOnly, Secure-on-HTTPS, SameSite=Strict cookie.
- Admin login has a DB-backed 5-attempt/5-minute IP rate limit.
- Public check endpoint has DB-backed per-IP minute and daily limits. This simple limiter is not a globally atomic distributed rate limiter; use Cloudflare WAF/Turnstile for stronger abuse controls.
- History stores masked account numbers, not full numbers or returned account names.
- “Managed users” currently stores admin-maintained labels and limits only. It does NOT create user login accounts or enforce per-user quotas. Those require a separate public-user authentication design.
- Service toggles disable the service on this site only, not at GGapi.
- Do not expose API keys to frontend.
- Test schema/bindings and provider response in a staging project first. This starter has not been run in your Cloudflare account.
