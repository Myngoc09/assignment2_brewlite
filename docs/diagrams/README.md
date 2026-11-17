# Sơ đồ hệ thống BrewLite

Thư mục này chứa toàn bộ sơ đồ thiết kế của hệ thống BrewLite (web đặt đồ uống: Next.js + NestJS + PostgreSQL/Prisma). Mỗi sơ đồ có mã nguồn PlantUML (`.puml`) để chỉnh sửa và ảnh xuất ra (`.svg`) để review nhanh.

Đặc tả use case tương ứng nằm ở [`../requirements/`](../requirements/). Kiến trúc và các quyết định thiết kế nằm ở [`../architecture/`](../architecture/).

---

## 1. Danh mục sơ đồ

### 1.1. Sơ đồ hoạt động (Activity)

Mô tả luồng nghiệp vụ theo từng làn (khách hàng, giao diện/hệ thống, API, cơ sở dữ liệu).

| Chức năng | Mã nguồn | Ảnh | Nội dung chính |
| :--- | :--- | :--- | :--- |
| Tổng quan hệ thống | [`activity-overview.puml`](activity-overview.puml) | [`activity-overview.svg`](activity-overview.svg) | Toàn bộ hành trình: xem menu, chọn size/topping, giỏ hàng, đăng nhập, đặt hàng, theo dõi và xem lịch sử đơn |
| Đăng ký | [`activity-register.puml`](activity-register.puml) | [`activity-register.svg`](activity-register.svg) | Kiểm tra form, DTO, tên rỗng, băm mật khẩu bcrypt, trùng email, trả JWT |
| Đăng nhập | [`activity-login.puml`](activity-login.puml) | [`activity-login.svg`](activity-login.svg) | Kiểm tra form và DTO, so khớp mật khẩu bcrypt, tạo JWT, lưu vào `localStorage` |
| Xem menu | [`activity-menu.puml`](activity-menu.puml) | [`activity-menu.svg`](activity-menu.svg) | Tải danh sách sản phẩm, tìm kiếm, lọc danh mục, xem chi tiết, xử lý lỗi và danh sách trống |
| Chọn tùy chọn sản phẩm | [`activity-customize.puml`](activity-customize.puml) | [`activity-customize.svg`](activity-customize.svg) | Xem chi tiết sản phẩm, kiểm tra size còn hàng, chọn size và topping, cập nhật giá theo tùy chọn |
| Thêm vào giỏ hàng | [`activity-addtocart.puml`](activity-addtocart.puml) | [`activity-addtocart.svg`](activity-addtocart.svg) | Chọn sản phẩm, tải chi tiết, kiểm tra số lượng còn lại và cập nhật giỏ hàng trên trình duyệt |
| Đặt hàng | [`activity-checkout.puml`](activity-checkout.puml) | [`activity-checkout.svg`](activity-checkout.svg) | Kiểm tra giỏ, đăng nhập, thông tin nhận hàng, tồn kho, tạo đơn `PENDING` trong transaction |
| Thanh toán | [`activity-payment.puml`](activity-payment.puml) | [`activity-payment.svg`](activity-payment.svg) | `Idempotency-Key`, giả lập cổng thanh toán, thành công → `PAID` và cộng điểm, thất bại → `PAYMENT_FAILED` |
| Theo dõi đơn hàng | [`activity-ordertracking.puml`](activity-ordertracking.puml) | [`activity_ordertracking.svg`](activity_ordertracking.svg) | Xem danh sách đơn của tôi và tiến trình một đơn |
| Cập nhật trạng thái đơn | [`activity-orderstatus.puml`](activity-orderstatus.puml) | [`activity-orderstatus.svg`](activity-orderstatus.svg) | Nhân viên chuyển bước xử lý, hủy đơn, hoàn kho, các nhánh lỗi 401/400/403/404/409 |


### 1.2. Sơ đồ tuần tự (Sequence)

Mô tả thứ tự thông điệp giữa các thành phần (UI, API, PostgreSQL, cổng thanh toán giả lập).

| Chức năng | Mã nguồn | Ảnh | Nội dung chính |
| :--- | :--- | :--- | :--- |
| Tổng quan | [`sequence-overview.puml`](sequence-overview.puml) | [`sequence-overview.svg`](sequence-overview.svg) | Tổng hợp luồng menu, xác thực, checkout, Mock/VNPAY, hủy đơn, theo dõi đơn và xử lý đơn/quản lý kho |
| Đăng ký | [`sequence-register.puml`](sequence-register.puml) | [`sequence-register.svg`](sequence-register.svg) | `POST /api/auth/register`, lỗi 400 (dữ liệu, tên rỗng, trùng email), trả `201` kèm `accessToken` |
| Đăng nhập | [`sequence-login.puml`](sequence-login.puml) | [`sequence-login.svg`](sequence-login.svg) | `POST /api/auth/login`, lỗi 400/401, trả `201` kèm `accessToken` |
| Xem menu | [`sequence-menu.puml`](sequence-menu.puml) | [`sequence-menu.svg`](sequence-menu.svg) | `GET /api/products`, `GET /api/products/{id}`, tính số lượng có thể phục vụ, tìm kiếm và lọc ở UI |
| Chọn tùy chọn sản phẩm | [`sequence-customize.puml`](sequence-customize.puml) | [`sequence-customize.svg`](sequence-customize.svg) | Tải chi tiết sản phẩm, lấy danh sách size và topping, kiểm tra khả năng phục vụ, cập nhật lựa chọn và tính giá |
| Thêm vào giỏ hàng | [`sequence-addtocart.puml`](sequence-addtocart.puml) | [`sequence-addtocart.svg`](sequence-addtocart.svg) | UI lấy chi tiết sản phẩm qua API; thao tác thêm/tăng số lượng giỏ được xử lý ở state trên trình duyệt, không ghi DB |
| Đặt hàng | [`sequence-checkout.puml`](sequence-checkout.puml) | [`sequence-checkout.svg`](sequence-checkout.svg) | Xem giỏ, nhập thông tin giao hàng, kiểm tra tồn kho, tạo đơn `PENDING`, xóa giỏ |
| Thanh toán | [`sequence-payment.puml`](sequence-payment.puml) | [`sequence-payment.svg`](sequence-payment.svg) | `POST /api/payments`, phát lại cùng `Idempotency-Key`, nhánh thành công và thất bại trong transaction |
| Theo dõi đơn hàng | [`sequence-ordertracking.puml`](sequence-ordertracking.puml) | [`sequence_ordertracking.svg`](sequence_ordertracking.svg) | `GET /api/orders/mine`, `GET /api/orders/{id}`, lỗi 401/404/5xx |
| Cập nhật trạng thái đơn | [`sequence-orderstatus.puml`](sequence-orderstatus.puml) | [`sequence-orderstatus.svg`](sequence-orderstatus.svg) | `PATCH /api/orders/{id}/status`, transaction hủy đơn, `InventoryService.release` |



### 1.3. Sơ đồ cấu trúc và triển khai

| Loại | Mã nguồn | Ảnh | Nội dung chính |
| :--- | :--- | :--- | :--- |
| Lớp miền (Class) | [`class-domain.puml`](class-domain.puml) | [`class-domain.svg`](class-domain.svg) | `User`, `Product`, `ProductSize`, `ProductTopping`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction`, `OrderStatusHistory` và các enum |
| Triển khai (Deployment) | [`deployment-production.puml`](deployment-production.puml) | [`deployment-production.svg`](deployment-production.svg) | Thiết bị khách, GitHub Actions, GHCR, Argo CD, K3s trên Oracle Cloud (Traefik, Next.js, NestJS, PostgreSQL), môi trường local bằng Docker Compose |

### 1.4. Sơ đồ use case (nằm ở `docs/requirements/`)

| Chức năng | Mã nguồn | Ảnh | Đặc tả |
| :--- | :--- | :--- | :--- |
| Tổng quan | [`usecase-overview.puml`](../requirements/usecase-overview.puml) | [`usecase-overview.svg`](../requirements/usecase-overview.svg) | [`use-case-brewlite.md`](../requirements/use-case-brewlite.md) |
| Đăng ký, đăng nhập | [`usecase-auth.puml`](../requirements/usecase-auth.puml) | [`usecase-auth.svg`](../requirements/usecase-auth.svg) | [`usecase-auth.md`](../requirements/usecase-auth.md) |
| Menu | [`usecase-menu.puml`](../requirements/usecase-menu.puml) | [`usecase-menu.svg`](../requirements/usecase-menu.svg) | [`usecase-menu.md`](../requirements/usecase-menu.md) |
| Chi tiết và tùy chọn sản phẩm | [`usecase-menu-detail-options.puml`](../requirements/usecase-menu-detail-options.puml) | [`usecase-menu-detail-options.svg`](../requirements/usecase-menu-detail-options.svg) |[`usecase-menu-detail-options.md`](../requirements/usecase-menu-detail-options.md) |
| Thanh toán | [`usecase-payment.puml`](../requirements/usecase-payment.puml) | [`usecase-payment.svg`](../requirements/usecase-payment.svg) | [`usecase-payment.md`](../requirements/usecase-payment.md) |
| Quản lý trạng thái đơn | [`usecase-orderstatus.puml`](../requirements/usecase-orderstatus.puml) | [`usecase-orderstatus.svg`](../requirements/usecase-orderstatus.svg) | [`usecase-orderstatus.md`](../requirements/usecase-orderstatus.md) |

---

## 2. Bảng đối chiếu sơ đồ với use case

| Use case | Sơ đồ hoạt động | Sơ đồ tuần tự |
| :--- | :--- | :--- |
| `UC-01`, `UC-02` Xem menu và chi tiết đồ uống | `activity-menu` | `sequence-menu` |
| `UC-03` Chọn tùy chọn sản phẩm | `activity-customize` | `sequence-customize` |
| `UC-04` Thêm vào giỏ hàng | `activity-addtocart` | `sequence-addtocart` |
| `UC-05` Đăng ký | `activity-register` | `sequence-register` |
| `UC-06` Đăng nhập | `activity-login` | `sequence-login` |
| `UC-07`, `UC-08` Đặt hàng, tạo đơn | `activity-checkout` | `sequence-checkout` |
| `UC-09`, `UC-12` Thanh toán, thử thanh toán lại | `activity-payment` | `sequence-payment` |
| `UC-11` Xem lịch sử và trạng thái đơn | `activity-ordertracking` | `sequence-ordertracking` |
| `UC-13` Khách hủy đơn chưa thanh toán | `activity-orderstatus` | `sequence-orderstatus` |
| `UC-15` Cập nhật tiến độ đơn | `activity-orderstatus` | `sequence-orderstatus` |
| `UC-16` Hủy đơn đã thanh toán | `activity-orderstatus` | `sequence-orderstatus` |
| Toàn hệ thống | `activity-overview` | |
| Tổng quan tương tác các luồng chính | | `sequence-overview` |

---

## 3. Quy ước và lưu ý

- **Công cụ vẽ:** PlantUML. Xem trước bằng extension PlantUML trong VS Code hoặc trang plantuml.com.
- **Đặt tên file:** `activity-<chức năng>`, `sequence-<chức năng>`, `class-<phạm vi>`, `deployment-<môi trường>`. Mỗi `.puml` đi kèm một `.svg` cùng tên.
- **Lệch tên file cần sửa:** ảnh của chức năng theo dõi đơn đang đặt tên gạch dưới (`activity_ordertracking.svg`, `sequence_ordertracking.svg`) trong khi mã nguồn dùng gạch ngang. Nên đổi thành `activity-ordertracking.svg` và `sequence-ordertracking.svg`, sau đó sửa link trong bảng ở mục 1.
- **`class-domain` chưa cập nhật theo schema:** sơ đồ hiện chưa có enum giá trị `VNPAY_QR` của `PaymentMethod` và các bảng kho `Ingredient`, `RecipeIngredient`, `ToppingIngredient`, `StockMovement` đã có trong `apps/api/prisma/schema.prisma`. Nên bổ sung trước khi nộp.
- **Sơ đồ checkout và payment** mô tả luồng thanh toán giả lập (`MOCK_WALLET`, `MOCK_CARD`). Luồng `VNPAY_QR` chưa có sơ đồ riêng.
- **Bộ sơ đồ bổ sung:** `activity-addtocart`, `sequence-addtocart`, `sequence-overview` và `usecase-menu-detail-options` được thêm từ gói `diagrams brewlite`. Đặt các file `.puml` và `.svg` này trong `docs/diagrams/` để các liên kết tương đối trong README hoạt động.
- **Đối chiếu Add to Cart:** trong source frontend, khóa dòng giỏ hàng gồm sản phẩm, size và danh sách topping (được sắp xếp). Hai sơ đồ Add to Cart hiện ghi khóa là sản phẩm + size; cần cập nhật nội dung sơ đồ để phản ánh cả topping. Nên thể hiện thao tác chọn topping trước khi thêm vào giỏ.
- **Use Case Menu Detail Options:** sơ đồ mới mô tả UC-01 đến UC-04. Cần đảm bảo mã UC và quan hệ `include`/`extend` thống nhất với đặc tả trong `docs/requirements/` trước khi nộp.
- **Sequence Overview:** sơ đồ mới đã tổng hợp luồng VNPAY IPN và return. Kết quả thanh toán phải được xác nhận từ xử lý phía server/IPN; return của trình duyệt không nên được xem là nguồn xác nhận độc lập.

## 4. Xuất lại SVG sau khi sửa

Cài PlantUML (cần Java), rồi chạy tại thư mục gốc dự án:

```bash
# Xuất một sơ đồ
plantuml -tsvg docs/diagrams/sequence-orderstatus.puml

# Xuất toàn bộ sơ đồ trong thư mục
plantuml -tsvg docs/diagrams/*.puml docs/requirements/*.puml
```

Lệnh trên ghi file `.svg` cạnh file `.puml` tương ứng. Commit cả hai file để người review xem được ảnh mà không cần cài PlantUML.