# Triển khai BrewLite trên Oracle Cloud với Argo CD

Luồng phát hành là **GitHub Actions → GHCR → Argo CD → K3s trên Oracle Cloud**. Pull request chạy lint, unit test, API E2E, Playwright, build và smoke test Kubernetes. Push vào `main` chạy lại các kiểm tra, build image API và web trên runner AMD64 và ARM64 tương ứng, rồi gộp hai kiến trúc dưới một tag SHA cho mỗi ứng dụng. Sau khi cả hai tag được push, CD cập nhật overlay trên nhánh `production` bằng một commit. Argo CD theo dõi nhánh này để đồng bộ bản đã qua kiểm thử.

## 1. Chuẩn bị VM và cluster

- Tạo VM Linux có nhãn **Always Free Eligible** trong home region của OCI. Ampere A1 dùng ARM64. Kiểm tra hạn mức và dung lượng khả dụng trong Console trước khi tạo. [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- Cài K3s trên VM theo hướng dẫn chính thức. Manifest dùng Traefik và StorageClass mặc định `local-path` của K3s. [Cài K3s](https://docs.k3s.io/quick-start) · [Storage K3s](https://docs.k3s.io/add-ons/storage)
- Dùng `kubectl` với kubeconfig của K3s. Trên VM có thể dùng `sudo k3s kubectl` thay cho `kubectl`. Cài Argo CD theo hướng dẫn và giữ giao diện quản trị sau port-forward. [Cài Argo CD](https://argo-cd.readthedocs.io/en/stable/getting_started/)
- Để truy cập từ Internet, cấu hình địa chỉ công cộng, DNS, firewall trên VM và ingress rule ở OCI. Trước khi cho người dùng đăng nhập qua Internet, cấu hình hostname và TLS trong `k8s/base/ingress.yaml` và cấp chứng chỉ vào Secret TLS cùng namespace. Ingress mẫu dùng HTTP để kiểm tra trong mạng tin cậy. PostgreSQL và API dùng Service nội bộ.

## 2. Phát hành image và chuẩn bị Secret

Merge vào `main` hoặc chạy **CD → Run workflow** trên `main`. Workflow dùng `GITHUB_TOKEN` để ghi package và đẩy nhánh `production`. Nếu tổ chức có ruleset, cấp quyền tạo và cập nhật nhánh `production` cho workflow. Kiểm tra các job `image`, `publish` và `gitops` thành công trước lần sync đầu tiên. Tag `bootstrap` trong source chỉ là giá trị khởi tạo.

Tạo Secret trên cluster. Ví dụ chạy bằng Bash với kubeconfig đã cấu hình. Mật khẩu sinh dạng hex dùng được trong URL PostgreSQL.

```bash
kubectl create namespace brewlite
(
  set -eu
  umask 077
  secret_file=$(mktemp)
  trap 'rm -f "$secret_file"' EXIT
  pg_password=$(openssl rand -hex 24)
  jwt_secret=$(openssl rand -hex 32)
  printf 'POSTGRES_PASSWORD=%s\nDATABASE_URL=postgresql://brewlite:%s@brewlite-postgres:5432/brewlite?schema=public\nJWT_SECRET=%s\n' \
    "$pg_password" "$pg_password" "$jwt_secret" > "$secret_file"
  kubectl -n brewlite create secret generic brewlite-runtime --from-env-file="$secret_file"
)
```

Giữ bản sao an toàn của Secret. Khi đổi mật khẩu sau lần khởi tạo, cập nhật mật khẩu trong PostgreSQL và chuỗi kết nối đồng bộ, rồi khởi động lại API. PVC dùng lưu trữ trên VM nên cần sao lưu PostgreSQL ra ngoài VM.

Nếu package GHCR ở chế độ private, tạo Secret `ghcr-pull` trong namespace `brewlite` từ Docker config đã đăng nhập bằng PAT classic có `read:packages` và quyền đọc cả hai package. Nên dùng thư mục cấu hình Docker riêng cho lần đăng nhập này. [Quyền truy cập GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

```bash
kubectl -n brewlite create secret generic ghcr-pull \
  --type=kubernetes.io/dockerconfigjson \
  --from-file=.dockerconfigjson=/path/to/ghcr-only/config.json
```

Với image public, cluster có thể pull trực tiếp. Nếu repo Git là private, thêm quyền Git chỉ đọc cho Argo CD trước khi tạo Application. Nếu dùng fork, sửa `repoURL` trong `k8s/argocd/application.yaml`. [Kết nối repo private](https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/)

## 3. Đồng bộ và kiểm tra

```bash
kubectl apply -f k8s/argocd/application.yaml
kubectl -n argocd get application brewlite
kubectl -n brewlite get pods,pvc,ingress
```

Đợi Application báo `Synced` và `Healthy`. Init container của API áp dụng migration và seed danh mục trước khi NestJS nhận request. Web gửi `/api/*` qua proxy Next.js đến API nội bộ.

```bash
kubectl -n brewlite port-forward svc/brewlite-web 8080:3000
# Chạy từ terminal thứ hai trên cùng máy.
curl -fsS http://127.0.0.1:8080/
curl -fsS http://127.0.0.1:8080/api/health
curl -fsS http://127.0.0.1:8080/api/products
```

Nếu API chưa lên, xem `kubectl -n brewlite logs deploy/brewlite-api -c migrate` và kiểm tra PostgreSQL đã Ready. Với `ImagePullBackOff`, kiểm tra tên, tag image và quyền đọc GHCR. Kiểm tra lại cùng ba endpoint qua URL HTTPS sau khi mở Ingress.

## Rollback

Chọn một commit đã chạy ổn trên `production`. Tạo commit khôi phục overlay và các manifest của phiên bản đó trên chính nhánh `production` để Argo CD tự sync. Giữ image theo SHA trong GHCR để rollback được. Kiểm tra tương thích schema trước khi hạ phiên bản. Rollback manifest không hoàn tác migration PostgreSQL. Bản phát hành thành công tiếp theo từ `main` sẽ cập nhật lại nhánh `production`.
