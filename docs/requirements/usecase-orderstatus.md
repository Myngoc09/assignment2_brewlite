# Đặc tả Use Case: Quản lý trạng thái đơn hàng (UC-15 / UC-16)

## 1. Thông tin tổng quan

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Mã Use Case** | `UC-15` (Cập nhật tiến độ đơn) và `UC-16` (Hủy đơn đã thanh toán). Liên quan `UC-13` (Khách hàng hủy đơn chưa thanh toán). Trong SRS các use case này thuộc nhóm `UC-06`. |
| **Tên Use Case** | Quản lý trạng thái đơn hàng (`PATCH /api/orders/{id}/status`) |
| **Tác nhân chính (Primary Actor)** | Nhân viên (`STAFF`). Quản lý cửa hàng (`MANAGER`) kế thừa toàn bộ quyền của nhân viên. |
| **Tác nhân phụ (Secondary Actor)** | Khách hàng (`CUSTOMER`) chỉ được hủy đơn chưa thanh toán của chính mình (`UC-13`). |
| **Mô tả tóm tắt** | Cho phép nhân viên đưa đơn đã thanh toán đi qua các bước xử lý `PAID` → `PREPARING` → `READY` → `COMPLETED`, hoặc hủy đơn. Mỗi lần đổi trạng thái đều được kiểm tra vai trò, kiểm tra bước chuyển hợp lệ và ghi vào `OrderStatusHistory`. Khi hủy đơn, hệ thống hoàn trả tồn kho sản phẩm và nguyên liệu trong cùng một transaction. |
| **Trigger (Sự kiện kích hoạt)** | Nhân viên chọn một đơn và trạng thái mới trên client vận hành (Thunder Client hoặc giao diện), sau đó gửi yêu cầu cập nhật. Khách hàng bấm **"Hủy đơn"** trên đơn chưa thanh toán trong mục Đơn hàng. |
| **Tiền điều kiện (Pre-conditions)** | 1. Người dùng đã đăng nhập và có JWT hợp lệ chứa `sub` và `role`.<br>2. Đơn hàng tồn tại. Với khách hàng, đơn phải thuộc tài khoản đang đăng nhập.<br>3. Trạng thái hiện tại của đơn là bước trước hợp lệ của trạng thái đích (xem bảng chuyển trạng thái). |
| **Hậu điều kiện (Post-conditions)** | **Thành công:**<br>- `Order.status` chuyển sang trạng thái đích.<br>- Có thêm một bản ghi `OrderStatusHistory` gồm trạng thái mới, thời điểm và `changedById` của người thao tác.<br>- Với `CANCELLED`: tồn kho sản phẩm được cộng lại, nguyên liệu được giải phóng và có các bản ghi `StockMovement` loại `RELEASE`.<br><br>**Thất bại:**<br>- API trả mã lỗi tương ứng (`400`, `401`, `403`, `404`, `409`).<br>- Trạng thái đơn, lịch sử trạng thái và tồn kho giữ nguyên. Với hủy đơn, transaction được rollback. |
| **Truy vết yêu cầu (Traceability)** | `FR-07`, `FR-08`, `NFR-02`, `NFR-05` |

### 1.1. Bảng chuyển trạng thái

| Trạng thái đích | Trạng thái hiện tại hợp lệ | Người thực hiện | Use case |
| :--- | :--- | :--- | :--- |
| `PREPARING` | `PAID` | `STAFF`, `MANAGER` | `UC-15` |
| `READY` | `PREPARING` | `STAFF`, `MANAGER` | `UC-15` |
| `COMPLETED` | `READY` | `STAFF`, `MANAGER` | `UC-15` |
| `CANCELLED` | `PAID` | `STAFF`, `MANAGER` | `UC-16` |
| `CANCELLED` | `PENDING`, `PAYMENT_FAILED` | Khách hàng (đơn của mình), `STAFF`, `MANAGER` | `UC-13` |

- Các trạng thái `PENDING`, `PAID`, `PAYMENT_FAILED` do luồng đặt hàng và thanh toán đặt ra, không đặt qua API này.
- `COMPLETED` và `CANCELLED` là trạng thái kết thúc, đơn không chuyển tiếp được nữa.
- API cho phép `STAFF` và `MANAGER` hủy đơn ở cả ba trạng thái `PENDING`, `PAYMENT_FAILED`, `PAID`. SRS (`FR-08`) chỉ nêu trường hợp hủy khi đơn đang `PAID`.

---

## 2. Luồng sự kiện (Flows of Events)

### 2.1. Luồng chính (Main Flow - Bắt đầu pha chế `PAID` → `PREPARING`)

1. **Nhân viên** xác định mã đơn (`id`) cần xử lý và chọn trạng thái mới `PREPARING` trên client.
2. **Client** gửi `PATCH /api/orders/{id}/status` với body `{ "status": "PREPARING" }` và header `Authorization: Bearer <JWT>` đến **NestJS API**.
3. **AuthGuard** xác thực JWT và lấy `sub` (mã người dùng) cùng `role`.
4. **ValidationPipe** kiểm tra `status` thuộc tập `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`.
5. **OrdersController** xác định `staff` là đúng khi `role` là `STAFF` hoặc `MANAGER`, rồi gọi `OrdersService.status(userId, staff, id, status)`.
6. **OrdersService** tìm đơn theo `id`. Với nhân viên không giới hạn theo chủ đơn.
7. **OrdersService** cập nhật có điều kiện `Order` sang `PREPARING` khi trạng thái hiện tại thuộc `PAID`, đồng thời tạo bản ghi `OrderStatusHistory` (`status`, `changedById = userId`).
8. **NestJS API** trả `HTTP 200 OK` kèm đơn đã cập nhật. **Client** hiển thị trạng thái mới cho nhân viên.
9. **Khách hàng** thấy trạng thái mới và mốc thời gian khi mở **Theo dõi đơn** (`UC-11`).

---

### 2.2. Luồng thay thế (Alternative Flows)

* **AF-01: Báo đơn sẵn sàng (`PREPARING` → `READY`)**
  - Thực hiện từ **bước 1** với trạng thái đích `READY`. Bước 7 yêu cầu đơn đang `PREPARING`.

* **AF-02: Hoàn tất đơn (`READY` → `COMPLETED`)**
  - Thực hiện từ **bước 1** với trạng thái đích `COMPLETED`. Bước 7 yêu cầu đơn đang `READY`.

* **AF-03: Nhân viên hủy đơn đã thanh toán (`UC-16`)**
  - **Tại bước 1:** nhân viên chọn trạng thái đích `CANCELLED` cho đơn `PAID` (trước khi bắt đầu pha chế).
  - **Thay cho bước 7**, **OrdersService** mở một database transaction:
    1. Khóa dòng `Order` bằng `SELECT ... FOR UPDATE`.
    2. Kiểm tra đơn không có `Payment` phương thức `VNPAY_QR` đang `PENDING`.
    3. Cập nhật `Order` sang `CANCELLED` khi trạng thái hiện tại thuộc `PENDING`, `PAYMENT_FAILED`, `PAID`, và ghi `OrderStatusHistory`.
    4. Cộng lại `Product.inventory` cho các dòng hàng dùng tồn sản phẩm (`usesProductStock`).
    5. Gọi `InventoryService.release`: với mỗi `StockMovement` loại `RESERVE` của đơn, tăng `Ingredient.available` và ghi `StockMovement` loại `RELEASE`.
    6. Commit transaction.
  - **NestJS API** trả `HTTP 200 OK` kèm đơn đã hủy.

* **AF-04: Khách hàng hủy đơn chưa thanh toán (`UC-13`)**
  - **Tại bước 1:** khách hàng gửi trạng thái đích `CANCELLED` cho đơn của chính mình.
  - Bước 6 tìm đơn theo cả `id` và `userId`. Điều kiện cập nhật chỉ gồm `PENDING` và `PAYMENT_FAILED`. Các bước còn lại như **AF-03**.

---

### 2.3. Luồng ngoại lệ (Exception Flows)

* **EF-01: Thiếu hoặc sai mã xác thực JWT**
  - **Tại bước 3:** token thiếu, hết hạn hoặc không hợp lệ. **NestJS API** trả `HTTP 401 Unauthorized`.

* **EF-02: Giá trị `status` không hợp lệ**
  - **Tại bước 4:** `status` nằm ngoài tập cho phép hoặc body có trường thừa. **NestJS API** trả `HTTP 400 Bad Request`.

* **EF-03: Khách hàng gửi trạng thái khác `CANCELLED`**
  - **Tại bước 6:** người gọi không phải `STAFF` hoặc `MANAGER` mà `status` khác `CANCELLED`. **NestJS API** trả `HTTP 403 Forbidden` (`Staff role required`).

* **EF-04: Không tìm thấy đơn hoặc đơn không thuộc khách hàng**
  - **Tại bước 6:** đơn không tồn tại, hoặc người gọi là khách hàng và đơn thuộc tài khoản khác. **NestJS API** trả `HTTP 404 Not Found`.

* **EF-05: Chuyển trạng thái sai bước**
  - **Tại bước 7:** trạng thái hiện tại không thuộc bước trước hợp lệ (ví dụ `READY` khi đơn còn `PAID`, hoặc `CANCELLED` khi đơn đã `COMPLETED`). Câu lệnh cập nhật không khớp dòng nào. **NestJS API** trả `HTTP 409 Conflict` (`Order cannot move to that status`) và không thay đổi dữ liệu.

* **EF-06: Đơn đang chờ xác nhận từ VNPAY**
  - **Tại bước 2 của AF-03:** đơn có `Payment` `VNPAY_QR` ở trạng thái `PENDING`. Hệ thống rollback và trả `HTTP 409 Conflict` (`Đơn đang chờ xác nhận từ VNPAY.`).

* **EF-07: Hai yêu cầu đổi trạng thái đồng thời**
  - Dòng `Order` được khóa khi hủy và điều kiện trạng thái nằm ngay trong câu lệnh cập nhật. Chỉ một yêu cầu thành công. Yêu cầu còn lại nhận `HTTP 409 Conflict` như **EF-05**.

---

## 3. Liên kết sơ đồ & Tiêu chí nghiệm thu (Acceptance Criteria)

* **Sơ đồ Use Case:** [`usecase-orderstatus.svg`](usecase-orderstatus.svg) (mã nguồn: [`usecase-orderstatus.puml`](usecase-orderstatus.puml))
* **Sơ đồ tuần tự:** [`../diagrams/sequence-orderstatus.svg`](../diagrams/sequence-orderstatus.svg) (mã nguồn: [`sequence-orderstatus.puml`](../diagrams/sequence-orderstatus.puml))
* **Sơ đồ hoạt động:** [`../diagrams/activity-orderstatus.svg`](../diagrams/activity-orderstatus.svg) (mã nguồn: [`activity-orderstatus.puml`](../diagrams/activity-orderstatus.puml))
* **Use case liên quan:** [`usecase-history and managemen.md`](usecase-history%20and%20managemen.md) (`UC-11`), [`use-case-brewlite.md`](use-case-brewlite.md) (`UC-13`, `UC-15`, `UC-16`).

**Tiêu chí nghiệm thu kiểm thử (Test Criteria):**
1. Khách hàng gửi `PREPARING` nhận `HTTP 403`. Nhân viên gửi `READY` khi đơn còn `PAID` nhận `HTTP 409`. Nhân viên gửi `PREPARING` nhận `HTTP 200`.
2. Nhân viên đi tiếp `READY` rồi `COMPLETED`, mỗi lần nhận `HTTP 200`. `GET /api/orders/me` trả đúng `status` hiện tại và `statusHistory` theo thứ tự thời gian, có đủ mốc `PAID`, `PREPARING`, `READY`, `COMPLETED`.
3. Gửi `CANCELLED` cho đơn đã `COMPLETED` nhận `HTTP 409`.
4. Khách hàng khác gửi `CANCELLED` cho đơn không phải của mình nhận `HTTP 404`. Chủ đơn hủy nhận `HTTP 200`. Hủy lần hai nhận `HTTP 409`.
5. Hủy đơn đang có thanh toán `VNPAY_QR` ở trạng thái `PENDING` nhận `HTTP 409` và trạng thái đơn giữ nguyên.
6. Sau khi hủy, số lượng khả dụng của sản phẩm và `Ingredient.available` trở về mức trước khi đặt, và có `StockMovement` loại `RELEASE` tương ứng.
7. Gửi `status` ngoài tập cho phép nhận `HTTP 400`. Gửi yêu cầu thiếu hoặc sai JWT nhận `HTTP 401`.
