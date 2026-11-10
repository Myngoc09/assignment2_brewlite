# 3.1 Kiến trúc

## Phân lớp / C4 container
- Presentation: Next.js App Router mobile-first/PWA, same-origin `/api` proxy tới runtime `API_SERVER_URL`.
- Application/domain: NestJS auth, catalog, checkout/payment/orders/health; validation DTO, JWT.
- Persistence: PostgreSQL, Prisma schema/migration/transaction.
- Payment adapter: mock wallet/card, không nhận dữ liệu thẻ.
- Operations: Docker, Compose, GitHub Actions, GHCR, Argo CD, K3s trên Oracle Cloud, stdout logs, health endpoint.

```mermaid
flowchart LR
 B[Browser/PWA] --> W[Next.js]
 W -->|HTTP nội bộ + JWT| A[NestJS API]
 A --> DB[(PostgreSQL / Prisma)]
 A --> P[Mock payment]
 CI[GitHub Actions] --> R[GHCR SHA images]
 CI -->|cập nhật tag SHA| G[Nhánh production]
 G --> CD[Argo CD]
 CD --> K[K3s trên OCI]
 R -->|Kubernetes pull image| K
 K --> W
 K --> A
```

## Lý do và trade-off
Monorepo đồng bộ code/docs, nhưng dependency graph lớn dần. NestJS REST dễ kiểm tra, cần chia module khi domain mở rộng. PostgreSQL transaction hỗ trợ atomic checkout, nhưng tải cạnh tranh cao cần row locking/conditional decrement. Payment mock tái lập, không thu tiền. Argo CD triển khai image đã phát hành lên GHCR. K3s một node dùng PVC cục bộ cho PostgreSQL, nên cần sao lưu ra ngoài VM.

Cấu hình runtime bằng env; secret không commit. CORS giới hạn `WEB_ORIGIN`; `/api/health` kiểm tra DB; stdout logs, không ghi token/payment. ADR: [monorepo](adr/001-monorepo.md), [database](adr/002-postgresql-prisma.md), [payment](adr/003-mock-payment.md), [deploy](adr/004-gitops-deployment.md).
