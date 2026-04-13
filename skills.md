# PostDoseRX site ↔ app integration (agent skill)

Use this document when working on **postdoserx.com** (marketing site + serverless APIs) and how it hands users to **app.postdoserx.com** (dashboard) after **Stripe checkout** and **Google sign-in**, including **Go High Level (GHL)** contact creation.

---

## Goal

End state for a paying (or trial) user:

1. Complete Stripe checkout → land on `success.html` (or equivalent success URL from `api/create-checkout-session.js`).
2. Sign in with Google (on `success.html` or `login.html`).
3. Create/update GHL contact and Supabase user via APIs.
4. Land on **`app.postdoserx.com`** (the dashboard they subscribed to) with a session the app accepts—not back on marketing (`postdoserx.com` or `login.html`).

**Known product issue:** After Google auth and GHL contact creation, some users are sent to the **marketing site** or `login.html` instead of staying on **`app.postdoserx.com`**. That is incorrect for subscribers. Fixes may span **this repo** and the **dashboard app repo** (not necessarily present in the same workspace).

---

## Domains and responsibilities

| Surface | Role |
|--------|------|
| `postdoserx.com` | Static pages (`index.html`, `login.html`, `success.html`), Vercel serverless routes under `/api/*`, hosted `dashboard-auth.js`. |
| `app.postdoserx.com` | Dashboard UI; must accept auth from query params and/or `localStorage`, and align token expectations with the site. |

Canonical API base used by `dashboard-auth.js`: `https://postdoserx.com/api`.

---

## Critical clarification for agents (read this first)

**`postdoserx.com` is the marketing site only.** It sells the product, runs Stripe checkout, hosts `login.html`, `success.html`, and **serverless APIs** at `https://postdoserx.com/api/*`. It is **not** where subscribers live day to day.

**`app.postdoserx.com` is the subscribed product — the main dashboard.** After payment and Google sign-in, the user’s **primary destination** is always **`https://app.postdoserx.com`** (with `token`, `email`, etc. in the query string on first arrival). That URL is what they paid for; do **not** treat the marketing site as “home” or “main app” for a logged-in subscriber.

**Do not redirect subscribers to the marketing site** after successful Google auth except for intentional cases, for example:

- User clicks **Logout** → typically `https://postdoserx.com` or `/` is fine.
- User must **complete purchase** or **recover account** → marketing or `login.html` is appropriate.

**Anti-patterns to avoid:**

- Sending the user to `https://postdoserx.com`, `https://postdoserx.com/`, or marketing pages **immediately after** a successful Google sign-in or post-checkout flow.
- Using `window.location` / router default route to the apex domain when the user should remain on **`app.postdoserx.com`**.
- Assuming “canonical app URL” or “primary domain” means `postdoserx.com` for **authenticated dashboard** users — for them it means **`app.postdoserx.com`**.

**API vs UI:** Backend calls may correctly use `https://postdoserx.com/api/...` from the browser; that does **not** mean the **browser window** should navigate to `postdoserx.com`.

---

## User journeys (implementations to keep in sync)

### A. Primary post-checkout path — `success.html`

After Stripe, users hit `success.html` (see `api/create-checkout-session.js` `success_url`).

Flow in `success.html` (inline script):

1. Google Identity Services → `handleGoogleSignUp`.
2. `POST /api/ghl-integration` with `action: 'create_contact'`, `email`, `name`, `tier`.
3. `POST /api/auth/login` with `email`, `googleId`, `name`, `tier`, `ghlContactId` (optional).
4. On success: redirect to  
   `https://app.postdoserx.com?token=<JWT>&email=...&name=...&tier=...&new=true&userId=<uuid>`  
   using the **JWT** from `authResult.data.token`.
5. On auth API failure: fallback token via `generateSimpleAuthToken(...)` (still query-based redirect).

**GHL response shape mismatch (important):**  
`api/ghl-integration.js` returns `{ success, contact, message }` for `create_contact`, where `contact` is the raw GHL JSON. Frontends currently read `ghlResult.contactId`, which is often **undefined**. Auth still works without it, but `ghlContactId` may not be persisted to Supabase until fixed (use `ghlResult.contact?.id` or add `contactId` to the API response).

### B. Manual / alternate path — `login.html?post-checkout=true`

`success.html` links here: “complete setup manually.”

Flow in `login.html` → `handleGoogleSignIn`:

1. Reads `post-checkout`, `tier` from query string.
2. If `isPostCheckout || isSignup`, calls same GHL `create_contact` path.
3. **Then diverges from `success.html`:** it builds a **client-only** `quickToken` with `btoa(JSON.stringify({ email, name, tier, timestamp }))` and redirects **without** calling `/api/auth/login`.

So the dashboard receives either:

- A **server JWT** (from `success.html` or email login), or  
- A **base64 JSON blob** (from `login.html` Google flow).

If `app.postdoserx.com` or middleware only accepts JWTs for `/api/auth/me` or bootstraps “real” user id from JWT, the base64 token path will fail validation and code may send the user back to `login.html`.

**Alignment rule for agents:** Prefer **one** post-auth contract: always call `/api/auth/login` after Google on `login.html` (mirror `success.html`), pass `ghlContactId` when available, and redirect with the returned JWT and `user.id` as `userId`.

### C. Email sign-in on `login.html`

`POST /api/auth/login` with email only (default tier `trial`), then redirect with JWT—this path is already consistent with `AUTHENTICATION_SETUP.md`.

---

## Key files in this repo

| File | Purpose |
|------|---------|
| `success.html` | Post-Stripe Google signup; GHL + `/api/auth/login`; redirect to app. |
| `login.html` | Returning users + `?post-checkout=true` manual flow; Google and email login. |
| `dashboard-auth.js` | Loaded by dashboard; reads `token` + `email` from URL or `localStorage`; optional `validateToken()` against `GET /api/auth/me`. |
| `api/auth/login.js` | Creates/updates Supabase user, returns JWT + user payload. |
| `api/ghl-integration.js` | GHL contact create/validate/upgrade. |
| `api/create-checkout-session.js` | Stripe `success_url` → `success.html`. |
| `AUTHENTICATION_SETUP.md` | Schema and endpoint reference (keep behavior in sync when changing APIs). |

---

## Dashboard auth behavior (`dashboard-auth.js`)

Critical details for debugging “bounced back to login”:

1. **First paint:** If URL has both `token` and `email`, auth is considered OK and `sessionStorage.prevent_auth_redirect` is set to reduce loops.
2. **`cleanURL()`** removes `token`, `email`, `name`, `tier`, `new` from the address bar after ~2s—it does **not** remove `userId` (harmless).
3. **No URL token:** Falls back to `localStorage.auth_token`; may call `validateToken()` → `GET https://postdoserx.com/api/auth/me` with `Authorization: Bearer <token>`.
4. **`redirectToLogin()`** runs when there is no token/email and no usable stored token **and** `prevent_auth_redirect` is not set—clears token and sends user to `https://postdoserx.com/login.html?redirect=...`.

**Implications:**

- A **non-JWT** string in `localStorage` as `auth_token` will fail `/auth/me` on later visits; depending on app code, that may still surface as “logged out” or redirects.
- SPAs that **strip query params before** `initializeDashboardAuth()` runs will look unauthenticated unless the app preserves token/email another way.
- Any **dashboard-only** code that always requires JWT validation success before rendering the main UI can recreate the login bounce even when URL params were valid on the first request.

### Loading `dashboard-auth.js` from `app.postdoserx.com` (Claude diagnosis, confirmed in repo)

A **relative** script URL (`src="/dashboard-auth.js"`) resolves to **`https://app.postdoserx.com/dashboard-auth.js`**. If the app subdomain uses **another** server or project that does not ship this file, the script **404s**. The inline fallback in `index.html` then runs, but any **server-side or edge redirect** (or a **different HTML shell** that never includes this logic) can send users to **login before** that fallback executes.

**Fix in this repo:** The `app.postdoserx.com` branch in `index.html` loads  
`https://postdoserx.com/dashboard-auth.js`  
so the script always comes from the marketing deployment (where `vercel.json` also sets headers for that path). Use the same absolute URL in any other dashboard HTML.

**If redirects still happen with no JS errors:** Check whether `app.postdoserx.com` actually serves **this** `index.html` dashboard shell. If DNS points the subdomain at a different product (e.g. another SPA), that stack needs the same absolute script URL—or equivalent inline auth bootstrap—and must not redirect unauthenticated users to marketing login before reading `token` and `email` from the query string.

---

## `login.html` Google handler — variable order (TDZ)

Previously, `handleGoogleSignIn` logged `{ isPostCheckout, isSignup, tier }` **before** those `const` bindings, causing a **ReferenceError** and trapping users on the login page with “Authentication failed.” **This ordering is fixed in-repo:** parse `urlParams` first, then log context.

If similar code is copied elsewhere, always define URL-derived flags before any `console.log` that references them.

---

## Environment and secrets

Server-side env vars are documented in `AUTHENTICATION_SETUP.md` (`SUPABASE_*`, `JWT_SECRET`, `STRIPE_*`, `GHL_*`, `GOOGLE_CLIENT_ID`, `CORS_ORIGINS`).

**Security note:** `login.html` still contains a **direct GHL API key** inside `verifyGHLCustomer` (used for client-side listing). That is a credential leak risk; long-term, all GHL access should go through `/api/*` only. Agents should not copy that pattern into new code.

---

## Debugging checklist (redirect to `login.html` after Google + GHL)

1. **Browser console on `login.html`:** Any `ReferenceError` in `handleGoogleSignIn`? Fix ordering first.
2. **Network:** Does `POST /api/auth/login` run on the path the user took? Compare `success.html` vs `login.html`.
3. **Redirect URL:** Does it include both `token` and `email`? Are values URL-encoded correctly?
4. **On app:** Does `initializeDashboardAuth()` run on the initial HTML load before the router strips the query string?
5. **Stored token:** After `cleanURL()`, does something on the app clear `localStorage` or use a different key than `auth_token`?
6. **`GET /api/auth/me`:** With the token from the redirect, does it return 200? If 401, the app may push users to login—align token type (JWT from `/api/auth/login`) or relax client validation per product rules.
7. **GHL:** Confirm `create_contact` response handling if `ghlContactId` must be non-null in Supabase.
8. **Script load:** On the app host, does `dashboard-auth.js` return **200** from `https://postdoserx.com/dashboard-auth.js`? If you still see a request to `app.postdoserx.com/dashboard-auth.js`, find and replace with the absolute URL.

---

## API contracts (minimal)

### `POST /api/auth/login`

Body: `email` (required), optional `googleId`, `name`, `tier`, `ghlContactId`, `stripeCustomerId`.  
Returns: `{ success, data: { user, token } }` with JWT suitable for `Authorization: Bearer`.

### `POST /api/ghl-integration`

Body: `action`, `email`, optional `name`, `tier`, `phone`.  
For `create_contact`, response includes `contact` (GHL-shaped); clients should not rely on a top-level `contactId` unless the API is updated to add it.

---

## Out of scope for this repo

- **Dashboard routes, layout, and personalized home** live on **app.postdoserx.com**—if users authenticate successfully in network tab but still see `login.html`, inspect that codebase for auth guards, `redirectToLogin`, OAuth return URLs, and timing of `initializeDashboardAuth()`.

---

## Suggested end state (single story)

1. Google success on **both** `success.html` and `login.html` → `POST /api/auth/login` with `googleId`, `tier`, and `ghlContactId` from `contact.id` when present.  
2. Single redirect shape: JWT in `token`, real `user.id` in `userId`, `email`, `name`, `tier`.  
3. Dashboard trusts first-load URL pair (`token` + `email`), persists JWT, and uses `/api/auth/me` when appropriate without sending users back to marketing login unless the session is truly invalid.

When you change this flow, update `AUTHENTICATION_SETUP.md` if behavior or env vars change.
