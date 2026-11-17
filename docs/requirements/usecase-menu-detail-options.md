# ĐẶC TẢ USE CASE: XEM CHI TIẾT SẢN PHẨM VÀ CHỌN TÙY CHỌN

Sơ đồ tương ứng: [`usecase-menu-detail-options.puml`](usecase-menu-detail-options.puml), [`activity-customize.puml`](../diagrams/activity-customize.puml), [`sequence-customize.puml`](../diagrams/sequence-customize.puml).

## 1. Thông tin chung

| Thuộc tính | Mô tả |
| :--- | :--- |
| Mã Use Case | UC-02 (Xem chi tiết sản phẩm), UC-03 (Chọn tùy chọn sản phẩm) |
| Tên Use Case | Xem chi tiết sản phẩm và chọn tùy chọn (size, topping) |
| Actor chính | Khách hàng |
| Actor phụ | Không có |
| Mục tiêu | Cho phép khách hàng xem thông tin chi tiết một sản phẩm, biết size và topping nào còn hàng, chọn một size (bắt buộc) và các topping (tùy chọn) và xem giá tương ứng với lựa chọn. |
| Mức độ ưu tiên | Must |
| Yêu cầu liên quan | FR-02, FR-03 |
| Use case liên quan | UC-01 Xem menu (UC-02 `«extend»` UC-01); UC-04 Thêm vào giỏ hàng (UC-04 `«include»` UC-03) |

## 2. Actor

- **Khách hàng:** Người truy cập BrewLite để xem và chọn đồ uống. Không cần đăng nhập ở use case này.

## 3. Trigger

Khách hàng chọn một sản phẩm trong danh sách menu.

## 4. Tiền điều kiện

- Trang menu đã tải thành công và đang hiển thị danh sách sản phẩm (UC-01).
- API và cơ sở dữ liệu hoạt động bình thường.

## 5. Hậu điều kiện

**Thành công:**

- Giao diện hiển thị chi tiết sản phẩm cùng danh sách size và topping.
- Một size đã được chọn, danh sách topping đã chọn (có thể rỗng) được cập nhật.
- Giá tùy chọn (giá size + tổng giá topping) được hiển thị cho khách hàng.
- Không có dữ liệu nào trên máy chủ bị thay đổi. Không thêm sản phẩm vào giỏ hàng, không tạo `Order` hoặc `OrderItem`.

**Thất bại:**

- Chi tiết sản phẩm không được hiển thị, khách hàng nhận được thông báo lỗi.

## 6. Luồng chính

### 6.1. Xem chi tiết sản phẩm (UC-02)

1. Khách hàng chọn một sản phẩm từ menu.
2. Giao diện Next.js gửi yêu cầu `GET /api/products/{id}` đến API.
3. API (`ProductsController`) tìm sản phẩm đang hoạt động theo `id` hoặc `slug` trong PostgreSQL, kèm size, topping và công thức nguyên liệu.
4. PostgreSQL trả dữ liệu sản phẩm.
5. API tính `availableQuantity` cho từng size và từng topping.
6. API trả `200 OK` kèm thông tin chi tiết sản phẩm.
7. Giao diện hiển thị chi tiết sản phẩm, danh sách size và danh sách topping.

### 6.2. Chọn tùy chọn (UC-03)

8. Giao diện kiểm tra các size còn hàng. Có ít nhất một size còn hàng thì ưu tiên chọn sẵn size `M`; nếu `M` hết hàng thì chọn size còn hàng đầu tiên. Danh sách topping được đặt về rỗng.
9. Khách hàng chọn size mong muốn. Giao diện cập nhật size được chọn.
10. Khách hàng chọn hoặc bỏ chọn các topping (không bắt buộc, được chọn nhiều). Với mỗi thao tác, giao diện cập nhật danh sách topping.
11. Giao diện tính giá tùy chọn = **giá size + tổng giá các topping đã chọn** và hiển thị cho khách hàng.
12. Khách hàng hoàn tất lựa chọn. Use case kết thúc; lựa chọn được dùng tiếp ở UC-04 (Thêm vào giỏ hàng).

## 7. Luồng thay thế

### 7.1. Đổi size hoặc topping nhiều lần

- Tại bước 9 hoặc 10, khách hàng đổi lựa chọn bao nhiêu lần tùy ý. Mỗi lần đổi, giao diện cập nhật lựa chọn và tính lại giá như bước 11.

### 7.2. Không chọn topping

- Tại bước 10, khách hàng bỏ qua topping. Giá tùy chọn bằng giá size.

### 7.3. Mở sản phẩm bằng slug

- API chấp nhận `slug` thay cho `id` ở bước 2 và 3. Luồng sau đó giữ nguyên.

### 7.4. Đóng chi tiết sản phẩm

- Khách hàng đóng cửa sổ chi tiết. Giao diện quay về danh sách menu và các lựa chọn chưa thêm vào giỏ không được giữ lại.

## 8. Luồng ngoại lệ

### 8.1. Không tìm thấy sản phẩm

- Tại bước 3, nếu sản phẩm không tồn tại hoặc đã ngừng kinh doanh, API trả `404 Not Found`.
- Giao diện hiển thị thông báo lỗi và không hiển thị chi tiết sản phẩm.

### 8.2. Lỗi tải chi tiết

- Tại bước 2 đến 6, nếu API lỗi hoặc mất kết nối, giao diện hiển thị thông báo lỗi. Khách hàng có thể chọn lại sản phẩm để thử lại.

### 8.3. Không có size còn hàng

- Tại bước 8, nếu tất cả size đều hết hàng, giao diện vẫn hiển thị chi tiết sản phẩm nhưng vô hiệu hóa tất cả nút size và không chọn sẵn size nào. Khách hàng không thể hoàn tất lựa chọn.

### 8.4. Topping hết hàng

- Topping có số lượng còn lại bằng 0 bị vô hiệu hóa và hiển thị "Hết hàng", khách hàng không thể chọn.

## 9. Quy tắc nghiệp vụ

- Chỉ hiển thị chi tiết của sản phẩm đang hoạt động.
- Phải chọn đúng một size. Topping là tùy chọn và được chọn nhiều.
- Size có số lượng còn lại bằng 0 không thể chọn.
- Giá tùy chọn của một ly = giá size + tổng giá các topping đã chọn (FR-03).
- `availableQuantity` của size được tính từ tồn nguyên liệu theo công thức; size không có công thức dùng tồn của sản phẩm. Topping có công thức nguyên liệu mới có `availableQuantity`.
- Giá hiển thị chỉ mang tính tạm tính. Giá chính thức do máy chủ tính lại khi đặt hàng.
- Use case chỉ tải dữ liệu sản phẩm và cập nhật lựa chọn trên giao diện.

## 10. Phạm vi không thực hiện

Use Case này không bao gồm:

- Thêm sản phẩm vào giỏ, sửa số lượng, xóa dòng giỏ hàng, kiểm tra giới hạn tồn so với giỏ hàng (UC-04, xem `activity-addtocart` và `sequence-addtocart`).
- Đặt hàng và thanh toán.
- Quản lý sản phẩm, công thức và tồn kho.

## 11. Liên kết yêu cầu

| Mã yêu cầu | Nội dung yêu cầu |
| :--- | :--- |
| FR-02 | `GET /products/:id` (đường dẫn đầy đủ `/api/products/:id`); ID lạ trả 404. Xem chi tiết, size, topping. |
| FR-03 | Tổng = (size + topping) × số lượng, cập nhật tức thời. |

## 12. Tiêu chí chấp nhận (Acceptance Criteria)

| Mã | Tiêu chí chấp nhận | Kết quả mong đợi |
| :--- | :--- | :--- |
| AC01 | Khách hàng chọn một sản phẩm hợp lệ trong menu. | Giao diện gọi `GET /api/products/{id}` và hiển thị chi tiết sản phẩm. |
| AC02 | Chi tiết sản phẩm tải thành công. | Hiển thị thông tin sản phẩm, danh sách size kèm giá và số ly còn lại, danh sách topping kèm giá. |
| AC03 | Vừa mở chi tiết, size `M` còn hàng. | Size `M` được chọn sẵn, chưa có topping nào được chọn. |
| AC04 | Vừa mở chi tiết, size `M` hết hàng. | Size còn hàng đầu tiên được chọn sẵn. |
| AC05 | Khách hàng đổi size. | Giá tùy chọn cập nhật theo giá size mới. |
| AC06 | Khách hàng chọn thêm hoặc bỏ chọn topping. | Giá tùy chọn tăng hoặc giảm đúng bằng giá topping. |
| AC07 | Khách hàng không chọn topping nào. | Giá tùy chọn bằng giá size. |
| AC08 | Size có số lượng còn lại bằng 0. | Size không thể chọn. |
| AC09 | Topping có số lượng còn lại bằng 0. | Topping bị vô hiệu hóa, hiển thị "Hết hàng". |
| AC10 | Tất cả size đều hết hàng. | Tất cả nút size bị vô hiệu hóa, không có size nào được chọn sẵn. |
| AC11 | Khách hàng yêu cầu sản phẩm không tồn tại hoặc ngừng bán. | API trả `404 Not Found`, giao diện hiển thị thông báo lỗi. |
| AC12 | API lỗi hoặc mất kết nối khi tải chi tiết. | Giao diện hiển thị thông báo lỗi. |
| AC13 | Khách hàng hoàn tất lựa chọn. | Không có sản phẩm nào được thêm vào giỏ, không có `Order` hoặc `OrderItem` được tạo. |

## 13. Kết luận

Use Case UC-02 và UC-03 mô tả quá trình khách hàng mở chi tiết một sản phẩm, xem tình trạng còn hàng của size và topping, rồi chọn một size và các topping với giá tùy chọn được cập nhật tức thời. Kết quả là lựa chọn hợp lệ để chuyển sang UC-04 (Thêm vào giỏ hàng). Đặc tả là cơ sở cho `activity-customize`, `sequence-customize` và các trường hợp kiểm thử tương ứng.
