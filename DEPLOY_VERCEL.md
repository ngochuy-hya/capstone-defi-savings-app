# Hướng dẫn deploy SaveVault lên Vercel

Deploy app frontend (React + Vite) lên Vercel. Có 2 cách: **Dashboard** (khuyến nghị) hoặc **CLI**.

---

## Chuẩn bị

- Tài khoản [Vercel](https://vercel.com) (đăng ký bằng GitHub/GitLab nếu chưa có).
- Code app đã đẩy lên Git (GitHub / GitLab / Bitbucket).
- Nếu repo là **cả folder Capstone** (có cả `capstone-defi-savings-app` và `capstone-defi-savings-protocol`), cần cấu hình **Root Directory** khi tạo project.

---

## Cách 1: Deploy bằng Vercel Dashboard (từng bước)

### Bước 1: Tạo project mới

1. Vào **[vercel.com/new](https://vercel.com/new)**.
2. Đăng nhập (GitHub / GitLab / Bitbucket) nếu chưa.
3. Chọn **Import** repo chứa code SaveVault (repo Capstone hoặc repo chỉ có app).

### Bước 2: Cấu hình project

Trên màn hình **Configure Project**:

1. **Root Directory**
   - Nếu repo có nhiều folder (ví dụ: `capstone-defi-savings-app`, `capstone-defi-savings-protocol`):
     - Bấm **Edit** bên cạnh Root Directory.
     - Chọn hoặc gõ: **`capstone-defi-savings-app`**.
   - Nếu repo chỉ chứa code app (chỉ có `package.json`, `src/`, … trong root) thì **để trống**.

2. **Framework Preset**  
   Vercel thường tự nhận **Vite**. Nếu không, chọn **Vite**.

3. **Build and Output Settings** (thường không cần sửa):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

**Chưa bấm Deploy** — chuyển sang Bước 3 thêm env.

### Bước 3: Thêm Environment Variables

Trên cùng màn hình Configure, kéo xuống **Environment Variables**.

Thêm từng biến (Name + Value). Hoặc copy khối dưới rồi paste từng dòng vào form (một số dashboard cho phép paste nhiều dòng):

| Name | Value |
|------|--------|
| `VITE_MOCK_USDC_ADDRESS` | `0xF38A9Ed7840aB6eef41DF9d88b19fFf7443AA656` |
| `VITE_SAVINGS_BANK_ADDRESS` | `0x3B6e54bb5B36a89838435EC504cE78B3B7Fd29DC` |
| `VITE_TOKEN_VAULT_ADDRESS` | `0x3F371D9b7AF25DF7fcE3DEE044a11825ACDeFD64` |
| `VITE_INTEREST_VAULT_ADDRESS` | `0x5a17868C3d6E1d3f19Ea56c483eA10aE5050051F` |
| `VITE_DEPOSIT_NFT_ADDRESS` | `0x5f7Ac1Dc1180D652aa06B3eA7017B9E76bc46765` |
| `VITE_CHAIN_ID` | `11155111` |
| `VITE_CHAIN_NAME` | `Sepolia` |
| `VITE_RPC_URL` | `https://ethereum-sepolia-rpc.publicnode.com` |
| `VITE_BLOCK_EXPLORER` | `https://sepolia.etherscan.io` |
| `VITE_APP_NAME` | `SaveVault` |
| `VITE_APP_DESCRIPTION` | `Smart Savings Protocol on Ethereum` |

- **Environment:** chọn **Production** (và Preview nếu muốn preview build cũng dùng Sepolia).
- Bấm **Add** sau mỗi biến (hoặc theo hướng dẫn của form).

Nếu bạn dùng contract khác (mainnet / testnet khác), thay địa chỉ và RPC/explorer cho đúng.

### Bước 4: Deploy

1. Bấm **Deploy**.
2. Đợi build (1–3 phút). Nếu lỗi, xem log trên Vercel (Build Logs).
3. Khi xong, Vercel hiện **Visit** → bấm vào để mở URL dạng `https://tên-project.vercel.app`.

### Bước 5: (Tùy chọn) Đổi tên project / domain

- Vào **Project → Settings → General** → **Project Name** → đổi thành tên bạn muốn (ví dụ `savevault`) → URL sẽ thành `https://savevault.vercel.app`.
- Hoặc **Settings → Domains** để gắn domain riêng.

---

## Cách 2: Deploy bằng Vercel CLI

### Cài đặt và đăng nhập (một lần)

```bash
npm i -g vercel
vercel login
```

(Làm theo hướng dẫn trong trình duyệt để login.)

### Deploy lần đầu

```bash
cd capstone-defi-savings-app
vercel
```

- Hỏi **Set up and deploy?** → chọn **Y**.
- Hỏi **Which scope?** → chọn tài khoản/team.
- Hỏi **Link to existing project?** → chọn **N** (tạo project mới).
- Hỏi **Project name?** → Enter (dùng tên mặc định) hoặc gõ tên bạn muốn.
- Hỏi **In which directory is your code located?** → Enter (`.` vì đang ở trong `capstone-defi-savings-app`).

CLI sẽ build và cho link dạng `https://xxx.vercel.app`. **Lần đầu thường thiếu env** → app có thể chạy nhưng contract address sai. Thêm env như sau.

### Thêm Environment Variables (CLI)

**Cách A — Trên Dashboard (nhanh):**

1. Vào [vercel.com](https://vercel.com) → chọn project vừa tạo.
2. **Settings → Environment Variables** → thêm từng biến `VITE_*` như bảng ở Bước 3 (Cách 1).
3. Sau đó chạy lại: `vercel --prod` để deploy production với env mới.

**Cách B — Dùng lệnh:**

```bash
cd capstone-defi-savings-app
vercel env add VITE_SAVINGS_BANK_ADDRESS
# Paste value khi được hỏi, chọn Production (và Preview nếu cần)
# Lặp lại cho từng biến VITE_*
```

Sau khi thêm xong env, deploy production:

```bash
vercel --prod
```

---

## Sau khi deploy

- **Push code mới:** Vercel tự deploy lại (nếu đã kết nối Git).
- **Đổi env:** Vào Project → **Settings → Environment Variables** → sửa → **Redeploy** (Deployments → ⋮ → Redeploy).
- **Xem log:** **Deployments** → bấm vào deployment → **Building** / **Logs**.

---

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|-----|------------|
| Build fail: `Cannot find module` | Đảm bảo **Root Directory** = `capstone-defi-savings-app` (nếu repo có nhiều folder). |
| Trang trắng / contract không đúng | Thêm đủ env `VITE_*` rồi **Redeploy**. |
| Refresh trang bị 404 | Đã cấu hình `vercel.json` rewrite → **Redeploy**; nếu vẫn lỗi kiểm tra lại `vercel.json` trong repo. |
| Env đổi nhưng app không đổi | Build mới mới nhận env → bấm **Redeploy** sau khi sửa env. |

---

## Tóm tắt nhanh

1. Vào **vercel.com/new** → Import repo.
2. **Root Directory** = `capstone-defi-savings-app` (nếu repo là cả Capstone).
3. Thêm **Environment Variables** (bảng `VITE_*` ở trên).
4. Bấm **Deploy**.
5. Mở link Vercel cho (ví dụ `https://savevault.vercel.app`).

Xong. Nếu bạn gửi thêm ảnh màn hình lỗi (build hoặc runtime), có thể hướng dẫn chi tiết hơn từng bước.
