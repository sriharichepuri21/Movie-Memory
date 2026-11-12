# API contract

All application API responses use `Cache-Control: private, no-store, max-age=0` and `Vary: Cookie`. Identity is determined by the server-side Auth.js session. No request accepts a user ID as an ownership selector.

| Route | Input | Success | Expected failures |
| --- | --- | --- | --- |
| `GET /api/me` | Session cookie | 200 `{ user: { id, name, email, image, favoriteMovie } }` | 401 no current user; 500 infrastructure |
| `PUT /api/me/movie` | Session cookie, matching Origin, JSON `{ movie: string }` | 200 `{ movie: string }`; identical retry succeeds | 400 invalid JSON/title/extra keys; 401 no session; 403 origin; 409 already onboarded with different title; 413 body over 2,048 characters; 415 content type; 500 infrastructure |
| `GET /api/fact` | Session cookie; no query parameters | 200 `{ fact: { id, movie, text, generatedAt }, source, warning? }` | 400 selectors/query parameters; 401 no session/current user; 409 onboarding incomplete; 503 no fact and generation failed; 500 storage/transaction failure |

Dates are ISO 8601 UTC. `source` is `generated`, `cache`, or `stale`. A stale response returns its original timestamp and a user-facing warning; it never resets freshness. All application errors have `{ error: { code: string, message: string } }`. Raw provider/DB errors are never returned.

Auth.js owns `/api/auth/*` and its library-defined OAuth/session/CSRF contracts. App pages use server actions for Google sign-in and logout. The preview at `/demo` does not use the application APIs.
