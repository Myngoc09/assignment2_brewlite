# Test strategy
Run `npm test` for unit tests of the pricing functions used at checkout.

Run `npm run db:deploy` and `npm run db:seed` against a test PostgreSQL database, then `npm run test:e2e`. The HTTP tests cover catalog/detail, validation, registration, promotion and loyalty, payment failure and retry, idempotency, concurrent payment, concurrent ordering of the last unit, stock restoration on cancellation, and valid and invalid order transitions.

Install Chromium with `npx playwright install chromium`, then run `npm run test:browser` with the same test database and JWT environment variables. On Windows, you can set `$env:PLAYWRIGHT_CHANNEL = 'msedge'` to use an installed Microsoft Edge. Playwright starts the API and web on ports 3101 and 3100 and verifies cart retention after a failed payment, retry, confirmation, and order history in a mobile viewport.
