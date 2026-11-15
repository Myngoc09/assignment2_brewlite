# 1.4 UC-0 Lịch sử đơn hàng

@startuml BrewLite-UseCase-XemLichSuDonHang
left to right direction
actor "Khách hàng" as Customer
rectangle "BrewLite - Hệ thống đặt đồ uống" {
    usecase "Xem lịch sử đơn hàng" as UC_History
}
Customer --> UC_History
@enduml

- **Actor chính:** khách hàng. 
- **Mục tiêu:** cho phép khách hàng xem quá trình trạng thái đơn hàng 
- **Trigger:** khách hàng đã đăng nhập và chọn chức năng "Lịch sử đơn hàng" trên hệ thống.
- **Tiền điều kiện:** khách hàng đã đăng nhập thành công trên hệ thống.
- **Hậu điều kiện thành công:** danh sách các đơn hàng đã đặt của khách hàng được hiển thị.
- **Hậu điều kiện thất bại:** danh sách lịch sử đơn hàng không được hiển thị.

## Luồng chính
1. Khách hàng đăng nhập vào hệ thống BrewLite.
2. Khách hàng truy cập mục "Lịch sử đơn hàng".
3. Hệ thống tiếp nhận yêu cầu xem lịch sử đơn hàng.
4. Hệ thống truy vấn danh sách đơn hàng thuộc tài khoản khách hàng đang đăng nhập.
5. Hệ thống hiển thị danh sách đơn hàng, bao gồm mã đơn hàng, ngày đặt, tổng tiền và trạng thái đơn hàng.
6. Khách hàng xem thông tin các đơn hàng đã đặt.
7. Use Case kết thúc.

## Luồng thay thế
- A1 Tại bước 4, nếu khách hàng chưa từng đặt hàng, hệ thống hiển thị thông báo "Bạn chưa có đơn hàng nào".

## Ngoại lệ
- E1 Tại bước 4, nếu hệ thống không thể kết nối cơ sở dữ liệu, hệ thống thông báo lỗi và yêu cầu khách hàng thử lại sau.

**Trace:** FR-07
