# ADR 004 — GHCR và Argo CD trên OCI

GitHub Actions kiểm thử source trên `main` và xuất image AMD64, ARM64 theo commit SHA. Sau khi cả hai image được push, workflow cập nhật đồng thời hai tag và manifest tương ứng trên nhánh `production`. Argo CD đồng bộ overlay từ nhánh này vào K3s.

API dùng init container để áp dụng migration và seed danh mục. PostgreSQL lưu dữ liệu trên PVC và phục vụ qua mạng nội bộ. K3s một node phù hợp cho bản demo. Nếu VM mất, cần bản sao lưu ngoài VM để khôi phục dữ liệu.
