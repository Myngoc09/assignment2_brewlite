# Test strategy
Run `npm test` for unit tests of the pricing functions used at checkout.

Run `npm run db:deploy` and `npm run db:seed` against a test PostgreSQL database, then `npm run test:e2e`. The HTTP tests cover catalog/detail, validation, out-of-stock rollback, registration, order creation, failed payment, successful retry, idempotency, concurrent payment attempts and status history.

Install Chromium with `npx playwright install chromium`, then run `npm run test:browser` with the same test database and JWT environment variables. Playwright starts the API and web on ports 3101 and 3100 and verifies the checkout and tracking flow in a mobile viewport.
