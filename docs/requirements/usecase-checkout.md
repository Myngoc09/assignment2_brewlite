
# Đặc tả Use Case: Đặt hàng (UC-04 / Order)

## 1. Thông tin tổng quan

| Thuộc tính | Nội dung chi tiết |
| :--- | :--- |
| **Mã Use Case** | `UC-04` |
| **Tên Use Case** | Đặt hàng (`POST /orders`) |
| **Tác nhân chính (Primary Actor)** | Khách hàng (`Customer`) |
| **Tác nhân phụ (Secondary Actor)** | Không có |
| **Mô tả tóm tắt** | Cho phép khách hàng đã đăng nhập xác nhận thông tin giao hàng và tạo đơn hàng từ các sản phẩm trong giỏ hàng. Hệ thống kiểm tra tính hợp lệ của sản phẩm, số lượng tồn kho, tính toán tổng tiền ở phía máy chủ và lưu thông tin đơn hàng cùng chi tiết đơn hàng vào PostgreSQL với trạng thái `PENDING`. Sau khi tạo đơn thành công, hệ thống làm trống giỏ hàng và chuyển khách hàng sang bước thanh toán. |
| **Trigger (Sự kiện kích hoạt)** | Khách hàng truy cập giỏ hàng, nhấn nút **"Tiến hành đặt hàng"**, xác nhận thông tin giao hàng và nhấn **"Đặt hàng"**. |
| **Tiền điều kiện (Pre-conditions)** | 1. Khách hàng đã đăng nhập và sở hữu JWT hợp lệ.<br>2. Giỏ hàng có ít nhất một sản phẩm hợp lệ.<br>3. Các sản phẩm trong giỏ hàng vẫn đang được kinh doanh.<br>4. Số lượng sản phẩm yêu cầu phải lớn hơn 0.<br>5. Hệ thống có thể kết nối với PostgreSQL. |
| **Hậu điều kiện (Post-conditions)** | **Thành công:**<br>- Bản ghi `Order` được tạo với trạng thái `PENDING`.<br>- Các bản ghi `OrderItem` tương ứng được lưu đầy đủ.<br>- Giỏ hàng được làm trống sau khi tạo đơn thành công.<br>- Số lượng tồn kho không bị thay đổi trong Use Case này.<br>- Khách hàng nhận được mã đơn hàng để tiếp tục thanh toán.<br><br>**Thất bại:**<br>- Đơn hàng không được tạo hoặc không được lưu một phần.<br>- Giỏ hàng được giữ nguyên.<br>- Hệ thống trả về thông báo lỗi phù hợp. |
| **Truy vết yêu cầu (Traceability)** | `FR-03`, `FR-05`, `FR-07`, `NFR-02`, `NFR-05`, `NFR-08` |

---

## 2. Luồng sự kiện (Flows of Events)

### 2.1. Luồng chính (Main Flow - Đặt hàng thành công)

1. Tại giao diện giỏ hàng trên **Next.js**, khách hàng nhấn nút **"Tiến hành đặt hàng"**.
2. Hệ thống hiển thị danh sách sản phẩm trong giỏ hàng, bao gồm tên sản phẩm, size, topping, số lượng, đơn giá và tổng tiền tạm tính.
3. Khách hàng kiểm tra giỏ hàng, nhập hoặc xác nhận thông tin giao hàng, ghi chú đơn hàng (nếu có) và nhấn nút **"Đặt hàng"**.
4. Giao diện **Next.js** gửi yêu cầu `POST /orders` kèm JWT và dữ liệu đặt hàng đến máy chủ **NestJS API**.
5. **NestJS API** xác thực JWT, xác định khách hàng thực hiện yêu cầu và kiểm tra tính hợp lệ của dữ liệu đầu vào.
6. **NestJS API** truy vấn PostgreSQL để kiểm tra thông tin sản phẩm, size, topping, giá bán và số lượng tồn kho tương ứng với các sản phẩm trong đơn hàng.
7. Nếu các thông tin hợp lệ và tồn kho đáp ứng đủ số lượng yêu cầu, hệ thống tính toán lại đơn giá và tổng tiền ở phía Backend, không sử dụng trực tiếp tổng tiền do Frontend gửi lên.
8. **NestJS API** mở một Database Transaction trên PostgreSQL để thực hiện:
   - Tạo bản ghi `Order` mới với trạng thái `PENDING`.
   - Tạo các bản ghi `OrderItem` tương ứng với từng sản phẩm, bao gồm thông tin sản phẩm, size, topping, số lượng và đơn giá tại thời điểm đặt hàng.
9. **NestJS API** commit Database Transaction sau khi các bản ghi được lưu thành công. Số lượng tồn kho được giữ nguyên, không thực hiện thao tác trừ hoặc cập nhật tồn kho trong Use Case này.
10. Sau khi xác nhận tạo đơn hàng thành công, hệ thống làm trống giỏ hàng của khách hàng.
11. **NestJS API** trả về phản hồi thành công, bao gồm mã đơn hàng (`orderId`), thông tin đơn hàng, tổng tiền và trạng thái `PENDING`.
12. Giao diện **Next.js** hiển thị thông báo đặt hàng thành công và chuyển khách hàng sang giao diện thanh toán đơn hàng.

### 2.2. Luồng thay thế (Alternative Flows)

* **AF-01: Giỏ hàng trống**
  - **Tại bước 1 hoặc bước 2 của Luồng chính:** Nếu hệ thống phát hiện giỏ hàng không có sản phẩm:
  - Hệ thống không cho phép khách hàng tiếp tục đặt hàng.
  - Giao diện hiển thị thông báo giỏ hàng đang trống và yêu cầu khách hàng chọn sản phẩm trước khi đặt hàng.

* **AF-02: Sản phẩm hết hàng hoặc không đủ số lượng tồn kho**
  - **Tại bước 6 của Luồng chính:** Nếu hệ thống phát hiện sản phẩm đã hết hàng hoặc số lượng tồn kho không đáp ứng số lượng khách hàng yêu cầu:
  - **NestJS API** từ chối tạo đơn hàng và trả về thông tin sản phẩm không đủ tồn kho.
  - Giao diện **Next.js** hiển thị thông báo cụ thể để khách hàng điều chỉnh số lượng hoặc xóa sản phẩm khỏi giỏ hàng.
  - Khách hàng có thể cập nhật giỏ hàng và thực hiện đặt hàng lại.

* **AF-03: Thông tin giao hàng không hợp lệ**
  - **Tại bước 3 hoặc bước 5 của Luồng chính:** Nếu thông tin giao hàng bị thiếu hoặc không đúng định dạng:
  - Hệ thống thông báo các trường thông tin chưa hợp lệ.
  - Khách hàng được yêu cầu nhập hoặc chỉnh sửa lại thông tin giao hàng.
  - Sau khi thông tin hợp lệ, khách hàng tiếp tục thực hiện đặt hàng.

* **AF-04: Khách hàng gửi lại yêu cầu đặt hàng**
  - **Tại bước 4 của Luồng chính:** Nếu khách hàng gửi lại yêu cầu do nhấn nút nhiều lần hoặc kết nối mạng không ổn định:
  - Hệ thống kiểm tra cơ chế chống gửi yêu cầu trùng lặp (nếu được triển khai).
  - Nếu yêu cầu đã được xử lý trước đó, hệ thống trả về kết quả tương ứng thay vì tạo thêm đơn hàng trùng lặp.

### 2.3. Luồng ngoại lệ (Exception Flows)

* **EF-01: Thiếu hoặc sai mã xác thực JWT**
  - **Tại bước 5 của Luồng chính:** Nếu JWT bị thiếu, hết hạn hoặc không hợp lệ:
  - **NestJS API** từ chối yêu cầu và trả về mã lỗi `HTTP 401 Unauthorized`.
  - Giao diện **Next.js** thông báo phiên đăng nhập đã hết hạn và yêu cầu khách hàng đăng nhập lại.

* **EF-02: Sản phẩm không tồn tại hoặc không còn được kinh doanh**
  - **Tại bước 6 của Luồng chính:** Nếu mã sản phẩm không tồn tại, sản phẩm đã bị ngừng kinh doanh hoặc size/topping không hợp lệ:
  - **NestJS API** từ chối yêu cầu và trả về thông tin lỗi tương ứng (`HTTP 404` hoặc `HTTP 400`).
  - Hệ thống không tạo đơn hàng.
  - Khách hàng được yêu cầu kiểm tra và cập nhật lại giỏ hàng.

* **EF-03: Lỗi kết nối PostgreSQL hoặc lỗi máy chủ**
  - **Tại bước 8 hoặc bước 9 của Luồng chính:** Nếu xảy ra lỗi trong quá trình ghi dữ liệu:
  - **NestJS API** thực hiện rollback Database Transaction.
  - Các bản ghi `Order` và `OrderItem` không bị lưu dở dang.
  - Giỏ hàng không bị làm trống.
  - Hệ thống trả về thông báo lỗi và cho phép khách hàng thử lại sau.

* **EF-04: Dữ liệu đơn hàng không còn hợp lệ tại thời điểm xử lý**
  - **Tại bước 6 hoặc bước 7 của Luồng chính:** Nếu giá sản phẩm hoặc thông tin sản phẩm đã thay đổi so với dữ liệu trong giỏ hàng:
  - Hệ thống sử dụng thông tin giá hiện tại từ PostgreSQL để tính toán lại đơn hàng.
  - Nếu có chênh lệch, hệ thống thông báo cho khách hàng xác nhận lại thông tin và tổng tiền trước khi tiếp tục đặt hàng.

---

## 3. Liên kết sơ đồ & Tiêu chí nghiệm thu (Acceptance Criteria)

- **Sơ đồ Use Case:** `docs/diagrams/usecase-order.svg` (Mã nguồn: `docs/diagrams/usecase-order.puml`).
- **Sơ đồ tuần tự liên quan:** `docs/diagrams/sequence-order.svg`.
- **Sơ đồ hoạt động liên quan:** `docs/diagrams/activity-order.svg`.
- **API tương ứng:** `POST /orders`.
- **Integration Test:** `INT-T03` – Kiểm thử tích hợp chức năng tạo đơn hàng.

**Tiêu chí nghiệm thu kiểm thử (Test Criteria):**

1. Khách hàng có JWT hợp lệ và giỏ hàng chứa sản phẩm hợp lệ có thể tạo đơn hàng thành công; hệ thống lưu đúng một bản ghi `Order` cùng các `OrderItem` tương ứng với trạng thái `PENDING`.
2. Khi giỏ hàng trống, hệ thống từ chối tạo đơn hàng và trả về thông báo phù hợp.
3. Khi sản phẩm hết hàng hoặc số lượng tồn kho không đáp ứng yêu cầu, hệ thống từ chối tạo đơn và thông báo sản phẩm không đủ tồn kho.
4. Khi khách hàng gửi yêu cầu thiếu hoặc sai JWT, hệ thống trả về `HTTP 401 Unauthorized`.
5. Khi xảy ra lỗi trong quá trình lưu `Order` hoặc `OrderItem`, Database Transaction được rollback; không có dữ liệu đơn hàng được lưu dở dang và giỏ hàng vẫn được giữ nguyên.
6. Giá và tổng tiền đơn hàng được Backend tính toán từ dữ liệu trong PostgreSQL, không phụ thuộc vào giá trị tổng tiền do Frontend gửi lên.
7. Sau khi tạo đơn hàng thành công, giỏ hàng được làm trống và khách hàng được chuyển sang bước thanh toán.
8. Trong Use Case Đặt hàng, hệ thống chỉ kiểm tra khả năng đáp ứng tồn kho, không thực hiện trừ hoặc cập nhật số lượng tồn kho.
