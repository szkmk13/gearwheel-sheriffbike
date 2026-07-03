# SPA migration: frontend routing + JWT-only backend

Date: 2026-07-03

## Goal

Convert the project from a mixed Django-server-rendered + React-marketing-page setup into a clean split: the React frontend (`frontend/`) becomes a full SPA with client-side routing, and the Django backend exposes only an API (JWT auth). This covers login and the staff-facing bike workflows (`/bikes/intake`, `/bikes/intake/:id/confirm`, `/bikes/lookup`), which today are server-rendered Django views with session auth.

## Scope

In scope:
- Remove session-based login (`auth_views.LoginView`/`LogoutView`) and the server-rendered `/bikes/...` views.
- Add cookie-based JWT auth (httpOnly access + refresh cookies) to the API.
- Add `react-router-dom` to the frontend; migrate login and the three bike pages into SPA routes.
- Add missing API surface needed by the SPA: `/api/auth/me/`, `/api/auth/logout/`, `BikeViewSet.lookup` action.
- Client-side QR generation (replaces server-side `generate_qr_base64` for the confirm page).
- Nav shows staff links + logout when authenticated.

Out of scope (unchanged):
- Django admin (`/admin/`) — keeps its own login, untouched.
- Any other app's API (orders/appointments/inventory/storage) beyond reusing existing endpoints (`RepairOrder` filter by `bike`).
- Styling/visual redesign beyond what's needed to port existing forms.

## Backend changes

### Removed
- `config/urls.py`: `path('login/', ...)`, `path('logout/', ...)`, `path('bikes/', include('apps.customers.urls_web'))`.
- `apps/customers/views_web.py`, `apps/customers/urls_web.py`, `apps/customers/forms.py`.
- `templates/auth/login.html`, `templates/customers/*.html`.

### Added
- `CookieTokenObtainPairView` (extends `TokenObtainPairView`): on success, sets `access_token` and `refresh_token` as httpOnly, `Secure` (in non-DEBUG), `SameSite=Lax` cookies. Response body includes `{id, username, is_staff}` for the current user (no raw tokens in JSON body).
- `CookieTokenRefreshView` (extends `TokenRefreshView`): reads the refresh token from the `refresh_token` cookie (injects it into request data before delegating to the parent serializer), sets a new `access_token` cookie on success.
- `LogoutView` (`POST /api/auth/logout/`): deletes both cookies. No blacklist requirement — simple cookie clear is sufficient for this project's scope.
- `MeView` (`GET /api/auth/me/`): returns `{id, username, is_staff}` for the authenticated user, 401 otherwise.
- `CookieJWTAuthentication` (extends `JWTAuthentication`): falls back to reading the access token from the `access_token` cookie when no `Authorization` header is present. Registered in `DEFAULT_AUTHENTICATION_CLASSES`.
- `BikeViewSet.lookup` (`GET /api/customers/bikes/lookup/?code=sheriff-<id>-<uuid>`): parses the code the same way as the old `bike_lookup` view (split on `sheriff-` prefix, then `id`/`uuid`), returns the matching bike (with nested customer) or 404. Frontend separately calls `GET /api/orders/orders/?bike=<id>` for repair history (already supported via existing `filterset_fields`).

### Auth/CSRF notes
- No Django session is created for API auth — session middleware and CSRF checks don't apply to JWT-cookie-only requests. `SameSite=Lax` + `Secure` cookies are the CSRF mitigation; no double-submit CSRF token scheme is added (kept out of scope — single-origin deployment via `django-vite`).

## Frontend changes

### New dependencies
- `react-router-dom`
- `qrcode`

### Routing (`src/router.jsx`)
| Path | Access | Component |
|---|---|---|
| `/` | public | `HomePage` (current marketing `App` content) |
| `/login` | public | `LoginPage` |
| `/bikes/intake` | protected | `BikeIntakePage` |
| `/bikes/intake/:id/confirm` | protected | `BikeConfirmPage` |
| `/bikes/lookup` | protected | `BikeLookupPage` |
| `*` | public | simple 404 |

`main.jsx` becomes: `createRoot(...).render(<AuthProvider><RouterProvider router={router} /></AuthProvider>)`.

### Auth (`src/lib/auth.jsx`, `src/lib/api.js`)
- `AuthProvider`: on mount, calls `GET /api/auth/me/` (`credentials: 'include'`). Sets state to `unauthenticated` on 401, otherwise stores `{id, username, is_staff}`.
- `api.js`: shared fetch wrapper with `credentials: 'include'`. On a 401 from any non-`/auth/*` call, attempts one `POST /api/auth/token/refresh/`; on success retries the original request once; on failure marks `unauthenticated` and the caller redirects to `/login`.
- `ProtectedRoute`: `loading` → render nothing/spinner; `unauthenticated` → `<Navigate to="/login?next=<path>" />`; else renders the route.
- `LoginPage`: posts credentials to `/api/auth/token/`; on success, refreshes auth state and redirects to `?next=` or `/bikes/intake`.
- Logout: button in Nav calls `POST /api/auth/logout/`, clears auth state, redirects to `/`.

### Nav
- Unauthenticated: existing "Zaloguj się" button becomes `<Link to="/login">` (was a plain `<a href="/login/">`).
- Authenticated: replace with links to `/bikes/intake` ("Przyjęcie roweru"), `/bikes/lookup` ("Wyszukaj rower"), and a "Wyloguj" button.

### Bike pages
- `BikeIntakePage`: form replicating `BikeForm`/`CustomerForm` (existing-customer vs new-customer toggle). New customer: `POST /api/customers/customers/` first, then `POST /api/customers/bikes/` (multipart, with `customer` id and optional photo file). On success, `navigate('/bikes/intake/' + bike.id + '/confirm')`.
- `BikeConfirmPage`: `GET /api/customers/bikes/:id/` to get `uuid`; builds `sheriff_code = sheriff-${id}-${uuid}`; renders a QR code generated client-side via the `qrcode` package.
- `BikeLookupPage`: input for the code; `GET /api/customers/bikes/lookup/?code=...`; on success also fetches `GET /api/orders/orders/?bike=<id>` and renders the repair history list; on 404 shows an error message (mirrors current `bike_lookup.html` behavior).

## Testing plan
- Backend: tests for `CookieTokenObtainPairView`, `CookieTokenRefreshView`, `MeView`, `LogoutView`, and `BikeViewSet.lookup` (valid code, invalid code, missing code param). Confirm protected endpoints still require `IsAdminUser`.
- Frontend: manual end-to-end verification (`/verify`) after implementation — login → intake → confirm (QR renders) → lookup → logout, plus confirming that visiting `/bikes/intake` while logged out redirects to `/login`.

## Cleanup
- Delete `templates/auth/`, `templates/customers/`, `apps/customers/forms.py`, `views_web.py`, `urls_web.py` once the SPA equivalents are verified working.
- `requirements.txt`: update only if a new backend package is introduced during implementation (none currently anticipated — `djangorestframework-simplejwt` is already a dependency).
