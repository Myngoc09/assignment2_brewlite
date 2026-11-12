# Kiểm thử kho nguyên liệu với Thunder Client

Chạy `docker compose up --build -d` rồi dùng base URL `http://localhost:3001/api`. Dùng database demo riêng cho bài thử dưới đây vì bước cấu hình sẽ thay công thức Cloud Matcha. Mỗi request có body dùng **Body → JSON**.

## Đăng nhập và chuẩn bị kho

1. Gửi `POST /auth/login` với `{"email":"staff@brewlite.local","password":"BrewLite123!"}`. Dán `accessToken` vào **Auth → Bearer** cho các request `/inventory`.
2. Gửi `POST /inventory/ingredients` hai lần với `{"code":"DEMO-MILK","name":"Sữa demo","unit":"ML"}` và `{"code":"DEMO-MATCHA","name":"Matcha demo","unit":"G"}`. Lưu hai `id` trả về. Mã nguyên liệu phải duy nhất. Đơn vị hỗ trợ `ML`, `G` và `PIECE`.
3. Gửi `POST /inventory/ingredients/<milkId>/receipts` với `{"quantity":2000}` và `POST /inventory/ingredients/<matchaId>/receipts` với `{"quantity":24}`. Dùng `GET /inventory/ingredients` để kiểm tra `available` lần lượt là 2000 và 24.

## Đọc công thức và kiểm tra số ly

1. Gửi `GET /products/cloud-matcha`. Lưu `id` của sản phẩm và `id` tương ứng của từng phần tử S/M/L trong `sizes`.
2. Nếu muốn khôi phục công thức sau bài thử, lưu response của `GET /inventory/sizes/<sizeId>/recipe` cho mỗi size.
3. Gửi `PUT /inventory/sizes/<sizeId>/recipe` một lần cho mỗi size. Ví dụ body cho S:

   ```json
   {
     "ingredients": [
       { "ingredientId": "<milkId>", "quantity": 150 },
       { "ingredientId": "<matchaId>", "quantity": 3 }
     ]
   }
   ```

   Dùng cặp định mức 200 ml / 4 g cho M và 250 ml / 5 g cho L. Request `PUT` thay toàn bộ công thức của size. Topping dùng cùng dạng JSON tại `GET` và `PUT /inventory/toppings/<toppingId>/recipe`.
4. Gọi lại `GET /products/cloud-matcha`. Kiểm tra `sizes[].availableQuantity` theo tên size **S = 8, M = 6, L = 4**. Mỗi giá trị giả định toàn bộ nguyên liệu dành cho size đó. Trường `inventory` ở cấp sản phẩm là mức lớn nhất trong các size để tương thích với client cũ.

## Đặt và hủy đơn

1. Đăng nhập bằng `customer@brewlite.local` / `BrewLite123!` và dùng token khách cho các request đơn hàng.
2. Gửi `POST /orders` với `{"items":[{"productId":"<productId>","size":"L","toppings":[],"quantity":2}]}`. Kỳ vọng HTTP 201 và trạng thái `PENDING`. Lưu `id` của đơn.
3. Gọi lại chi tiết sản phẩm. Kỳ vọng **S = 4, M = 3, L = 2**. Dùng token nhân viên gọi `GET /inventory/ingredients/<matchaId>/movements` để thấy bản ghi `RESERVE` với `quantity: 10`.
4. Gửi `PATCH /orders/<orderId>/status` với `{"status":"CANCELLED"}` bằng token khách. Số ly trở về **8 / 6 / 4**, và lịch sử có bản ghi `RELEASE` với `quantity: 10`. Gọi hủy lần nữa phải trả HTTP 409.
5. Thử đặt 5 ly L. API phải trả HTTP 400 và số ly khả dụng giữ nguyên.
6. Khôi phục công thức ban đầu bằng `PUT` với trường `ingredients` đã lưu ở bước trên.

Đơn `PENDING` hoặc `PAYMENT_FAILED` giữ nguyên liệu để khách có thể thử thanh toán lại. Đơn đã bắt đầu pha chế không thể hoàn kho qua thao tác hủy đơn. Nhân viên và quản lý có quyền sử dụng API kho. Size chưa có công thức tiếp tục dùng tồn sản phẩm cũ. Lần seed local đầu tiên tạo tồn mẫu cho danh mục. Seed lại giữ số lượng hiện tại. Seed production chỉ tạo công thức và danh mục nguyên liệu, nên cần nhập lượng tồn thực tế trước khi mở bán.
