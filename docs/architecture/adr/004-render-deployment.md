# ADR 004: Render + GHCR
Render Blueprint định nghĩa hai Docker service Git-backed và PostgreSQL nội bộ. GitHub Actions đóng gói image theo SHA lên GHCR để lưu artifact, rồi gọi Render API triển khai chính SHA đó và đợi cả hai service live trước khi smoke test.

Cách này cho phép API chạy migration và seed catalog trong pre-deploy, đồng thời giữ hai service dưới cùng một Blueprint. Đổi lại, Render thực hiện Docker build riêng và pre-deploy API cần gói hỗ trợ tính năng này. URL và kết quả production được ghi lại sau khi triển khai thực tế.
