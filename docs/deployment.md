# Production handover
Render blueprint tạo web, API container, PostgreSQL private. TLS từ nền tảng; runtime secrets ở secret store; GHCR lưu SHA images.

## Thiết lập
1. Push repo GitHub, bật Actions/GHCR.
2. Tạo Render Blueprint và kiểm tra DB không public.
3. Đặt `WEB_ORIGIN`, `API_SERVER_URL`; `JWT_SECRET` runtime được tạo ngẫu nhiên.
4. GitHub secret `RENDER_DEPLOY_HOOK`, vars `PRODUCTION_WEB_URL`, `PRODUCTION_API_URL`.
5. Deploy, kiểm tra HTTPS web, `/api/health`; ghi URL thật vào demo.

Frontend URL: chưa được cấp. API URL: chưa được cấp. Health: `<API_URL>/api/health`.
Migration pre-deploy `npx prisma migrate deploy`; workflow smoke-check. Nếu lỗi, giữ pipeline failed, redeploy image SHA trước, verify health; chỉ forward-fix schema an toàn, không xóa DB.

Còn cần thu thập: run CI pass/fail, release tag, production URLs, video/demo, Sprint Review/Retrospective thực tế.
