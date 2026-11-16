# ĐẶC TẢ USE CASE: XEM MENU

## 1. Thông tin chung

| Thuộc tính | Mô tả |
|Mã Use Case|UC-01|
| Tên Use Case | Xem menu |
| Actor chính | Khách hàng |
| Mục tiêu | Cho phép khách hàng xem danh sách sản phẩm đang được kinh doanh trên hệ thống BrewLite và tìm kiếm, lọc, xem thông tin chi tiết sản phẩm. |
| Mức độ ưu tiên | Must |
| Yêu cầu liên quan | FR-01, FR-02 |

## 2. Actor

- **Khách hàng:** Người truy cập hệ thống để xem danh sách đồ uống, bánh và các sản phẩm đang được kinh doanh.

## 3. Trigger

Khách hàng truy cập trang menu của hệ thống BrewLite.

## 4. Tiền điều kiện

- Hệ thống BrewLite có thể truy cập được.
- Dịch vụ API và cơ sở dữ liệu hoạt động bình thường để cung cấp dữ liệu sản phẩm.

## 5. Hậu điều kiện

- Danh sách sản phẩm được hiển thị cho khách hàng.
- Khách hàng có thể tìm kiếm, lọc sản phẩm theo danh mục hoặc xem thông tin chi tiết sản phẩm.
- Không có dữ liệu sản phẩm nào bị thay đổi trong quá trình xem menu.

## 6. Luồng chính

1. Khách hàng truy cập trang menu.
2. Hệ thống gửi yêu cầu lấy danh sách sản phẩm đến API.
3. API truy vấn danh sách sản phẩm đang hoạt động từ PostgreSQL.
4. Cơ sở dữ liệu trả về danh sách sản phẩm.
5. API xử lý dữ liệu sản phẩm và thông tin khả năng phục vụ.
6. Hệ thống trả danh sách sản phẩm về giao diện.
7. Giao diện hiển thị danh sách sản phẩm cho khách hàng.
8. Khách hàng xem các sản phẩm được hiển thị.

## 7. Luồng thay thế

### 7.1. Tìm kiếm sản phẩm

1. Tại trang menu, khách hàng nhập từ khóa tìm kiếm.
2. Hệ thống lọc danh sách sản phẩm theo tên.
3. Hệ thống hiển thị các sản phẩm phù hợp với từ khóa.

### 7.2. Lọc sản phẩm theo danh mục

1. Khách hàng chọn một danh mục sản phẩm.
2. Hệ thống lọc danh sách sản phẩm theo danh mục đã chọn.
3. Hệ thống hiển thị danh sách sản phẩm phù hợp.

### 7.3. Xem chi tiết sản phẩm

1. Khách hàng chọn một sản phẩm trong danh sách.
2. Hệ thống gửi yêu cầu lấy thông tin chi tiết sản phẩm đến API.
3. API truy vấn sản phẩm theo ID hoặc slug.
4. Cơ sở dữ liệu trả về thông tin sản phẩm.
5. API xử lý dữ liệu và thông tin khả năng phục vụ.
6. Hệ thống hiển thị thông tin chi tiết sản phẩm cho khách hàng.

## 8. Luồng ngoại lệ

### 8.1. Không thể tải danh sách sản phẩm

- Khi API không thể cung cấp dữ liệu hoặc xảy ra lỗi kết nối, hệ thống hiển thị thông báo lỗi.
- Hệ thống cung cấp nút "Thử lại" để khách hàng thực hiện lại yêu cầu tải menu.

### 8.2. Không tìm thấy sản phẩm phù hợp

- Khi danh sách sản phẩm sau khi tìm kiếm hoặc lọc không có kết quả, hệ thống hiển thị thông báo "Chưa tìm thấy món phù hợp".

### 8.3. Không tìm thấy sản phẩm khi xem chi tiết

- Khi khách hàng chọn sản phẩm không tồn tại hoặc không còn hoạt động, API trả về lỗi 404.
- Hệ thống thông báo không tìm thấy sản phẩm cho khách hàng.

## 9. Quy tắc nghiệp vụ

- Chỉ hiển thị các sản phẩm đang hoạt động.
- Danh sách sản phẩm được sắp xếp theo tên.
- Tìm kiếm sản phẩm được thực hiện dựa trên tên sản phẩm.
- Khách hàng có thể kết hợp tìm kiếm và lọc theo danh mục.
- Thông tin chi tiết chỉ được hiển thị đối với sản phẩm hợp lệ và đang hoạt động.

## 10. Phạm vi không thực hiện

Use Case Xem menu không bao gồm các chức năng:

- Thêm sản phẩm vào giỏ hàng.
- Đặt hàng và thanh toán.
- Quản lý hoặc cập nhật sản phẩm.
- Quản lý tồn kho.

## 11. Liên kết yêu cầu

| Mã yêu cầu | Nội dung yêu cầu |
|FR-01|GET /products trả tên, mô tả, size/giá/tồn; hiển thị trạng thái rỗng khi không có sản phẩm. |
| FR-02 |GET /products/; ID không hợp lệ trả về 404. |

## 12. Tiêu chí chấp nhận (Acceptance Criteria)

| Mã | Tiêu chí chấp nhận | Kết quả mong đợi |
|---|---|---|
| AC01 | Khách hàng truy cập trang menu khi có dữ liệu sản phẩm. | Hệ thống hiển thị danh sách sản phẩm đang hoạt động. |
| AC02 | Danh sách sản phẩm được tải thành công. | Mỗi sản phẩm hiển thị tên, mô tả, size, giá và tình trạng tồn kho. |
| AC03 | API trả về danh sách sản phẩm rỗng. | Hệ thống hiển thị trạng thái danh sách trống. |
| AC04 | Khách hàng nhập từ khóa tìm kiếm. | Hệ thống hiển thị các sản phẩm có tên phù hợp với từ khóa. |
| AC05 | Khách hàng chọn một danh mục. | Hệ thống hiển thị các sản phẩm thuộc danh mục được chọn. |
| AC06 | Khách hàng kết hợp tìm kiếm và lọc danh mục. | Hệ thống hiển thị các sản phẩm thỏa mãn đồng thời cả hai điều kiện. |
| AC07 | Khách hàng chọn một sản phẩm hợp lệ. | Hệ thống gọi API và hiển thị thông tin chi tiết sản phẩm. |
| AC08 | Thông tin chi tiết sản phẩm được tải thành công. | Hệ thống hiển thị mô tả, size, giá và các tùy chọn topping. |
| AC09 | Khách hàng yêu cầu xem sản phẩm không tồn tại hoặc không hợp lệ. | API trả về 404 Not Found và hệ thống thông báo không tìm thấy sản phẩm. |
| AC10 | API không thể tải danh sách sản phẩm. | Hệ thống hiển thị thông báo lỗi và nút "Thử lại". |
| AC11 | API không thể tải chi tiết sản phẩm do lỗi hệ thống hoặc kết nối. | Hệ thống hiển thị thông báo lỗi. |

## 13. Kết luận

Use Case UC-01 – Xem menu mô tả quá trình khách hàng truy cập và xem danh sách sản phẩm, tìm kiếm sản phẩm theo tên, lọc sản phẩm theo danh mục và xem thông tin chi tiết sản phẩm.

Chức năng này đáp ứng hai yêu cầu chức năng FR-01 và FR-02 trong tài liệu SRS. Đặc tả cũng là cơ sở để xây dựng Sequence Diagram, Activity Diagram và các trường hợp kiểm thử cho chức năng Xem menu.