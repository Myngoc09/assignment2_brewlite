# Traceability matrix
| ID | Use case/story | Design | Code/API | Check |
|---|---|---|---|---|
| FR-01 | UC-01 menu | Activity, Product | GET /api/products | app.e2e-spec, checkout.spec |
| FR-02 | UC-02 details | ProductSize/Topping | GET /api/products/:id | app.e2e-spec, checkout.spec |
| FR-03 | UC-04 cart | Activity | Next cart, order-pricing | orders.service.spec, checkout.spec |
| FR-04 | UC-03 auth | Sequence/JWT | POST auth/register, login | validation/hash |
| FR-05 | UC-04 order | Sequence/Class | POST /api/orders | app.e2e-spec, checkout.spec |
| FR-06 | UC-04 payment | Sequence alt | POST /api/orders/:id/pay | app.e2e-spec, checkout.spec |
| FR-07 | UC-05 history | User-Order, OrderStatusHistory | GET /api/orders/mine, /:id | app.e2e-spec, checkout.spec |
| FR-08 | UC-06 status | OrderStatus, OrderStatusHistory | PATCH /api/orders/:id/status | app.e2e-spec |
| FR-09 | UC-04 promotion | Promotion | POST orders | active/expiry |
| FR-10 | UC-05 loyalty | LoyaltyTransaction | Payment success | earn record |
| FR-11 | UC-07 quản lý menu | Ngoài MVP | Dữ liệu catalog từ seed | kiểm tra phạm vi SRS |
| NFR-02 | All | ADR/security | JWT, bcrypt, validation, CORS | auth/role checks |
| NFR-03 | Ops | Deployment | GET /api/health | DB check |
| NFR-01 | UC-01 menu | Architecture | GET /api/products | đo thời gian phản hồi local |
| NFR-04 | UC-01, UC-04 | PWA/mobile | manifest, service worker, Next.js | checkout.spec, kiểm tra manifest |
| NFR-05 | UC-04 | Sequence/Class | Prisma transaction, integer VND | app.e2e-spec, orders.service.spec |
| NFR-06 | Delivery | Deployment/ADR | Prisma migrate/seed, Compose | khởi tạo DB trống và Compose health |
| NFR-07 | Delivery | Deployment/ADR | GitHub Actions, GHCR, Argo CD | quality gate, SHA, Kubernetes smoke |
| NFR-08 | UC-04 | Mock payment ADR | PayDto, UI chọn ví/thẻ | app.e2e-spec, checkout.spec |
