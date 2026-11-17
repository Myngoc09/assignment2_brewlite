# Đặc tả Use Case: Thanh toán đơn hàng (UC-04B / Payment)

## 1. Thông tin tổng quan

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Mã Use Case** | `UC-PAYMENT` (Thuộc nhóm nghiệp vụ `UC-04: Đặt và thanh toán đơn hàng`) |
| **Tên Use Case** | Thanh toán đơn hàng mô phỏng (`POST /api/payments`) |
| **Tác nhân chính (Primary Actor)** | Khách hàng (`Customer`) |
| **Tác nhân phụ (Secondary Actor)** | Hệ thống thanh toán mô phỏng (`Payment Simulator`) |
| **Mô tả tóm tắt** | Cho phép khách hàng đã đăng nhập thực hiện thanh toán mô phỏng cho đơn hàng đang chờ xử lý (`PENDING`) hoặc thanh toán lỗi trước đó (`PAYMENT_FAILED`) thông qua ví hoặc thẻ mô phỏng, đảm bảo chống ghi nhận trùng lặp bằng `Idempotency-Key`. |
| **Trigger (Sự kiện kích hoạt)** | Khách hàng chọn phương thức thanh toán (`MOCK_WALLET` hoặc `MOCK_CARD`) trên giao diện Next.js và nhấn nút **"Thanh toán"** (hoặc **"Thử lại"**). |
| **Tiền điều kiện (Pre-conditions)** | 1. Khách hàng đã đăng nhập và sở hữu mã xác thực JWT hợp lệ.<br>2. Đơn hàng đã được tạo thành công trên hệ thống với mã đơn hợp lệ (`orderId`) thuộc quyền sở hữu của khách hàng và đã giữ tồn kho nguyên liệu.<br>3. Trạng thái hiện tại của đơn hàng là `PENDING` hoặc `PAYMENT_FAILED`. |
| **Hậu điều kiện (Post-conditions)** | **Thành công:**<br>- Trạng thái bản ghi `Payment` chuyển thành `SUCCEEDED` kèm mã tham chiếu `providerReference`.<br>- Trạng thái `Order` chuyển thành `PAID` và ghi nhận vào `OrderStatusHistory`.<br>- Hệ thống cộng điểm thưởng (`LoyaltyTransaction` loại `EARN`) cho khách hàng.<br>- Giỏ hàng hiện tại trên giao diện được làm trống.<br><br>**Thất bại:**<br>- Trạng thái bản ghi `Payment` chuyển thành `FAILED`.<br>- Trạng thái `Order` chuyển thành `PAYMENT_FAILED` và ghi nhận vào `OrderStatusHistory`.<br>- Giỏ hàng và thông tin đơn hàng được giữ nguyên để khách hàng thử lại. |
| **Truy vết yêu cầu (Traceability)** | `FR-04`, `FR-06`, `FR-07`, `FR-10`, `NFR-02`, `NFR-05`, `NFR-08` |

---

## 2. Luồng sự kiện (Flows of Events)

### 2.1. Luồng chính (Main Flow - Thanh toán thành công)

1. Tại màn hình thanh toán đơn hàng, **Khách hàng** chọn phương thức thanh toán mô phỏng (`MOCK_WALLET` hoặc `MOCK_CARD`) và nhấn **"Thanh toán"**.
2. Giao diện **Next.js** sinh một mã UUID mới làm `Idempotency-Key` và gửi yêu cầu `POST /api/payments` kèm theo `JWT`, `orderId`, `method` và `Idempotency-Key` đến máy chủ **NestJS**.
3. **NestJS API** xác thực tính hợp lệ của `JWT` và kiểm tra quyền sở hữu đơn hàng của khách hàng.
4. **NestJS API** truy vấn PostgreSQL để kiểm tra cặp khóa `(orderId, Idempotency-Key)` chưa từng tồn tại và xác nhận trạng thái đơn hàng đang là `PENDING` hoặc `PAYMENT_FAILED`.
5. **NestJS API** tạo bản ghi `Payment` mới trong cơ sở dữ liệu với trạng thái `PENDING`.
6. **NestJS API** gửi yêu cầu xử lý thanh toán gồm tổng tiền (`totalCents` tính theo VND nguyên), phương thức thanh toán và `Idempotency-Key` sang **Payment Simulator**.
7. **Payment Simulator** xử lý giao dịch mô phỏng thành công và trả về kết quả `SUCCEEDED` kèm mã tham chiếu giao dịch (`providerReference`).
8. **NestJS API** mở một Database Transaction trên PostgreSQL để thực hiện đồng bộ:
   - Cập nhật trạng thái `Payment` thành `SUCCEEDED` và lưu `providerReference`.
   - Cập nhật trạng thái `Order` thành `PAID`.
   - Thêm bản ghi mới vào `OrderStatusHistory` với trạng thái `PAID`.
   - Tính toán và ghi nhận điểm tích lũy vào `LoyaltyTransaction` (loại `EARN`).
9. **NestJS API** commit transaction và trả về phản hồi `HTTP 200 OK` kèm thông tin đơn hàng đã thanh toán.
10. Giao diện **Next.js** xóa dữ liệu giỏ hàng hiện tại và hiển thị màn hình xác nhận thanh toán thành công cùng mã đơn hàng (`orderNumber`) cho **Khách hàng**.

---

### 2.2. Luồng thay thế (Alternative Flows)

* **AF-01: Phát lại yêu cầu với cùng `Idempotency-Key` (Idempotency Replay - Mạng chập chờn / Gửi trùng)**
  - **Tại bước 4 của Luồng chính:** Nếu **NestJS API** phát hiện cặp `(orderId, Idempotency-Key)` đã tồn tại trong bảng `Payment` (do client gửi lại cùng một yêu cầu khi mạng không ổn định):
  - **Hệ thống** không tạo bản ghi `Payment` mới và không gọi lại **Payment Simulator**.
  - **NestJS API** trả về ngay kết quả của giao dịch cũ đã được lưu trước đó (`HTTP 200 OK`) để đảm bảo tính nhất quán và tránh trừ tiền/ghi nhận lặp (`FR-06`).

* **AF-02: Khách hàng thử thanh toán lại sau khi giao dịch trước thất bại**
  - **Tại bước 1 của Luồng chính:** Khi đơn hàng đang ở trạng thái `PAYMENT_FAILED`, khách hàng nhấn nút **"Thử lại thanh toán"**.
  - Giao diện **Next.js** bắt buộc sinh một `Idempotency-Key` (UUID) hoàn toàn mới cho lần thử này và tiếp tục thực hiện từ **bước 2 của Luồng chính**.

---

### 2.3. Luồng ngoại lệ (Exception Flows)

* **EF-01: Thiếu hoặc sai mã xác thực JWT**
  - **Tại bước 3 của Luồng chính:** Nếu token `JWT` bị thiếu, hết hạn hoặc không hợp lệ:
  - **NestJS API** từ chối yêu cầu và trả về mã lỗi `HTTP 401 Unauthorized`.
  - Giao diện **Next.js** thông báo phiên đăng nhập hết hạn và điều hướng khách hàng về trang đăng nhập.

* **EF-02: Đơn hàng không thuộc quyền sở hữu của khách hàng**
  - **Tại bước 3 của Luồng chính:** Nếu `orderId` không thuộc về `userId` giải mã từ `JWT`:
  - **NestJS API** từ chối truy cập và trả về mã lỗi `HTTP 403 Forbidden` (hoặc `404 Not Found`).

* **EF-03: Trạng thái đơn hàng không hợp lệ để thanh toán**
  - **Tại bước 4 của Luồng chính:** Nếu đơn hàng đã ở trạng thái `PAID`, `PREPARING`, `READY`, `COMPLETED` hoặc `CANCELLED`:
  - **NestJS API** từ chối giao dịch và trả về mã lỗi `HTTP 409 Conflict`.
  - Giao diện **Next.js** hiển thị thông báo trạng thái đơn hàng không thể thanh toán.

* **EF-04: Giao dịch thanh toán mô phỏng thất bại**
  - **Tại bước 7 của Luồng chính:** Nếu **Payment Simulator** trả về kết quả thất bại (`FAILED` - ví dụ mô phỏng thẻ/ví không đủ số dư hoặc từ chối giao dịch):
  - **NestJS API** mở Database Transaction để cập nhật bản ghi `Payment` thành `FAILED`, cập nhật `Order` thành `PAYMENT_FAILED` và lưu lịch sử vào `OrderStatusHistory`.
  - **NestJS API** không cộng điểm thưởng và trả về phản hồi lỗi (`HTTP 402` / `HTTP 400`).
  - Giao diện **Next.js** hiển thị thông báo thanh toán thất bại, giữ nguyên giỏ hàng/đơn hàng và cung cấp nút **"Thử lại"** cho khách hàng.

---

## 3. Liên kết sơ đồ & Tiêu chí nghiệm thu (Acceptance Criteria)

* **Sơ đồ Use Case:** `docs/diagrams/usecase-payment.svg` (Mã nguồn: `docs/diagrams/usecase-payment.puml`)
* **Sơ đồ tuần tự liên quan:** `docs/diagrams/sequence-payment.svg`
* **Sơ đồ hoạt động liên quan:** `docs/diagrams/activity-payment.svg`

**Tiêu chí nghiệm thu kiểm thử (Test Criteria):**
1. Thanh toán hợp lệ chuyển đơn sang `PAID`, tạo đúng 1 bản ghi `Payment` (`SUCCEEDED`), cộng điểm `LoyaltyTransaction` và làm rỗng giỏ hàng[cite: 5, 6, 9].
2. Gửi đồng thời hoặc gửi lại 2 request có cùng `(orderId, Idempotency-Key)` chỉ tạo duy nhất 1 giao dịch và trả về cùng kết quả[cite: 5, 6].
3. Thanh toán thất bại chuyển đơn sang `PAYMENT_FAILED`, không cộng điểm, giữ nguyên giỏ hàng; thử lại với `Idempotency-Key` mới cho phép thanh toán thành công[cite: 5, 6].
4. Gửi request thiếu/sai JWT trả về `HTTP 401`; thanh toán cho đơn đã `PAID` hoặc `CANCELLED` trả về `HTTP 409`[cite: 6, 9, 12].