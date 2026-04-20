# Hướng dẫn sử dụng — Tú Ka Wa Office (KPI & Lương)

Tài liệu mô tả toàn bộ chức năng giao diện, luồng nghiệp vụ, cấu hình kỹ thuật và **các điểm cần lưu ý kỹ** khi vận hành hệ thống nội bộ.

---

## 1. Giới thiệu

**Tú Ka Wa Office** là ứng dụng web quản trị (React + Vite) kết nối API Node.js (Express) và cơ sở dữ liệu **SQLite** (file). Hệ thống phục vụ:

- Quản **chi nhánh**, **nhân viên** (thợ chính / thợ phụ).
- **Chấm công** theo ngày: KPI (khách, check-in, lịch hóa chất, sản phẩm, doanh thu…), trạng thái (có mặt / vắng / đi muộn), **lịch đặt chéo chi nhánh**, báo cáo ngày.
- **KPI tuần / KPI tháng / KPI quản lý** và **cài đặt KPI** (toàn hệ thống + riêng từng nhân viên theo khoảng ngày).
- **Lương tháng** (tính toán, điều chỉnh hoa hồng, giam lương, phạt…).

Múi giờ server được đặt **Asia/Ho_Chi_Minh**; nhiều màn hình dùng logic “ngày hôm nay / hôm qua” theo **giờ Việt Nam**.

---

## 2. Cài đặt và chạy (môi trường phát triển)

### 2.1. Yêu cầu

- **Node.js** (phiên bản tương thích với dự án; nên dùng LTS).
- Hai terminal (hoặc chạy nền): một cho backend, một cho frontend.

### 2.2. Backend

```bash
cd backend
npm install
npm run dev
```

- Mặc định lắng nghe: **`http://localhost:4000`**
- API REST có tiền tố: **`/api/...`**
- Database SQLite: thường tại `backend/data/salon.sqlite` (tự tạo khi chạy lần đầu nếu chưa có).

**Biến môi trường (tùy chọn, file `.env` trong thư mục `backend`):**

| Biến | Ý nghĩa |
|------|---------|
| `PORT` | Cổng HTTP (mặc định 4000) |
| `JSON_BODY_LIMIT` | Giới hạn kích thước body JSON (mặc định trong code: **5mb**) — dùng khi lưu cấu hình KPI lớn hoặc payload lớn |
| (khác) | `dotenv` được nạp; có thể bổ sung theo nhu cầu triển khai |

### 2.3. Frontend

```bash
cd frontend
npm install
npm run dev
```

- Mặc định Vite: **`http://localhost:5173`**
- **Địa chỉ API** được khai báo trong `frontend/src/api/client.js` (`API_BASE_URL`, mặc định `http://localhost:4000`). Khi triển khai thật, **phải chỉnh** trỏ tới domain/IP backend và đảm bảo CORS (backend đang bật `cors()` mở rộng).

### 2.4. Build production (frontend)

```bash
cd frontend
npm run build
```

Sinh thư mục `dist/` để đặt sau reverse proxy (nginx, v.v.). Cần phục vụ `index.html` và asset tĩnh; API vẫn gọi về backend riêng.

---

## 3. Nguyên tắc chung: chi nhánh (rất quan trọng)

- Hầu hết màn hình **bắt buộc đã chọn một chi nhánh** trong **Lọc chi nhánh** trước khi thao tác (trừ **Tổng quan** và chính trang **Lọc chi nhánh**).
- Nếu chưa chọn chi nhánh mà vào Nhân sự / Thông tin cá nhân / Chấm công / KPI / Lương → hệ thống hiển thị nhắc **“Vui lòng chọn chi nhánh”**.
- **Chi nhánh đang chọn** được lưu trong `localStorage` (khóa `selectedBranchId`) để lần sau mở trình duyệt vẫn nhớ.
- **Tab đang mở** (ví dụ KPI con-tab) cũng có thể được lưu (`activeTab`, `kpiSubTab`).

**Lưu ý:** Mọi báo cáo “theo chi nhánh” trên giao diện đều gắn với **chi nhánh đang chọn**, không phải toàn công ty (trừ **Tổng quan** dashboard nếu thiết kế lấy số liệu tổng — cần xem màn đó có lọc branch hay không).

---

## 4. Các mục menu và chức năng

### 4.1. Tổng quan (Dashboard)

- Thống kê, biểu đồ theo tháng (doanh thu, v.v.) — dùng để xem nhanh xu hướng.
- **Không** yêu cầu chọn chi nhánh để xem (theo code hiện tại); nếu cần số liệu theo từng chi nhánh, kiểm tra lại logic dashboard trên API `GET /api/reports/dashboard`.

### 4.2. Lọc chi nhánh

- **Chọn chi nhánh** đang làm việc: bấm tên chi nhánh để đặt làm “đang chọn”.
- **Thêm chi nhánh:** nhập tên → Thêm.
- **Xóa chi nhánh:** chỉ khi **không còn nhân viên** gắn chi nhánh đó (nếu còn nhân viên, API từ chối).

### 4.3. Nhân sự

- Danh sách nhân viên **thuộc chi nhánh đang chọn** (đang làm việc / đã nghỉ tùy bộ lọc UI).
- Thêm / sửa / xóa nhân viên: loại **thợ chính** hoặc **thợ phụ**, lương cứng, ngày bắt đầu/kết thúc, STK, v.v.
- Dữ liệu này là nền cho chấm công, KPI, lương.

### 4.4. Thông tin cá nhân

- Quản lý SĐT, CCCD, ngày sinh, quê quán, **ảnh CCCD** (upload file).
- Chỉnh sửa theo từng nhân viên **thuộc chi nhánh đang chọn**.
- **Lưu ý kỹ:**
  - Upload ảnh dùng **multipart/form-data**; không gửi ảnh base64 trong JSON.
  - Nếu body JSON quá lớn (ví dụ lỡ gửi dữ liệu khổng lồ), cần tăng `JSON_BODY_LIMIT` hoặc sửa payload — server đã có giới hạn mặc định 5mb cho JSON.

### 4.5. Chấm công (4 tab con)

#### Tab **Chấm KPI**

- Chọn **ngày chấm KPI** (thường là **hôm qua** theo nghiệp vụ).
- Với từng nhân viên: nhập số khách, check-in, từng **lịch đặt hóa chất** (doanh thu từng dòng), **lịch gội** (thợ phụ; có quy tắc đếm 2 lịch nếu doanh thu từ mức ngưỡng trong cấu hình KPI), sản phẩm, tổng doanh thu (theo modal).
- **Thợ chính:** lịch gội thường chỉ cộng **doanh thu**, không tăng cột “wash” KPI (theo thiết kế đã triển khai).

#### Tab **Chấm trạng thái**

- Ngày thường là **hôm nay**: có mặt / vắng / đi muộn (kèm phút phạt nếu cấu hình).
- Có thể gắn phạt bổ sung vào `salary_adjustments`.

#### Tab **Lịch đặt chéo**

- **Bối cảnh:** khách phục vụ tại **chi nhánh đang chọn** (chi nhánh “có khách”), nhưng thợ **thuộc chi nhánh khác** (chọn chi nhánh thợ rồi chọn nhân viên).
- Thêm từng loại: **hóa chất**, **gội**, **sản phẩm** (mỗi dòng có doanh thu; hóa chất phải từ ngưỡng tối thiểu trong cấu hình KPI).
- **Danh sách đã thêm:** xem theo ngày hoặc theo tháng; có **Sửa** (✏️) và **Xóa**.
- **Quan trọng — sản phẩm chéo:**
  - Hệ thống **vẫn lưu doanh thu** vào bảng lịch sử chéo tại chi nhánh phục vụ.
  - Với **chấm công / KPI của thợ**, phần **sản phẩm** chỉ **tăng số lượng (số SP)**, **không cộng tiền** vào doanh thu cá nhân thợ trên bảng chấm công (tránh trùng logic doanh thu).
  - **Hóa chất / gội chéo** vẫn cộng doanh thu vào chỉ tiêu thợ như đã cài.

#### Tab **Báo cáo hôm qua**

- Báo cáo theo ngày (theo thiết kế trang `YesterdayReportPanel`).

**Đồng bộ dữ liệu (không cần F5 thủ công):**

- Trang chấm công tự **tải lại** dữ liệu định kỳ và khi **chuyển lại tab trình duyệt**, để khi chi nhánh khác vừa sửa lịch chéo, số liệu cập nhật gần thời gian thực.

---

### 4.6. Kết quả KPI (4 tab con)

#### **KPI tuần**

- Chọn **tuần** (Thứ Hai → Chủ nhật); có nút tuần trước / tuần này.
- Bảng tổng: khách, check-in, % check-in, lịch HC, (thợ phụ) lịch gội, SP, doanh thu — kèm tô màu theo đạt/không đạt ngưỡng **KPI tuần** trong cấu hình.
- **Bấm vào từng ô** để mở **chi tiết theo ngày** trong tuần (lịch sử chấm công từng ngày); cột tương ứng được tô nhẹ để dễ đối chiếu.

#### **KPI tháng**

- Chọn **tháng** (input `YYYY-MM`).
- KPI tháng trong cấu hình toàn cục chủ yếu là **doanh thu tháng** và **sản phẩm** (các tiêu chí tuần như lịch HC, % check-in không dùng cho “đạt KPI tháng” theo bảng cài đặt — đã phân tách trong code).
- Cũng **bấm ô** để xem chi tiết theo ngày trong tháng.

**Đồng bộ:** KPI tuần/tháng có **tự làm mới** định kỳ + khi quay lại tab, để phản ánh thay đổi từ chấm công / lịch chéo bên khác mà không cần F5.

#### **KPI quản lí**

- Gán danh sách nhân viên thuộc “KPI quản lý” theo chi nhánh; xem lưới **có mặt / vắng** theo từng ngày trong tháng (phục vụ đối soát quản lý).

#### **Cài đặt KPI**

- **Cấu hình chung** (ngưỡng thợ chính / thợ phụ: tuần, tháng, mức hóa chất tối thiểu, gội đếm đôi từ mức tiền, v.v.).
- **Cài đặt KPI riêng theo nhân viên** (`staff_kpi_settings`): khoảng ngày hiệu lực; có thể **tắt** từng tiêu chí (null) cho từng người.

---

### 4.7. Lương tháng

- Chọn **tháng**; xem bảng **thợ chính** và **thợ phụ** riêng.
- Cột gồm: ngày công, lương cứng, hoa hồng, thưởng KPI, phạt KPI, phạt PS, trừ giam lương, giam lương còn lại, tổng.
- Có **nhập** điều chỉnh (commission / bộ điều chỉnh theo thiết kế), **áp giam lương tháng** nếu có chức năng đó trên API.
- **Phạt:** có thể xem lịch sử phạt qua liên kết nếu có số phạt.

**Phạm vi theo chi nhánh:** báo cáo lương **chỉ nhân viên có `branch_id` = chi nhánh đang chọn** (không “mở” danh sách theo lịch chéo như một số báo cáo KPI phía server — để bảng lương khớp danh sách nhân sự chi nhánh).

---

## 5. Giao diện & chủ đề

- Nút đổi **sáng / tối** trên thanh trên cùng; tùy chọn lưu trong `localStorage`.

---

## 6. Điểm cần lưu ý kỹ (vận hành & kỹ thuật)

### 6.1. Sao lưu dữ liệu

- Toàn bộ dữ liệu nghiệp vụ nằm trong file **SQLite** (`backend/data/salon.sqlite`).
- **Nên sao lưu định kỳ** file này khi chạy thật (copy an toàn khi ít truy cập hoặc dùng cơ chế backup của hệ điều hành).

### 6.2. Triển khai production

- Đổi **`API_BASE_URL`** ở frontend trỏ đúng HTTPS/HTTP backend.
- Bảo vệ backend bằng firewall / VPN / reverse proxy; API hiện **không** mô tả xác thực người dùng trong tài liệu này — nếu public internet cần thêm lớp **auth** (token, VPN, IP whitelist).
- Cấu hình **CORS** nếu frontend và backend khác domain (hiện backend `cors()` mở; production nên giới hạn `origin`).

### 6.3. KPI trên màn hình vs API

- API KPI tháng/tuần **có thể** tính thêm nhân viên chỉ xuất hiện qua **lịch chéo** (logic server).
- Giao diện KPI **chỉ liệt kê nhân viên thuộc biên chế chi nhánh đang chọn** (`branchId` trên hồ sơ nhân viên).
- Hệ quả: thợ **chỉ đi làm chéo** (không thuộc biên chế chi nhánh đó) **có thể không có dòng** trên bảng KPI chi nhánh dịch vụ, dù server có dữ liệu — cần hiểu để không hiểu nhầm “thiếu số”.

### 6.4. Đồng bộ nhiều máy / nhiều chi nhánh

- Không có WebSocket; đồng bộ nhờ **tải lại định kỳ** và **khi chuyển tab**. Tránh hai người sửa **cùng một ngày cùng một nhân viên** đồng thời (ghi đè theo lần lưu sau).

### 6.5. Dữ liệu lịch sử (trước khi đổi quy tắc)

- Nếu trước đây **sản phẩm chéo** đã từng cộng vào `revenue` chấm công, sau khi đổi rule **xóa/sửa** bản ghi cũ có thể **không trừ hết** phần chênh lệch — nếu cần số liệu tuyệt đối khớp, có thể phải **điều chỉnh thủ công / script** một lần trên DB.

### 6.6. Giới hạn payload

- JSON body lớn (ví dụ cấu hình KPI rất lớn) có thể gặp lỗi **413** — tăng `JSON_BODY_LIMIT` trong `.env` backend hoặc giảm kích thước payload.

### 6.7. Giờ và ngày

- Server dùng timezone **Asia/Ho_Chi_Minh**. Máy truy cập nên có ngày/giờ hợp lý; lệch timezone trình duyệt có thể làm “hôm nay / hôm qua” khác kỳ vọng.

---

## 7. Cấu trúc thư mục (tham khảo)

```
vanphong.salontukawa.com/
├── backend/
│   ├── src/
│   │   ├── server.js          # Khởi động Express, CORS, JSON limit, mount /api
│   │   ├── routes/api.js      # Hầu hết endpoint REST
│   │   ├── services/reportService.js  # Tính KPI, lương (gọi từ routes)
│   │   └── config/            # initDb, db
│   └── data/                  # salon.sqlite (file DB — cần backup)
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Menu, chi nhánh, routing nội dung
│   │   ├── api/client.js      # Base URL, gọi API
│   │   ├── pages/             # Từng màn hình
│   │   └── hooks/useData.js   # Tải branches + staff
│   └── vite.config.js
└── docs/
    └── HUONG_DAN_SU_DUNG.md   # Tài liệu này
```

---

## 8. Khắc sự cố nhanh

| Hiện tượng | Hướng xử lý |
|------------|-------------|
| Trắng màn hình / không tải được | Kiểm tra backend có chạy đúng cổng; `API_BASE_URL` trùng với URL thực tế; mở DevTools → Network xem lỗi CORS hoặc 404. |
| “Vui lòng chọn chi nhánh” | Vào **Lọc chi nhánh** và chọn một chi nhánh. |
| Lương / KPI không đổi sau khi bên khác sửa | Đợi vài giây (tự refresh) hoặc chuyển tab rồi quay lại; vẫn không được thì F5 một lần. |
| Lỗi payload quá lớn | Tăng `JSON_BODY_LIMIT` trên server hoặc giảm dữ liệu gửi. |
| Upload ảnh CCCD lỗi | Đảm bảo không ép `Content-Type: application/json` cho FormData (code hiện tại đã xử lý trong `request()`). |

---

*Tài liệu phản ánh trạng thái codebase tại thời điểm soạn; khi có thay đổi chức năng, nên cập nhật mục tương ứng.*
