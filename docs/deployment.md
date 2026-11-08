# Triển khai BrewLite lên Render

## Khởi tạo

1. Tạo Render Blueprint từ `render.yaml`. Giữ hai dịch vụ Docker liên kết với repository và tắt Auto-Deploy để chỉ pipeline phát hành phiên bản đã qua kiểm thử. API dùng gói Starter có hỗ trợ pre-deploy. Kiểm tra PostgreSQL chỉ cho kết nối nội bộ.
2. Đặt `WEB_ORIGIN` của API thành URL HTTPS của web và `API_SERVER_URL` của web thành URL HTTPS gốc của API. Render tạo `JWT_SECRET`. Pre-deploy áp dụng migration và seed danh mục. Tài khoản demo dùng trong môi trường local và CI.
3. Trong GitHub **Settings → Secrets and variables → Actions**, tạo repository secret `RENDER_API_KEY` từ Render. Tạo bốn repository variables là `RENDER_API_SERVICE_ID`, `RENDER_WEB_SERVICE_ID` (mỗi giá trị có dạng `srv-…`), `PRODUCTION_WEB_URL` và `PRODUCTION_API_URL` (URL HTTPS gốc). Workflow sử dụng Render API để xác nhận từng deployment.
4. Bảo vệ nhánh `main` bằng ruleset hoặc branch protection, yêu cầu PR và status check `quality` từ workflow CI. Chạy một PR mẫu và lấy link/log lần thành công và lần pipeline phát hiện lỗi để làm minh chứng.

## Kiểm tra sau deploy

Push vào `main` chạy quality gate, build và push hai image gắn SHA lên GHCR, sau đó yêu cầu Render build từ cùng SHA trên hai dịch vụ Git-backed. Workflow đợi cả hai ở trạng thái `live` rồi kiểm tra trang web, API health và danh mục qua proxy của web. GHCR lưu các image đã đóng gói. Render build trực tiếp từ repository của Blueprint.

- Frontend production: điền URL đã xác minh từ Render.
- API production: điền URL đã xác minh từ Render.
- Health: `<PRODUCTION_API_URL>/api/health`.
- Release: push tag `vX.Y.Z` trên commit đã kiểm tra để workflow tạo GitHub Release và release notes.

## Rollback

1. Mở tab Events của từng service Render. Đối chiếu SHA với lần chạy GitHub Actions thành công trước đó.
2. Rollback API và web về các deployment tương ứng với SHA đó. Xác minh hai service đã live rồi kiểm tra trang web, API health và `/api/products` qua URL web.
3. Giữ database hiện tại. Nếu schema đã thay đổi, kiểm tra tương thích của bản rollback và dùng migration bổ sung để sửa tiến khi cần.

Khi nộp bài, đính kèm URL production, link run CI/CD, link release, video/demo, Sprint Review và Sprint Retrospective thực tế.
