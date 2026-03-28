# Contributing to Foodchestra

This document describes conventions enforced in this monorepo and explains which tool checks each one.

---

## TypeScript conventions

### No `any` types
Use explicit types everywhere. If a type is genuinely unknown, use `unknown` and narrow before use.
**Enforced by:** `@typescript-eslint/no-explicit-any: error`

### No magic numbers
Extract numeric literals to named constants with descriptive names. Place them at the top of the file or in a shared constants module.
```ts
// Bad
setInterval(check, 5000);

// Good
const HEALTH_POLL_INTERVAL_MS = 5_000;
setInterval(check, HEALTH_POLL_INTERVAL_MS);
```
**Enforced by:** `no-magic-numbers: warn` (disabled in test files)
Exceptions: `0`, `1`, `-1`, `2`, `10`, and HTTP status codes (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `500`, `502`, `503`) are ignored.

### Type-only imports
Use `import type` for any import that is only referenced as a type.
```ts
// Bad
import { Request, Response } from 'express';

// Good
import type { Request, Response } from 'express';
import { Router } from 'express';
```
**Enforced by:** `@typescript-eslint/consistent-type-imports: error`

### Strict equality
Always use `===` and `!==`. Never use `==` or `!=`.
**Enforced by:** `eqeqeq: error`

### Environment variable fallbacks
Use `||` not `??` for env var fallbacks. `??` does not catch empty-string values set in `.env`.
```ts
// Bad — empty string in .env would silently pass through
const url = process.env['API_URL'] ?? 'http://localhost:3000';

// Good
const url = process.env['API_URL'] || 'http://localhost:3000';
```

---

## Backend conventions

### Every async route handler must have a try/catch
Unhandled promise rejections in Express swallow the error and leave the request hanging. Always wrap DB and service calls.
```ts
router.get('/:id', async (req, res) => {
  try {
    const row = await repository.findById(req.params.id);
    if (!row) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(row);
  } catch (err) {
    console.error('Failed:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});
```

### Thin routers — business logic belongs in services
Routers validate input, call a service, and map the result to an HTTP response. They do not query the database or call external APIs directly.

| Layer | Responsibility |
|---|---|
| `src/routers/` | Parse request, validate, call service, respond |
| `src/services/` | Business logic, external API calls, orchestration |
| `src/repositories/` | All SQL queries, DB row → typed object mapping |

### New route group checklist
1. Create `src/routers/<name>.router.ts` with `@openapi` JSDoc on every endpoint
2. Create `src/services/<name>.service.ts` if business logic is non-trivial
3. Create `src/repositories/<name>.repository.ts` for DB access
4. Mount the router in `src/app.ts`
5. Add SDK route wrapper in `sdk/src/routes/<name>.ts` and wire into `createClient`
6. Add MCP tool in `mcp/src/tools/<name>.ts` and register in `mcp/src/index.ts`
7. Write tests in `backend/src/__tests__/<name>.router.test.ts`

---

## SDK conventions

### All response-side types use camelCase field names
DB columns are snake_case; SDK types exposed to consumers are camelCase. The repository layer performs the mapping.
```ts
// Bad — leaks DB naming to consumers
interface Batch { product_barcode: string; batch_number: string; }

// Good
interface Batch { productBarcode: string; batchNumber: string; }
```

### No auto-generation
The SDK is hand-written to keep it minimal and auditable. Sync it manually whenever a route is added or changed.

---

## SCSS conventions

### Use `@use`, not `@import`
`@import` is deprecated in Dart Sass. Use `@use` with an explicit namespace alias for all project-owned Sass files. `@import` is permitted only for third-party CSS files (Bootstrap, Leaflet, Material Icons) because `@use` does not support plain CSS.
```scss
// Bad
@import '../styles/variables/colours';

// Good
@use '../styles/variables/colours' as colours;
@use '../styles/variables/breakpoints' as bp;
```

Variable and mixin references must use the namespace:
```scss
// Bad
color: $colour-primary;
@include respond-up(md) { ... }

// Good
color: colours.$colour-primary;
@include bp.respond-up(md) { ... }
```
**Enforced by:** Stylelint (`scss/at-rule-no-unknown`)

### No magic colour values
All colour hex values must be SCSS variables from `frontend/src/styles/variables/_colours.scss`. Add new variables there before using them.
**Enforced by:** Stylelint (`color-no-invalid-hex`, manual review)

### No inline styles in components
Use SCSS classes for all styling. The only documented exception is Leaflet's `MapContainer`, which requires an inline `style={{ height, width }}` due to how Leaflet initialises the map DOM.
**Enforced by:** Stylelint (`declaration-property-value-disallowed-list` where applicable)

### Mobile-first breakpoints
Use the `respond-up()` mixin from `_breakpoints.scss` for all responsive rules. Start with the mobile layout and add overrides at larger breakpoints.
```scss
.component {
  font-size: 0.875rem; // mobile default

  @include bp.respond-up(md) {
    font-size: 1rem;
  }
}
```

---

## Testing conventions

### Backend
- Framework: Jest + ts-jest + supertest
- Mount the router under test on a bare `express()` app — do not start the full server
- Mock the repository layer with `jest.mock()` — never hit a real database
- Test files live in `backend/src/__tests__/`
- Name pattern: `<name>.router.test.ts`, `<name>.service.test.ts`

```ts
jest.mock('../repositories/my.repository');
const mockFind = MyRepository.find as jest.MockedFunction<typeof MyRepository.find>;

const app = express();
app.use('/items', myRouter);

it('returns 200', async () => {
  mockFind.mockResolvedValueOnce([{ id: '1' }]);
  const res = await request(app).get('/items');
  expect(res.status).toBe(200);
});
```

### Frontend
- Framework: Vitest + jsdom + `@testing-library/react`
- Mock all SDK calls with `vi.mock('@foodchestra/sdk', ...)`
- Wrap components that use router hooks in `MemoryRouter + Routes`
- Use `vi.hoisted()` when a mock must be created before module imports (e.g. class constructor mocks)
- Test files live in `frontend/src/__tests__/`

```tsx
vi.mock('@foodchestra/sdk', () => ({
  client: { products: { getByBarcode: vi.fn() } },
}));
```

### Coverage
Coverage reports are generated on every CI run. There is no enforced minimum threshold — the reports are for awareness, not gates.

### What is not tested
- `sdk/` — covered implicitly by backend tests via mocks
- `mcp/` — thin wrappers over the SDK
- `agent/` — LangGraph orchestration, tested via integration if needed
