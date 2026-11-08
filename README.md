# BrewLite

Ứng dụng đặt đồ uống mobile-first/PWA: Next.js, NestJS, PostgreSQL, Prisma, Docker.

## Chạy local
Yêu cầu Docker Compose. Sao chép `.env.example` thành `.env`, chạy `docker compose up --build`; mở http://localhost:3000, API http://localhost:3001/api, health http://localhost:3001/api/health. Seed users: `customer@brewlite.local` / `BrewLite123!`, `staff@brewlite.local` / `BrewLite123!` (local only).

Nếu cổng mặc định đã được dùng, đổi `BREWLITE_WEB_PORT` và `BREWLITE_API_PORT` trong `.env` rồi mở URL theo cổng mới.

Không Docker: cần Node 20+ và PostgreSQL 16. Đặt `DATABASE_URL` và `JWT_SECRET` theo `.env.example` trong môi trường shell, rồi chạy `npm ci`, `npm run db:deploy`, `npm run db:seed`, `npm run dev`. Xem [cách chạy unit, integration và Playwright](tests/README.md). Build production bằng `npm run build`.

## Chức năng
Menu, chi tiết/size/topping, giỏ, JWT auth, tạo đơn, mock payment wallet/card, idempotency, lịch sử/trạng thái, staff status, promotions, loyalty, health. Tiền dùng số nguyên VND. Payment là mô phỏng, không xử lý dữ liệu thẻ thật.

## Repo
`apps/web` Next.js · `apps/api` NestJS + Prisma · `docs` requirements/diagrams/architecture/deployment · `tests` · `.github/workflows` CI/CD.

## CI/CD và production
PR chạy install, lint, unit, kiểm thử luồng HTTP trên PostgreSQL và build. Push main đóng gói image gắn commit SHA lên GHCR rồi triển khai cùng SHA lên Render. Workflow đợi cả API và web hoạt động trước khi smoke test. Xem [cấu hình production, release và rollback](docs/deployment.md). PostgreSQL dùng kết nối nội bộ, migration chạy trước khi API nhận traffic.

Xem [SRS](docs/requirements/srs.md), [context](docs/requirements/context-and-scope.md), [use case](docs/requirements/use-case-checkout.md), [diagrams](docs/diagrams/README.md), [architecture](docs/architecture/architecture.md), [deployment](docs/deployment.md), [traceability](docs/traceability-matrix.md).
