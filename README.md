# BrewLite

Ứng dụng đặt đồ uống mobile-first/PWA: Next.js, NestJS, PostgreSQL, Prisma, Docker.

## Chạy local
Yêu cầu Docker Compose. Sao chép `.env.example` thành `.env`, chạy `docker compose up --build`; mở http://localhost:3000, API http://localhost:3001/api, health http://localhost:3001/api/health. Seed users: `customer@brewlite.local` / `BrewLite123!`, `staff@brewlite.local` / `BrewLite123!` (local only).

Không Docker: Node 20+, PostgreSQL 16, `npm install`, `npm run db:deploy`, `npm run db:seed`, `npm run dev`. Lệnh: `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`.

## Chức năng
Menu, chi tiết/size/topping, giỏ, JWT auth, tạo đơn, mock payment wallet/card, idempotency, lịch sử/trạng thái, staff status, promotions, loyalty, health. Tiền dùng số nguyên VND. Payment là mô phỏng, không xử lý dữ liệu thẻ thật.

## Repo
`apps/web` Next.js · `apps/api` NestJS + Prisma · `docs` requirements/diagrams/architecture/deployment · `tests` · `.github/workflows` CI/CD.

## CI/CD và production
PR chạy install → lint → unit → build. Push main build images gắn commit SHA, GHCR và workflow deploy smoke-check Render. Khởi tạo theo `render.yaml`; thiết lập `RENDER_DEPLOY_HOOK`, `PRODUCTION_WEB_URL`, `PRODUCTION_API_URL` và runtime secrets trong nền tảng. Production URLs chưa có cho tới khi deploy tài khoản thật. Migration dùng `prisma migrate deploy`; rollback về deployment thành công trước đó (đối chiếu commit SHA), migration tiến tương thích (không xóa DB). HTTPS do Render cấp, PostgreSQL dùng private service connection.

Xem [SRS](docs/requirements/srs.md), [context](docs/requirements/context-and-scope.md), [use case](docs/requirements/use-case-checkout.md), [diagrams](docs/diagrams/README.md), [architecture](docs/architecture/architecture.md), [deployment](docs/deployment.md), [traceability](docs/traceability-matrix.md).
