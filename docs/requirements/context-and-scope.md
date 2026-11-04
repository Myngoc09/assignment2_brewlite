# 1.1 Bối cảnh, stakeholder và phạm vi

## Bối cảnh nghiệp vụ
BrewLite đưa menu, tùy chỉnh đồ uống, giỏ hàng, đặt đơn, thanh toán và theo dõi trạng thái vào một luồng số. Khách dễ tra cứu; nhân viên nhận đơn có cấu trúc; quản lý có dữ liệu tập trung; nhóm nghiệm thu có thể tái tạo hệ thống.

## Stakeholder
| Stakeholder | Mục tiêu / kỳ vọng | Quan tâm |
|---|---|---|
| Khách hàng | Xem giá, tùy chỉnh, đặt và theo dõi | Mobile dễ dùng, riêng tư, trạng thái rõ |
| Nhân viên quầy | Nhận đơn và cập nhật tiến độ | Chi tiết chính xác, tránh trùng |
| Quản lý | Theo dõi đơn/menu/tồn | Quyền truy cập, vận hành ổn định |
| Giảng viên/khách nghiệm thu | Đối chiếu yêu cầu, chạy demo | Docs, test, CI và URL truy cập |
| Nhóm phát triển | Giao qua hai sprint | Phạm vi, review, pipeline |
| Đơn vị thanh toán | Xử lý thanh toán đúng một lần | Idempotency, phản hồi rõ |

## Phạm vi
**MVP:** menu/chi tiết, size/topping, giỏ/tổng, đăng ký/đăng nhập JWT, tạo đơn, thanh toán mô phỏng, lịch sử/trạng thái, nhân viên cập nhật trạng thái, responsive/PWA, PostgreSQL migration/seed, kiểm thử, CI.

**Mở rộng:** promotions, điểm loyalty, push notification, dashboard, gateway thật, nhiều cửa hàng, báo cáo.

**Ngoài phạm vi:** dữ liệu thẻ thật, giao hàng/định vị, kế toán/hóa đơn, POS, hoàn tiền thật, tải cao đã chứng nhận.

## Giả định và ràng buộc
- Một cửa hàng, tiền VND nguyên, menu seed-managed, thanh toán mock.
- Khách có email và internet; nhân viên cập nhật trạng thái.
- Bắt buộc Next.js/PWA, NestJS, PostgreSQL; Docker Compose tái tạo local; PR bị chặn nếu quality gate lỗi.
- HTTPS production cần được cấp sau khi nhóm cấu hình tài khoản nền tảng; DB không public.

## Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Chưa có credential/URL deploy | Blueprint/workflow sẵn; chạy smoke test khi kết nối tài khoản |
| Mock khác gateway thật | Adapter tách riêng, không xử lý dữ liệu thẻ |
| Cạnh tranh tồn kho | Transaction, kiểm tra tồn; cần thêm conditional locking khi tải lớn |
| Lộ secret | `.env` ignored, secret CI, rotate khi lộ |
| Phạm vi quá rộng | Ưu tiên Must, backlog/DoD |
