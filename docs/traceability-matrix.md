# Traceability matrix
| ID | Use case/story | Design | Code/API | Check |
|---|---|---|---|---|
| FR-01 | UC-01 menu | Activity, Product | GET /api/products | Contract/empty state |
| FR-02 | UC-02 details | ProductSize/Topping | GET /api/products/:id | unknown=404 |
| FR-03 | UC-04 cart | Activity | Next cart | size+topping × qty |
| FR-04 | UC-03 auth | Sequence/JWT | POST auth/register, login | validation/hash |
| FR-05 | UC-04 order | Sequence/Class | POST /api/orders | transaction/stock |
| FR-06 | UC-04 payment | Sequence alt | POST /api/orders/:id/pay | key replay/success/failure |
| FR-07 | UC-05 history | User-Order | GET /api/orders/mine, /:id | owner-only |
| FR-08 | UC-06 status | OrderStatus | PATCH /api/orders/:id/status | staff role |
| FR-09 | UC-04 promotion | Promotion | POST orders | active/expiry |
| FR-10 | UC-05 loyalty | LoyaltyTransaction | Payment success | earn record |
| NFR-02 | All | ADR/security | JWT, bcrypt, validation, CORS | auth/role checks |
| NFR-03 | Ops | Deployment | GET /api/health | DB check |
| NFR-05–07 | Delivery | Deployment/ADR | Prisma transaction, Compose, Actions | CI + smoke |
