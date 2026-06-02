# W2 — Cookie `firebase-token` HttpOnly via route handler

**Date :** 2026-06-02
**Auteur :** sprint sécu transverse
**Statut :** ANALYSE — non implémenté

## 1. État actuel

Le cookie `firebase-token` est posé côté client via `document.cookie` dans 5 endroits (web + admin) :

- `apps/web/app/(auth)/connexion/page.tsx:77` — après `signInWithEmailAndPassword` ou `signInWithPopup` (helper `primeAuthCookie`).
- `apps/web/app/(auth)/inscription/page.tsx:110` — après `createUserWithEmailAndPassword`.
- `apps/web/app/(auth)/inscription/page.tsx:169` — après le flow Google.
- `apps/web/components/auth-provider.tsx:69` — refresh dans le listener `onIdTokenChanged`.
- `apps/admin/app/(auth)/connexion/page.tsx:110` — après le sync backend admin.
- `apps/admin/components/auth-provider.tsx:37` — refresh côté admin.

Le cookie est ensuite lu par les middlewares Next (`apps/web/middleware.ts`, `apps/admin/middleware.ts`) pour décider la redirection des routes protégées. Les `max-age=3600` + `SameSite=Strict` sont en place, mais **`HttpOnly` est impossible depuis JS** (par définition `document.cookie` ne peut pas le poser). Le token JWT Firebase reste donc lisible par tout script tiers — risque XSS critique en cas d'injection (publicité, lib npm compromise, etc.).

## 2. Approche proposée — route handler `/api/auth/session`

Créer une route Next dans chaque app :

```
apps/web/app/api/auth/session/route.ts
apps/admin/app/api/auth/session/route.ts
```

Le client appelle ce handler en POST avec `{ idToken }` dans le body juste après chaque sign-in (et chaque refresh `onIdTokenChanged`). Le handler répond `Set-Cookie: firebase-token=<idToken>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`. Le logout appelle `DELETE /api/auth/session` qui pose un cookie expirée. Le middleware continue de lire le cookie comme avant (zéro change), mais le JS de la page ne peut plus le lire.

Le helper `primeAuthCookie` devient :

```ts
async function primeAuthCookie(cred: UserCredential) {
  const token = await cred.user.getIdToken();
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });
}
```

## 3. Trade-offs

**Pour :**
- Le cookie devient inaccessible au JS — un script injecté ne peut plus exfiltrer le JWT.
- `Secure` + `SameSite=Lax` posables (vs. `Strict` actuel qui casse les redirections cross-site légitimes type Google OAuth).
- Centralise la pose du cookie en 1 endroit → plus simple à auditer.

**Contre :**
- **Le token doit toujours être envoyé au backend NestJS** (en `Authorization: Bearer ...`) pour chaque appel API — le cookie HttpOnly ne sert qu'au middleware Next, pas aux fetch côté client. Il faut donc **garder le token en mémoire JS** (state React, ou `auth.currentUser.getIdToken()`). Le cookie HttpOnly seul ne suffit pas pour migrer vers un modèle 100% server-side.
- Round-trip réseau supplémentaire à chaque sign-in et chaque refresh de token (60 min par défaut). En pratique faible (~50ms sur Vercel edge).
- Race condition à gérer : il faut que le `Set-Cookie` ait été appliqué par le navigateur avant le `router.push` qui déclenche le middleware (déjà géré aujourd'hui dans `primeAuthCookie` — le pattern reste identique).
- Le refresh dans `onIdTokenChanged` (toutes les ~55 min) déclenche un fetch supplémentaire — négligeable.

## 4. Complexité estimée

**Scope d'1 PR :** environ 10-12 fichiers touchés.

- 2 route handlers à créer (`apps/web/app/api/auth/session/route.ts` + `apps/admin/app/api/auth/session/route.ts`).
- 2 helpers partagés `primeAuthCookie` (un par app dans `lib/`) pour DRY.
- 6 call sites à migrer (les 5 listés + le sidebar admin pour le logout).
- Tests manuels : login, refresh, logout, expiration, navigation cross-tab.
- Pas de migration de schéma, pas de change backend.

**Risque principal :** introduire une régression sur LIL-97 (race condition middleware) — la PR doit explicitement attendre la résolution du `fetch('/api/auth/session')` avant `router.push`.

## 5. Alternative — Firebase Session Cookies (Admin SDK)

Firebase propose nativement les [session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies) :

- Le client envoie son ID token au backend.
- Le backend (Admin SDK) appelle `createSessionCookie(idToken, { expiresIn })` → retourne un cookie opaque à durée de vie 5-14 jours (vs. 1h pour le JWT).
- Le backend pose ce cookie en `HttpOnly; Secure; SameSite=Lax`.
- À chaque requête protégée, le backend vérifie via `verifySessionCookie(cookie)`.

**Avantages vs. l'approche route handler :**
- Le cookie n'est plus un JWT révocable seulement après 1h — révocation immédiate possible via `revokeRefreshTokens` côté Admin SDK.
- Durée de vie longue (jusqu'à 14 jours) → moins de refresh, meilleure UX mobile.
- C'est le pattern recommandé par Firebase pour les apps web avec SSR (cas Next.js exactement).

**Inconvénients :**
- Nécessite Firebase Admin SDK côté backend NestJS (déjà présent — `apps/api/src/auth/auth.module.ts`) et un nouvel endpoint `POST /auth/session` qui retourne le cookie. **Scope dépasse le périmètre web seul** — toucher au backend pour ça vaut une PR séparée coordonnée avec l'API.
- Le middleware Next ne peut plus juste lire un JWT et le décoder localement — il faut soit déléguer la vérif au backend (overhead par requête), soit faire confiance à la signature du cookie + vérif à l'usage seulement. Pattern à valider.

## 6. Recommandation

**Court terme (sprint actuel) :** ne pas faire — le coût de la PR est modéré (~1 jour) mais le risque LIL-97 est non négligeable, et la valeur sécu est partielle (le JWT reste en mémoire JS, donc une XSS sophistiquée peut toujours appeler `getIdToken()` directement via la SDK Firebase déjà loadée).

**Moyen terme (prochain sprint) :** investiguer l'option Firebase Session Cookies en coordination avec l'équipe backend. C'est l'approche idiomatique pour Next.js + Firebase, et elle résout aussi le problème de durée de vie (1h actuellement → 7-14 jours possibles), ce qui améliore l'UX mobile au passage.

**Tracker :** créer un ticket Linear LIL-XXX `[Sécu] Migrer auth cookie vers Firebase Session Cookies` avec ce doc en référence.
