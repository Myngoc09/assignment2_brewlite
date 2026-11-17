# ĐẶC TẢ USE CASE: ĐĂNG KÝ VÀ ĐĂNG NHẬP

Sơ đồ use case: [usecase-auth.puml](usecase-auth.puml) · [usecase-auth.svg](usecase-auth.svg)

Sơ đồ liên quan: [activity-register](../diagrams/activity-register.svg) · [sequence-register](../diagrams/sequence-register.svg) · [sequence-login](../diagrams/sequence-login.svg)

---

# UC-05: ĐĂNG KÝ TÀI KHOẢN

## 1. Thông tin chung

| Thuộc tính | Mô tả |
|---|---|
| Mã Use Case | UC-05 |
| Tên Use Case | Đăng ký tài khoản |
| Actor chính | Khách hàng |
| Mục tiêu | Cho phép khách hàng tạo tài khoản BrewLite bằng họ tên, email và mật khẩu để có thể đặt hàng, thanh toán và xem lịch sử đơn. |
| Mức độ ưu tiên | Must |
| Yêu cầu liên quan | FR-04, NFR-02 |

## 2. Actor

- **Khách hàng:** Người truy cập hệ thống chưa có tài khoản và muốn đăng ký thành viên.

## 3. Trigger

Khách hàng bấm **Đăng nhập** trên thanh điều hướng, chọn **Chưa có tài khoản? Đăng ký**, rồi bấm **Tạo tài khoản**.

## 4. Tiền điều kiện

- Hệ thống BrewLite có thể truy cập được.
- Dịch vụ API và cơ sở dữ liệu hoạt động bình thường.
- Khách hàng chưa đăng nhập.

## 5. Hậu điều kiện

- **Thành công:** Tài khoản mới được lưu với vai trò `CUSTOMER`. Mật khẩu được lưu dưới dạng băm. Khách hàng được đăng nhập ngay, giao diện hiển thị lời chào kèm tên.
- **Thất bại:** Không có tài khoản nào được tạo. Giao diện hiển thị thông báo lỗi và khách hàng có thể nhập lại.

## 6. Luồng chính

1. Khách hàng mở form đăng nhập và chuyển sang chế độ **Đăng ký**.
2. Khách hàng nhập họ tên, email và mật khẩu (tối thiểu 8 ký tự), sau đó bấm **Tạo tài khoản**.
3. Giao diện gửi `POST /api/auth/register` với họ tên, email và mật khẩu.
4. API kiểm tra dữ liệu đầu vào (email đúng định dạng, mật khẩu tối thiểu 8 ký tự).
5. API cắt khoảng trắng đầu cuối của họ tên và kiểm tra họ tên không rỗng.
6. API chuyển email về chữ thường và băm mật khẩu bằng bcrypt (12 vòng).
7. API tạo người dùng mới trong PostgreSQL với vai trò mặc định `CUSTOMER`.
8. API ký JWT chứa `sub`, `email`, `role` và trả về `accessToken` cùng thông tin người dùng (không gồm mật khẩu băm).
9. Giao diện lưu token và thông tin người dùng vào `localStorage`, cập nhật trạng thái đã đăng nhập, đóng form và hiển thị lời chào "Xin chào <tên>".

## 7. Luồng thay thế

### 7.1. Chuyển sang đăng nhập

1. Tại form đăng ký, khách hàng bấm **Đã có tài khoản? Đăng nhập**.
2. Hệ thống chuyển sang form đăng nhập (UC-06).

### 7.2. Đóng form

1. Khách hàng bấm nút đóng hoặc bấm ra ngoài form.
2. Hệ thống đóng form, không tạo tài khoản.

## 8. Luồng ngoại lệ

### 8.1. Form không hợp lệ ở giao diện

- Khi thiếu trường bắt buộc, email sai định dạng hoặc mật khẩu ngắn hơn 8 ký tự, trình duyệt báo lỗi trên form và không gửi yêu cầu.

### 8.2. Dữ liệu không hợp lệ ở API

- Khi DTO không hợp lệ, API trả `400 Bad Request`. Giao diện hiển thị thông báo lỗi.

### 8.3. Họ tên rỗng

- Khi họ tên rỗng sau khi cắt khoảng trắng, API trả `400 Bad Request` với thông báo "Name required".

### 8.4. Email đã được đăng ký

- Khi email đã tồn tại (lỗi trùng khóa duy nhất `P2002`), API trả `400 Bad Request` với thông báo "Email already registered". Không có tài khoản mới nào được tạo.

### 8.5. Không kết nối được máy chủ

- Khi API không phản hồi hoặc xảy ra lỗi hệ thống, giao diện hiển thị thông báo lỗi. Khách hàng có thể gửi lại.

## 9. Quy tắc nghiệp vụ

- Email là duy nhất trong hệ thống, không phân biệt chữ hoa chữ thường (email được lưu dạng chữ thường).
- Mật khẩu tối thiểu 8 ký tự và chỉ được lưu dưới dạng băm bcrypt.
- Họ tên là bắt buộc khi đăng ký.
- Tài khoản tự đăng ký luôn có vai trò `CUSTOMER`.
- API không trả mật khẩu băm trong phản hồi.
- Đăng ký thành công đồng thời đăng nhập, không cần nhập lại thông tin.

## 10. Phạm vi không thực hiện

Use Case Đăng ký tài khoản không bao gồm các chức năng:

- Xác thực email hoặc mã OTP.
- Khôi phục hoặc đổi mật khẩu.
- Cấp vai trò `STAFF` hoặc `MANAGER` (tài khoản vận hành do dữ liệu seed cung cấp).

## 11. Liên kết yêu cầu

| Mã yêu cầu | Nội dung yêu cầu |
|---|---|
| FR-04 | Đăng ký/đăng nhập: email duy nhất, password >= 8, trả JWT, không trả hash. |
| NFR-02 | Bảo mật: JWT, bcrypt, DTO whitelist, CORS allowlist, không log secret. |

## 12. Tiêu chí chấp nhận (Acceptance Criteria)

| Mã | Tiêu chí chấp nhận | Kết quả mong đợi |
|---|---|---|
| AC01 | Khách hàng nhập họ tên, email hợp lệ chưa đăng ký và mật khẩu từ 8 ký tự. | API tạo tài khoản và trả `accessToken` cùng thông tin người dùng. |
| AC02 | Đăng ký thành công. | Giao diện lưu phiên, đóng form và hiển thị lời chào kèm tên. |
| AC03 | Phản hồi đăng ký thành công. | Phản hồi không chứa mật khẩu băm. |
| AC04 | Khách hàng nhập mật khẩu ngắn hơn 8 ký tự hoặc email sai định dạng. | Hệ thống từ chối và hiển thị thông báo lỗi. |
| AC05 | Khách hàng để trống họ tên hoặc chỉ nhập khoảng trắng. | API trả `400` với thông báo "Name required". |
| AC06 | Khách hàng đăng ký bằng email đã tồn tại. | API trả `400` với thông báo "Email already registered". |
| AC07 | Khách hàng đăng ký email với chữ hoa chữ thường khác nhau. | Hệ thống coi là cùng một email. |
| AC08 | Tài khoản vừa đăng ký. | Tài khoản có vai trò `CUSTOMER`. |

---

# UC-06: ĐĂNG NHẬP

## 1. Thông tin chung

| Thuộc tính | Mô tả |
|---|---|
| Mã Use Case | UC-06 |
| Tên Use Case | Đăng nhập |
| Actor chính | Khách hàng (đồng thời áp dụng cho Nhân viên và Quản lý khi đăng nhập) |
| Mục tiêu | Cho phép người dùng đã có tài khoản xác thực bằng email và mật khẩu để nhận JWT và sử dụng các chức năng yêu cầu đăng nhập. |
| Mức độ ưu tiên | Must |
| Yêu cầu liên quan | FR-04, NFR-02 |

## 2. Actor

- **Khách hàng:** Người dùng đã có tài khoản và muốn đăng nhập để đặt hàng, thanh toán hoặc xem lịch sử đơn.

## 3. Trigger

Khách hàng bấm **Đăng nhập** trên thanh điều hướng, hoặc hệ thống mở form đăng nhập khi khách thực hiện thao tác cần xác thực.

## 4. Tiền điều kiện

- Hệ thống BrewLite có thể truy cập được.
- Dịch vụ API và cơ sở dữ liệu hoạt động bình thường.
- Người dùng đã có tài khoản (UC-05).

## 5. Hậu điều kiện

- **Thành công:** Giao diện lưu JWT và thông tin người dùng, hiển thị lời chào kèm tên. Các yêu cầu sau đó gửi kèm `Authorization: Bearer <token>`.
- **Thất bại:** Người dùng vẫn ở trạng thái chưa đăng nhập. Giao diện hiển thị thông báo lỗi.

## 6. Luồng chính

1. Khách hàng bấm **Đăng nhập** và nhập email, mật khẩu.
2. Khách hàng bấm **Đăng nhập** trên form.
3. Giao diện gửi `POST /api/auth/login` với email và mật khẩu.
4. API kiểm tra dữ liệu đầu vào và chuyển email về chữ thường.
5. API tìm người dùng theo email trong PostgreSQL.
6. API so khớp mật khẩu nhập vào với mật khẩu băm đã lưu bằng bcrypt.
7. API ký JWT chứa `sub`, `email`, `role` (thời hạn mặc định 1 ngày) và trả về `accessToken` cùng thông tin người dùng (không gồm mật khẩu băm).
8. Giao diện lưu token và thông tin người dùng vào `localStorage`, đóng form và hiển thị lời chào "Xin chào <tên>".

## 7. Luồng thay thế

### 7.1. Chuyển sang đăng ký

1. Tại form đăng nhập, khách hàng bấm **Chưa có tài khoản? Đăng ký**.
2. Hệ thống chuyển sang form đăng ký (UC-05).

### 7.2. Khôi phục phiên khi mở lại trang

1. Khi tải lại trang, giao diện đọc token và thông tin người dùng từ `localStorage`.
2. Nếu có, giao diện giữ trạng thái đã đăng nhập mà không cần nhập lại.

### 7.3. Đăng xuất

1. Đã đăng nhập, khách hàng bấm nút **Thoát**.
2. Giao diện xóa token và thông tin người dùng khỏi `localStorage` và trở về trạng thái chưa đăng nhập.

## 8. Luồng ngoại lệ

### 8.1. Dữ liệu không hợp lệ

- Khi email sai định dạng hoặc mật khẩu ngắn hơn 8 ký tự, trình duyệt hoặc API (`400 Bad Request`) từ chối và giao diện hiển thị thông báo lỗi.

### 8.2. Sai email hoặc mật khẩu

- Khi không tìm thấy người dùng hoặc mật khẩu không khớp, API trả `401 Unauthorized` với thông báo "Email or password is incorrect".
- Hệ thống dùng cùng một thông báo cho cả hai trường hợp để không tiết lộ email nào đã đăng ký.

### 8.3. Không kết nối được máy chủ

- Khi API không phản hồi hoặc xảy ra lỗi hệ thống, giao diện hiển thị thông báo lỗi. Người dùng có thể thử lại.

### 8.4. JWT hết hạn hoặc không hợp lệ khi dùng chức năng khác

- API trả `401 Unauthorized` với thông báo "Invalid or expired token" hoặc "Bearer token required". Người dùng cần đăng nhập lại.

## 9. Quy tắc nghiệp vụ

- Email được chuẩn hóa về chữ thường trước khi tìm kiếm.
- Mật khẩu được so khớp với mật khẩu băm bằng bcrypt, không lưu hoặc trả mật khẩu gốc.
- JWT chứa `sub` (mã người dùng), `email` và `role`, hết hạn theo cấu hình (mặc định 1 ngày).
- Phản hồi đăng nhập không chứa mật khẩu băm.
- Thông báo lỗi không phân biệt sai email hay sai mật khẩu.
- Đặt đơn, thanh toán, xem lịch sử, hủy đơn và các thao tác vận hành đều yêu cầu JWT hợp lệ.

## 10. Phạm vi không thực hiện

Use Case Đăng nhập không bao gồm các chức năng:

- Đăng nhập bằng mạng xã hội hoặc xác thực hai yếu tố.
- Khôi phục hoặc đổi mật khẩu.
- Làm mới token (refresh token).
- Khóa tài khoản sau nhiều lần đăng nhập sai.

## 11. Liên kết yêu cầu

| Mã yêu cầu | Nội dung yêu cầu |
|---|---|
| FR-04 | Đăng ký/đăng nhập: email duy nhất, password >= 8, trả JWT, không trả hash. |
| NFR-02 | Bảo mật: JWT, bcrypt, DTO whitelist, CORS allowlist, không log secret. |

## 12. Tiêu chí chấp nhận (Acceptance Criteria)

| Mã | Tiêu chí chấp nhận | Kết quả mong đợi |
|---|---|---|
| AC01 | Người dùng nhập đúng email và mật khẩu của tài khoản đã đăng ký. | API trả `accessToken` cùng thông tin người dùng. |
| AC02 | Đăng nhập thành công. | Giao diện lưu phiên, đóng form và hiển thị lời chào kèm tên. |
| AC03 | Phản hồi đăng nhập thành công. | Phản hồi không chứa mật khẩu băm. |
| AC04 | Người dùng nhập email chưa đăng ký. | API trả `401` với thông báo "Email or password is incorrect". |
| AC05 | Người dùng nhập sai mật khẩu. | API trả `401` với thông báo "Email or password is incorrect". |
| AC06 | Người dùng nhập email với chữ hoa chữ thường khác lúc đăng ký. | Đăng nhập vẫn thành công. |
| AC07 | Người dùng nhập mật khẩu ngắn hơn 8 ký tự hoặc email sai định dạng. | Hệ thống từ chối và hiển thị thông báo lỗi. |
| AC08 | Gọi API yêu cầu đăng nhập mà không có hoặc có token sai. | API trả `401 Unauthorized`. |
| AC09 | Tải lại trang sau khi đã đăng nhập. | Giao diện vẫn ở trạng thái đã đăng nhập. |

---

## Kết luận

Hai Use Case UC-05 – Đăng ký tài khoản và UC-06 – Đăng nhập mô tả quá trình khách hàng tạo tài khoản, xác thực và nhận JWT để sử dụng các chức năng yêu cầu đăng nhập của BrewLite.

Các chức năng này đáp ứng yêu cầu FR-04 và NFR-02 trong tài liệu SRS. Đặc tả là cơ sở để xây dựng Activity Diagram, Sequence Diagram và các trường hợp kiểm thử cho chức năng đăng ký và đăng nhập.
