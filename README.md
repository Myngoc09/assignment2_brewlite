# BrewLite

Ứng dụng đặt đồ uống mobile-first/PWA: Next.js, NestJS, PostgreSQL, Prisma, Docker.

## Chạy local
Yêu cầu Docker Compose. Sao chép `.env.example` thành `.env`, chạy `docker compose up --build`; mở http://localhost:3000, API http://localhost:3001/api, health http://localhost:3001/api/health. Seed users: `customer@brewlite.local` / `BrewLite123!`, `staff@brewlite.local` / `BrewLite123!` (local only).

Nếu cổng mặc định đã được dùng, đổi `BREWLITE_WEB_PORT` và `BREWLITE_API_PORT` trong `.env` rồi mở URL theo cổng mới.

Không Docker: cần Node 20+ và PostgreSQL 16. Đặt `DATABASE_URL` và `JWT_SECRET` theo `.env.example` trong môi trường shell, rồi chạy `npm ci`, `npm run db:deploy`, `npm run db:seed`, `npm run dev`. Xem [cách chạy unit, integration và Playwright](tests/README.md). Build production bằng `npm run build`.

## Chức năng
Menu, chi tiết/size/topping, giỏ, JWT auth, tạo đơn, mock payment wallet/card, idempotency, lịch sử/trạng thái, staff status, promotions, loyalty, health. Tiền dùng số nguyên VND. Payment là mô phỏng, không xử lý dữ liệu thẻ thật.

Tồn kho theo nguyên liệu dùng công thức từng size và topping. Nhân viên có thể nhập kho, sửa công thức và xem lịch sử biến động qua API. Xem [kịch bản Thunder Client](docs/inventory-thunder-client.md) để kiểm tra số ly có thể pha trước và sau khi đặt hoặc hủy đơn.

## Demo theo đề BrewLite

1. Mở **Thực đơn**, chọn một món, chọn size S/M/L và topping. Thêm món vào giỏ, tăng/giảm số lượng hoặc xóa món để kiểm tra tổng tiền.
2. Bấm **Thanh toán**, đăng ký hoặc đăng nhập, rồi mở lại giỏ. Chọn **Ví mô phỏng** hoặc **Thẻ mô phỏng**. Nhập `BREW10` để giảm 10%.
3. Bật **Mô phỏng thất bại**, xác nhận thanh toán rồi quay về giỏ để kiểm tra các món vẫn còn nguyên. Mở **Đơn hàng** để thấy trạng thái `PAYMENT_FAILED`. Đơn chưa thanh toán có thể hủy từ lịch sử để trả lại tồn kho.
4. Quay lại thanh toán với cùng giỏ và mã ưu đãi, bỏ chọn mô phỏng lỗi rồi xác nhận. Màn hình xác nhận hiển thị mã đơn, trạng thái `PAID` và số tiền đã trả. Trong lịch sử, kiểm tra chỉ có một đơn, mở **Theo dõi đơn** để xem các mốc trạng thái và xem điểm tích lũy.

API theo đề dùng tiền tố `/api`. Gọi `POST /orders` để nhận đơn `PENDING`, rồi `POST /payments` với body `{ "orderId": "...", "method": "MOCK_WALLET" }` và header `Idempotency-Key` dài 8–128 ký tự. Gửi lại cùng khóa cho cùng đơn để kiểm tra API trả về cùng giao dịch. `GET /orders/me` trả lịch sử của tài khoản đang đăng nhập.

Để demo bước pha chế, đăng nhập bằng tài khoản nhân viên mẫu qua `POST /api/auth/login`, dùng JWT nhận được gọi `PATCH /api/orders/:id/status` lần lượt với `{"status":"PREPARING"}`, `{"status":"READY"}`, `{"status":"COMPLETED"}`. Thử chuyển thẳng từ `PAID` sang `READY` để kiểm tra lỗi HTTP 409.

## Repo
`apps/web` Next.js · `apps/api` NestJS + Prisma · `k8s/base` manifests · `k8s/overlays/prod` tag production · `k8s/argocd` Application · `.github/workflows` CI/CD · `docs` · `tests`.

## CI/CD và production
PR chạy lint, unit test, API E2E, Playwright, build và smoke test Kubernetes. Push vào `main` chạy lại CI, xuất hai image theo SHA lên GHCR, rồi cập nhật overlay trên nhánh `production`. Argo CD đồng bộ overlay vào K3s trên Oracle Cloud. Xem [hướng dẫn triển khai và rollback](docs/deployment.md).

Xem [SRS](docs/requirements/srs.md), [context](docs/requirements/context-and-scope.md), [use case](docs/requirements/use-case-checkout.md), [diagrams](docs/diagrams/README.md), [architecture](docs/architecture/architecture.md), [deployment](docs/deployment.md), [traceability](docs/traceability-matrix.md).

## HTTPS qua Cloudflare

Để truy cập bằng domain riêng khi máy cá nhân đã tắt, xem [triển khai Cloudflare Tunnel trên K3s](docs/deployment.md#dùng-domain-riêng-qua-cloudflare-trên-oracle-cloud).

BrewLite có thể chạy trên cluster Docker Desktop và phục vụ một URL HTTPS tạm qua Cloudflare Quick Tunnel. Xem [cách tạo tunnel và kiểm tra đúng bản deploy](docs/deployment.md#demo-https-từ-docker-desktop).
