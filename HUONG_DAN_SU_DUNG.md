# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG QUẢN LÝ KPI & LƯƠNG TÚ KA WA

> Dành cho nhân viên văn phòng. Viết ngắn gọn — đọc đến đâu, thao tác đến đó.
>
> Địa chỉ truy cập: **https://vanphong.salontukawa.com**

---

## MỤC LỤC

1. [Đăng nhập lần đầu](#1-đăng-nhập-lần-đầu)
2. [Làm quen giao diện](#2-làm-quen-giao-diện)
3. [Quản lý chi nhánh](#3-quản-lý-chi-nhánh)
4. [Quản lý nhân sự](#4-quản-lý-nhân-sự)
5. [Thông tin cá nhân nhân viên](#5-thông-tin-cá-nhân-nhân-viên)
6. [Chấm công hằng ngày](#6-chấm-công-hằng-ngày) ← **QUAN TRỌNG, dùng mỗi ngày**
7. [Cài đặt KPI](#7-cài-đặt-kpi)
8. [Xem kết quả KPI](#8-xem-kết-quả-kpi)
9. [Lương tháng](#9-lương-tháng) ← **QUAN TRỌNG, dùng cuối tháng**
10. [Trang Tổng quan](#10-trang-tổng-quan)
11. [Những việc KHÔNG được làm](#11-những-việc-không-được-làm)
12. [Khi gặp sự cố](#12-khi-gặp-sự-cố)

---

## 1. ĐĂNG NHẬP LẦN ĐẦU

### 1.1. Đăng ký tài khoản mới

Nếu bạn chưa có tài khoản:

1. Mở trình duyệt (Chrome hoặc Cốc Cốc), vào **https://vanphong.salontukawa.com**
2. Nhấn nút **"Đăng ký"** ở dưới màn hình đăng nhập.
3. Điền đầy đủ 4 ô:
   - **Tên đăng nhập**: chữ không dấu, không khoảng trắng. VD: `lananh`, `hienmeo`
   - **Gmail**: địa chỉ email cá nhân (dùng để **lấy lại mật khẩu** khi quên).
   - **Mật khẩu**: ít nhất 6 ký tự. Nên pha chữ và số cho an toàn.
   - **Mã xác thực**: hỏi sếp/người bàn giao để lấy. *(Nếu bị đổi theo thời gian, sếp sẽ thông báo lại.)*
4. Nhấn **"Đăng ký"** → hệ thống tự đăng nhập luôn.

⚠️ **Lưu ý quan trọng**:
- Gmail phải là Gmail **thật** và bạn **đang dùng được**. Nếu sau này quên mật khẩu, mã phục hồi sẽ gửi về đây.
- Mỗi người **1 tài khoản riêng**, không dùng chung. Dùng chung sẽ không biết ai thao tác sai khi cần kiểm tra.

### 1.2. Đăng nhập các lần sau

1. Nhập **Tên đăng nhập** và **Mật khẩu** đã đăng ký.
2. Nhấn **"Đăng nhập"**.

### 1.3. Quên mật khẩu

1. Nhấn **"Quên mật khẩu?"** ở màn hình đăng nhập.
2. Nhập **Gmail** đã đăng ký lúc tạo tài khoản.
3. Nhấn **"Gửi mã"** → mở Gmail kiểm tra hộp thư đến (hoặc mục Spam).
4. Lấy mã 6 ký tự trong email → điền vào ô "Mã xác thực".
5. Nhập **Mật khẩu mới** 2 lần giống nhau.
6. Nhấn **"Đặt lại mật khẩu"** → quay lại màn hình đăng nhập để vào với mật khẩu mới.

⚠️ Mã chỉ có hiệu lực **15 phút**. Nếu quá hạn, bấm lại "Gửi mã".

---

## 2. LÀM QUEN GIAO DIỆN

Sau khi đăng nhập, màn hình có 3 phần:

```
┌─────────────────┬──────────────────────────────────────────┐
│                 │   [Tab phụ]              [bạn] [Đăng xuất]│
│   MENU          │                          [Chi nhánh ▾] 🌙 │
│   BÊN TRÁI      ├──────────────────────────────────────────┤
│                 │                                          │
│  📊 Tổng quan   │                                          │
│  🏢 Chi nhánh   │          NỘI DUNG CHÍNH                  │
│  👥 Nhân sự     │          (thay đổi theo menu)            │
│  📅 Chấm công   │                                          │
│  📈 KPI         │                                          │
│  💰 Lương       │                                          │
│                 │                                          │
└─────────────────┴──────────────────────────────────────────┘
```

### 2.1. Menu bên trái (không đổi)

Nhấn vào từng mục để chuyển trang:

| Biểu tượng | Tên | Dùng để |
|---|---|---|
| 📊 | **Tổng quan** | Xem doanh thu, biểu đồ, bảng chuyển khoản KPI, chuyển lương |
| 🏢 | **Quản lý chi nhánh** | Thêm / đổi tên / xóa chi nhánh |
| 👥 | **Nhân sự** | Thêm / sửa / xóa nhân viên (thợ chính, thợ phụ) |
| 📅 | **Chấm công** | Chấm công, nhập KPI, ghi lịch chéo, báo cáo ngày |
| 📈 | **Kết quả KPI** | Xem bảng KPI tuần / tháng của từng thợ |
| 💰 | **Lương tháng** | Xem và chốt lương cuối tháng |

### 2.2. Thanh trên (topbar)

Góc trên bên phải có 4 thứ:

- **Tên đăng nhập của bạn** + nút **"Đăng xuất"** — bấm khi muốn thoát.
- **Hộp "Chi nhánh ▾"** — **bấm vào đây để chọn chi nhánh đang làm việc**. Toàn bộ số liệu (chấm công, KPI, lương) trên màn hình sẽ **lọc theo chi nhánh bạn chọn**.
- 🌙 / ☀️ — chuyển giữa giao diện **tối** (đỡ mỏi mắt ban đêm) và **sáng**.

⚠️ **Chọn sai chi nhánh là nguyên nhân số 1 của việc "không thấy dữ liệu"**. Nếu bạn thấy bảng trống, kiểm tra chi nhánh trên cùng trước tiên.

### 2.3. Làm mới trang

Hệ thống **tự cập nhật** ở một số trang (Chấm công, KPI tuần/tháng). Các trang còn lại, nếu nghi số liệu cũ, bấm **F5** trên bàn phím hoặc **Ctrl + R** để tải lại.

---

## 3. QUẢN LÝ CHI NHÁNH

Mỗi salon Tú Ka Wa là **1 chi nhánh**. Trước khi thêm nhân sự, phải có chi nhánh.

### 3.1. Thêm chi nhánh

1. Menu trái → **Quản lý chi nhánh**.
2. Gõ tên chi nhánh vào ô (VD: "Salon Cầu Giấy").
3. Bấm **"Thêm"**.

### 3.2. Đổi tên

1. Bấm nút **"Sửa"** cạnh tên chi nhánh.
2. Gõ tên mới → bấm **"Lưu"**.

### 3.3. Xóa chi nhánh

1. Bấm 🗑️ cạnh tên.
2. Bấm OK để xác nhận.

⚠️ **Nếu chi nhánh có nhân sự hoặc lịch chéo liên quan**, hệ thống sẽ hỏi lại:
> "KHÔNG THỂ XÓA CHI NHÁNH NÀY. Có X nhân sự. Có muốn hệ thống TỰ XÓA SẠCH toàn bộ dữ liệu này không?"

Hai lựa chọn:
- **Hủy**: không xóa gì cả, an toàn. *(Nên chọn khi bạn không chắc chắn.)*
- **OK**: **xóa sạch** toàn bộ nhân sự, chấm công, lương, lịch chéo liên quan đến chi nhánh đó. **Không thể khôi phục!**

Chỉ chọn OK khi **thực sự đóng cửa chi nhánh** và đã chốt sổ sách.

---

## 4. QUẢN LÝ NHÂN SỰ

Menu trái → **Nhân sự**.

Màn hình chia 2 bảng: **Thợ chính** và **Thợ phụ**.

### 4.1. Thêm nhân viên

1. Cuộn xuống dưới cùng → điền form:

| Ô | Ý nghĩa | Ví dụ / Lưu ý |
|---|---|---|
| **Tên** | Họ và tên đầy đủ | `Nguyễn Văn A` |
| **Vị trí** | Thợ chính / Thợ phụ | Chọn đúng. **Sai cái này là KPI và lương tính sai cả tháng.** |
| **Chi nhánh** | Chi nhánh làm việc chính | Chọn trong danh sách |
| **Lương cứng** | VND / tháng | VD `6000000` (sáu triệu) |
| **Số tài khoản** | Số TK ngân hàng | Dùng để hiển thị trong bảng chuyển khoản cuối tháng |
| **Giam lương còn lại** | Số tiền đang bị giam | VD nếu thợ mới vào bị giam 1.5 triệu làm quỹ → nhập `1500000` |
| **Trạng thái** | Đi làm / Đã nghỉ | Mặc định "Đi làm" |
| **Ngày vào làm** | dd/mm/yyyy | **Bắt buộc** — KPI và lương chỉ tính từ ngày này |
| **Ngày nghỉ** | dd/mm/yyyy | Chỉ cần khi trạng thái = "Đã nghỉ" |

2. Bấm **"Lưu"**.

⚠️ **Số tài khoản KHÔNG được trùng** với bất kỳ nhân viên nào đã có (toàn hệ thống, kể cả chi nhánh khác). Nếu trùng, hệ thống sẽ báo: *"Số tài khoản đã được dùng cho nhân sự khác"* → kiểm tra lại hoặc để trống.

### 4.2. Sửa nhân viên

1. Bấm **"Sửa"** ở dòng nhân viên cần sửa.
2. Thay đổi thông tin → bấm **"Lưu"**.

🔒 **Bảo vệ**: Nếu bạn chỉ đổi tên mà không đụng ô "Trạng thái", hệ thống sẽ **giữ nguyên** trạng thái cũ (kể cả "Đã nghỉ") → không lo vô tình "hồi sinh" nhân viên đã nghỉ.

### 4.3. Cho nhân viên nghỉ việc

1. Bấm **"Sửa"**.
2. Đổi **Trạng thái** → "Đã nghỉ".
3. Điền **Ngày nghỉ** (bắt buộc).
4. Bấm **"Lưu"**.

Sau khi lưu:
- KPI và lương tháng đang làm **vẫn tính đủ** cho những ngày trước ngày nghỉ.
- Từ ngày nghỉ trở đi, nhân viên **không xuất hiện** ở bảng chấm công.

### 4.4. Xóa nhân viên

⚠️ **Chỉ xóa khi nhân viên đã NGHỈ HẲN và đã chốt xong lương cuối.**

Bấm **"Xóa"** → xác nhận. Hệ thống xóa nhân viên + **tất cả** lịch sử: chấm công, KPI, lương, lịch chéo, phạt, thông tin cá nhân. **Không thể khôi phục.**

Lời khuyên: **đừng xóa**, chỉ cần chuyển trạng thái "Đã nghỉ" là đủ. Như vậy vẫn giữ được lịch sử để tra cứu sau này.

---

## 5. THÔNG TIN CÁ NHÂN NHÂN VIÊN

Menu trên cùng có 2 tab: **Nhân sự** / **Thông tin cá nhân**. Chuyển sang **Thông tin cá nhân** để nhập:

- Số điện thoại
- Số CCCD
- Ngày sinh
- Quê quán
- **Ảnh CCCD** (upload ảnh 2 mặt)

### Các bước:
1. Chọn nhân viên từ danh sách thả xuống.
2. Điền các ô.
3. Nhấn **"Chọn ảnh"** → chọn file ảnh CCCD từ máy tính (JPEG, PNG, WebP, GIF). Tối đa 8MB.
4. Bấm **"Lưu"**.

⚠️ Phần này **không ảnh hưởng lương / KPI**, chỉ để lưu hồ sơ nhân sự.

---

## 6. CHẤM CÔNG HẰNG NGÀY

**Đây là trang bạn dùng nhiều nhất. Đọc kỹ phần này.**

Menu trái → **Chấm công**. Chọn đúng chi nhánh ở góc trên bên phải. Trang có **4 tab** nhỏ ở trên:

- **KPI** — nhập doanh số hóa chất, gội, sản phẩm, check-in của từng thợ trong **1 ngày** cụ thể.
- **Trạng thái** — chấm có mặt / vắng / đi muộn.
- **Lịch chéo** — ghi **lịch hẹn chéo chi nhánh**: khách đến chi nhánh đang mở, nhưng người có công đặt lịch là thợ thuộc chi nhánh khác (xem mục 6.3 để hiểu kỹ).
- **Báo cáo ngày** — báo cáo công việc và video của từng thợ trong ngày.

### 6.1. Tab "KPI" — nhập lịch hóa chất, gội, sản phẩm, check-in

Dùng để ghi **kết quả làm việc thực tế** của 1 thợ trong 1 ngày.

1. **Chọn ngày** ở ô ngày (mặc định là hôm qua).
2. Bảng hiển thị toàn bộ thợ của chi nhánh. Mỗi dòng có nút **"Nhập"** ở cuối.
3. Bấm **"Nhập"** → hộp thoại hiện ra:

| Mục | Nhập gì |
|---|---|
| **Tổng khách trong ngày** | Số khách thợ tiếp (kể cả khách không làm hóa chất/gội). VD: 8 |
| **Số check-in** | Số khách đã check-in thành công. VD: 6 → tỉ lệ 75% |
| **Sản phẩm bán** | Số lượng chai/sản phẩm bán được. VD: 2 |
| **Danh sách lịch hóa chất** | Bấm **"+ Thêm lịch hóa chất"** → nhập doanh thu từng lịch |
| **Danh sách lịch gội** | Bấm **"+ Thêm lịch gội"** → nhập doanh thu từng lịch |

4. Bấm **"Lưu"**.

⚠️ **Các quy tắc bắt buộc**:
- **Hóa chất**: mỗi lịch phải **≥ 450.000đ**. Nhỏ hơn sẽ báo lỗi. *(Con số này có thể đổi trong Cài đặt KPI.)*
- **Gội**: phải **> 0đ**.
- Lịch gội **≥ 350.000đ** được tự động tính thành **2 lượt gội** (áp dụng cho thợ phụ). *(Con số này có thể đổi trong Cài đặt KPI.)*
- Nếu thợ vắng mặt cả ngày, **đừng mở "Nhập"**. Để nguyên và chuyển sang tab **"Trạng thái"** chấm vắng.

### 6.2. Tab "Trạng thái" — chấm có mặt, vắng, đi muộn

1. Chọn ngày cần chấm (mặc định hôm nay).
2. Nhìn cột **"Trạng thái"** để biết hiện tại:
   - 🟢 **Có mặt** — bình thường
   - 🟡 **Đi muộn (x phút — phạt y đ)** — chấm muộn
   - 🔴 **Vắng mặt** — vắng
   - ⚪ **Chưa chấm** — chưa có thao tác nào cho thợ này hôm đó
3. Bấm **"Nhập"** → chọn 1 trong 3:

   **A. Có mặt** → bấm Lưu.

   **B. Đi muộn**:
   - Nhập **Số phút muộn** (VD 15).
   - Nhập **Số tiền phạt** (VD 30000).
   - Có thể thêm **Phạt phát sinh khác** ở dưới (kèm ghi chú). VD: "Nói chuyện riêng trong giờ làm — phạt 50k".
   - Bấm Lưu.

   **C. Vắng mặt** → bấm Lưu. *(Nếu nhân viên có lịch chéo ở chi nhánh khác ngày đó, hệ thống vẫn coi là có mặt — đúng nghiệp vụ.)*

4. Phạt sẽ tự động xuất hiện ở cột **"Phạt PS"** trong trang Lương cuối tháng.

⚠️ **Phân biệt rõ**:
- Tab **KPI** = nhập số liệu bán hàng/dịch vụ.
- Tab **Trạng thái** = chấm có mặt/vắng/muộn + phạt phát sinh.

Hai tab **độc lập** nhau, cả hai đều có thể dùng trong cùng 1 ngày cho cùng 1 thợ.

### 6.3. Tab "Lịch chéo" — lịch hẹn đặt từ xa

#### Hiểu đúng bản chất lịch chéo

**Lịch chéo = lịch hẹn mà khách đến làm ở chi nhánh này, nhưng người đặt được lịch đó là thợ thuộc chi nhánh khác.**

Ví dụ thực tế:
> Thợ **Mai** thuộc **chi nhánh Cầu Giấy** có mối quen là chị **Hoa**. Chị Hoa đăng ký làm dịch vụ ở **chi nhánh Hà Đông** (gần nhà chị) thay vì Cầu Giấy. Chị Hoa đến Hà Đông, thợ ở Hà Đông phục vụ. Nhưng công **đặt được lịch** này là của **Mai**.

Khi đó:
- **Khách đến làm tại**: chi nhánh Hà Đông (= chi nhánh bạn đang mở).
- **Thợ được ghi công đặt lịch**: Mai (= thuộc Cầu Giấy, chi nhánh khác).
- **Doanh thu dịch vụ** → tính cho Hà Đông (nơi thực hiện dịch vụ).
- **KPI cá nhân của Mai** (số lịch hóa chất, doanh thu, lịch gội) → **được cộng** vì Mai có công đặt lịch, dù Mai không cầm kéo.

Tab này **không ghi nhận thợ đi lại giữa các chi nhánh** — thợ vẫn ngồi ở chi nhánh gốc của họ.

#### Khi nào dùng tab Lịch chéo?

Mỗi khi có khách đến chi nhánh đang mở, hỏi ra **người đặt được lịch hẹn** này là thợ nào:
- **Cũng là thợ của chi nhánh đang mở** → **KHÔNG** dùng tab Lịch chéo. Vào tab **KPI** nhập bình thường cho thợ đó.
- **Là thợ của chi nhánh khác** → **DÙNG** tab Lịch chéo (mục này).

#### Các bước thêm lịch chéo

1. Ở góc phải, chọn **chi nhánh đang tiếp nhận khách** (= chi nhánh khách đến làm).
2. Vào tab **"Lịch chéo"**.
3. Ở ô **"Chọn chi nhánh của thợ"**, chọn chi nhánh **gốc của thợ đặt lịch** (khác với chi nhánh đang mở). Danh sách sẽ tự **loại bỏ** chi nhánh đang mở — đúng ý đồ: không thể đặt lịch chéo cho thợ cùng chi nhánh.
4. Bảng hiện danh sách thợ của chi nhánh vừa chọn. Bấm **"Thêm lịch chéo"** ở dòng thợ được ghi công.
5. Hộp thoại hiện ra, điền:

   - **Lịch hóa chất**: bấm "+ Thêm lịch hóa chất" → nhập doanh thu từng lịch (mỗi lịch ≥ 450.000đ). Có thể thêm nhiều lịch nếu khách đặt nhiều.
   - **Lịch gội**: bấm "+ Thêm lịch gội" → nhập doanh thu từng lịch (> 0đ).
   - **Sản phẩm**: bấm "+ Thêm sản phẩm" → nhập doanh thu từng sản phẩm bán kèm.

6. Bấm **"Lưu"**.

#### Hệ thống tự động làm gì sau khi lưu?

- **KPI của thợ đặt lịch** tăng: +1 lịch hóa chất / +1 (hoặc 2) lượt gội / +1 sản phẩm. Doanh thu hóa chất và gội cộng vào "doanh thu tháng" của thợ đó.
- **Doanh thu chi nhánh đang mở** (chi nhánh tiếp nhận khách) tăng phần hóa chất + gội. Thấy ở trang **Tổng quan**.
- **Sản phẩm** chỉ đếm **số lượng** vào KPI sản phẩm của thợ, doanh thu sản phẩm **không cộng** vào lương thợ (khớp chính sách hiện hành).
- **Chấm công (attendance) của thợ đặt lịch** được tự đánh dấu "có mặt" cho ngày đó (vì KPI của thợ ngày đó đã có số liệu thật).

#### Xem / sửa / xóa lịch chéo đã tạo

Cuộn xuống bảng **"Danh sách khách đặt lịch chéo"** ngay dưới:
- Chọn xem **theo ngày** (chi tiết 1 ngày) hoặc **theo tháng** (cả tháng).
- Mỗi dòng: Ngày — Thợ (kèm loại thợ) — Chi nhánh của thợ — Loại lịch (Hóa chất / Gội / Sản phẩm) — Doanh thu.
- Cột cuối có ✏️ để sửa, 🗑️ để xóa.
- Khi sửa / xóa, hệ thống **tự điều chỉnh** KPI của thợ và doanh thu chi nhánh cho đúng. **Không** cần chấm lại tay.

⚠️ **Lưu ý quan trọng**:

- **Không** nhập lịch chéo vào tab **KPI** — tab KPI chỉ dành cho thợ của chi nhánh đang mở.
- Nếu cùng một thợ Mai có **cả** khách đến chi nhánh mình làm (dùng tab KPI) và khách đến chi nhánh khác nhờ đặt hộ (dùng tab Lịch chéo), **hệ thống tự cộng gộp** cả hai vào KPI tháng của Mai.
- Doanh thu ở trang Tổng quan của mỗi chi nhánh = doanh thu dịch vụ thực tế diễn ra tại chi nhánh đó (không tính dịch vụ thợ của mình đặt hộ cho chi nhánh khác).

### 6.4. Tab "Báo cáo ngày" — báo cáo công việc & video

1. Chọn **ngày** (thường là "hôm qua").
2. Bảng hiện toàn bộ thợ trong ca hôm đó.
3. Với mỗi thợ:

   **Cột Trạng thái báo cáo**: chọn 1 trong 3
   - **Đã báo cáo** — không phạt.
   - **Báo cáo muộn** — nhập tiền phạt (VD 30.000).
   - **Chưa báo cáo** — nhập tiền phạt (VD 50.000).

   **Cột Video**: chọn 1 trong 2
   - **Đã đăng** — không phạt.
   - **Chưa đăng** — nhập tiền phạt (VD 100.000).

4. Bấm **"Lưu"** → **1 nút lưu cho cả bảng**, không cần lưu từng dòng.

Phạt sẽ tự động cộng vào "Phạt PS" cuối tháng.

---

## 7. CÀI ĐẶT KPI

Menu trái → **Kết quả KPI** → tab **"Cài đặt KPI"**.

Đặt **mức chuẩn chung** áp dụng cho **tất cả thợ** (trừ khi có cài đặt riêng từng thợ — xem phần cuối).

### 7.1. Các ngưỡng toàn cục

| Mục | Ý nghĩa | Mặc định |
|---|---|---|
| **Ngày bắt đầu tuần** | Tuần KPI tính từ thứ mấy | Thứ Hai |
| **Ngày bắt đầu tháng** | Tháng KPI tính từ ngày mấy | Ngày 1 |
| **Tối thiểu 1 lịch hóa chất** | Doanh thu tối thiểu cho 1 lịch | 450.000đ |
| **Gội ≥ x đ đếm 2 lượt** | Ngưỡng được tính gấp đôi | 350.000đ |
| **Tỉ lệ giam lương** | Phần trăm bị giam hằng tháng | 15% |

### 7.2. Chỉ tiêu cho Thợ chính và Thợ phụ

Tương ứng mỗi loại thợ, cài:

- **KPI tuần**:
  - Số lịch hóa chất / tuần
  - Tỉ lệ check-in / tuần (%)
  - Số lượt gội / tuần (chỉ thợ phụ)

- **KPI tháng**:
  - Doanh thu / tháng (VND)
  - Số sản phẩm / tháng

**Muốn bỏ 1 chỉ tiêu**: để **trống** hoặc nhập **0** → chỉ tiêu đó không được xét.

### 7.3. Cài đặt KPI riêng cho từng thợ

Trong tab "Cài đặt KPI", cuộn xuống **"Cài đặt KPI theo từng thợ"**:

1. Chọn thợ.
2. Chọn **Ngày bắt đầu áp dụng**.
3. (Tùy chọn) Chọn **Ngày kết thúc** — nếu để trống, cài đặt áp dụng vô thời hạn cho đến khi có cài đặt mới.
4. Điền các chỉ tiêu riêng (chỉ điền ô cần thay đổi, ô trống = dùng ngưỡng chung).
5. Bấm **"Thêm"**.

**Ví dụ**: Thợ A mới vào nghề tháng 3, hạ ngưỡng hóa chất từ 20 xuống 10 lịch/tuần trong tháng đầu:
- Ngày bắt đầu: 01/03/2026
- Ngày kết thúc: 31/03/2026
- weeklyBookings: 10

Từ 01/04 trở đi, thợ A tự động trở về ngưỡng chung 20 lịch/tuần.

---

## 8. XEM KẾT QUẢ KPI

Menu trái → **Kết quả KPI**. Có 4 tab trên cùng:

### 8.1. Tab "KPI tuần"

1. Chọn **tuần** (định dạng: Thứ Hai → Chủ Nhật).
2. Bảng hiển thị từng thợ với các cột:
   - Lịch hóa chất (đạt/không)
   - Tỉ lệ check-in (đạt/không)
   - Lịch gội — chỉ thợ phụ (đạt/không)
3. 🟢 = đạt, 🔴 = không đạt, ⚪ = không áp dụng.

### 8.2. Tab "KPI tháng"

Tương tự KPI tuần nhưng lọc theo **tháng**. Cột hiển thị:
- Doanh thu tháng (đạt/không)
- Sản phẩm tháng (đạt/không)

### 8.3. Tab "KPI quản lí"

Dành cho trưởng chi nhánh / quản lý. Xem bảng doanh thu theo từng ngày của các thợ được đánh dấu là "nhân sự quản lí".

**Thêm thợ vào danh sách quản lí**:
1. Chọn thợ từ danh sách thả xuống.
2. Bấm **"Thêm"**.

**Xóa**: bấm 🗑️ ở dòng thợ.

### 8.4. Tab "Cài đặt KPI"

Đã mô tả ở mục [7. Cài đặt KPI](#7-cài-đặt-kpi).

---

## 9. LƯƠNG THÁNG

**Đây là trang bạn dùng vào cuối mỗi tháng để chốt lương. Đọc kỹ.**

Menu trái → **Lương tháng**. Có 3 tab:

- **Tính lương**
- **Lịch sử phạt**
- **Báo cáo tháng** (xem lịch sử chấm công chi tiết)

### 9.1. Tab "Tính lương"

1. Chọn **tháng** (mặc định tháng hiện tại).
2. Chọn **chi nhánh** trên góc phải.
3. Bảng 2 phần: **Thợ chính** / **Thợ phụ**, mỗi hàng là 1 thợ với 10 cột:

| Cột | Ý nghĩa |
|---|---|
| **Nhân viên** | Tên |
| **Ngày công** | Số ngày đi làm trong tháng |
| **Lương cứng** | `Lương cố định × Ngày công ÷ Số ngày trong tháng` |
| **Hoa hồng** | Bạn **nhập tay** — xem mục 9.2 bên dưới |
| **Thưởng KPI** | Tự động từ KPI tháng (đạt doanh thu / đạt sản phẩm) |
| **Phạt KPI** | Tự động nếu không đạt KPI tháng |
| **Phạt PS** | Tổng phạt phát sinh trong tháng (muộn, báo cáo, v.v.). Bấm vào số để xem chi tiết. |
| **Trừ giam lương (15%)** | Phần bị giam tháng này |
| **Giam lương còn lại** | Số tiền giam còn phải trừ trong các tháng sau |
| **Tổng** | Số tiền thực nhận |

### 9.2. Nhập hoa hồng / thưởng KPI thủ công

1. Bấm **"Nhập"** ở cuối dòng nhân viên.
2. Hộp thoại hiện ra. Điền:
   - **Hoa hồng**: tiền thưởng dịch vụ trong tháng (tính tay).
   - **Thưởng KPI thủ công** (nếu có): ngoài phần tự tính.
3. Bấm **"Lưu"**.

Bảng tự cập nhật "Tổng" ngay.

### 9.3. Áp dụng giam lương cho cả tháng

Mỗi tháng, 15% (hoặc tỉ lệ trong Cài đặt KPI) của lương sẽ bị giam, tối đa bằng số "Giam lương còn lại" của thợ.

**Khi chốt lương cuối tháng**:
1. Chọn đúng **tháng** và **chi nhánh**.
2. Bấm nút **"Áp dụng giam lương tháng này"** ở đầu bảng.
3. Xác nhận.

Hệ thống ghi lại giao dịch giam cho tháng này. Tháng sau, bảng "Giam lương còn lại" sẽ giảm tương ứng.

⚠️ **Chỉ bấm áp dụng 1 lần / tháng**, sau khi số liệu đã đúng. Nếu bấm nhiều lần vào cùng tháng, hệ thống **ghi đè** giá trị cũ (không cộng dồn sai) — an toàn nhưng không nên lạm dụng.

### 9.4. Xem lịch sử phạt chi tiết

Ở bảng tính lương, cột **"Phạt PS"**, bấm vào số tiền → hiện danh sách các khoản phạt:

| Ngày | Ghi chú | Số tiền |
|---|---|---|
| 03/04 | Đi muộn 15 phút | 30.000 |
| 05/04 | Báo cáo công việc báo cáo muộn 05/04 | 20.000 |
| ... | ... | ... |

Có thể **sửa số tiền** hoặc **xóa** từng khoản nếu cần đính chính.

⚠️ Các khoản có ghi chú bắt đầu bằng **"Đi muộn"** được **đồng bộ 2 chiều** với bảng chấm công. Sửa ở đây → bảng chấm công cũng đổi theo, và ngược lại.

### 9.5. Tab "Báo cáo tháng"

Xem bảng chi tiết từng thợ theo **mỗi ngày trong tháng**: có mặt / vắng / doanh thu / lịch gội / sản phẩm / phạt. Dùng để đối chiếu khi có thắc mắc từ nhân viên.

---

## 10. TRANG TỔNG QUAN

Menu trái → **Tổng quan**. Có 4 tab phụ:

### 10.1. Tab "Tổng quan"

- Biểu đồ cột: doanh thu và sản phẩm của từng chi nhánh trong tháng.
- Biểu đồ đường: doanh thu theo ngày trong tháng.
- Các số tổng: số thợ đang làm, số thợ chính / phụ.

### 10.2. Tab "Chuyển khoản KPI tuần"

Sau khi chốt KPI tuần, dùng bảng này để biết **chuyển tiền cho ai, bao nhiêu**:
- 10 bảng con, mỗi bảng là 1 loại (Đạt / Không đạt × Hóa chất / Gội / Check-in × Thợ chính / Phụ).
- Mỗi dòng có **Tên**, **Chi nhánh**, **Chỉ số thực tế**, **Số tiền thưởng/phạt**, **Số tài khoản**.

📱 Chụp màn hình gửi kế toán hoặc copy STK để chuyển khoản.

### 10.3. Tab "Chuyển khoản KPI tháng"

Giống tab tuần nhưng cho **doanh thu tháng** và **sản phẩm tháng**.

### 10.4. Tab "Chuyển khoản lương"

Danh sách thợ + **Tổng lương cần chuyển** + **Số tài khoản**. Dùng vào ngày trả lương.

---

## 11. NHỮNG VIỆC KHÔNG ĐƯỢC LÀM

🚫 **KHÔNG xóa nhân viên** khi chưa chốt lương tháng đó. → chuyển trạng thái "Đã nghỉ" thay vì xóa.

🚫 **KHÔNG xóa chi nhánh có nhân sự đang làm việc** trừ khi đóng cửa thật. → chuyển nhân sự sang chi nhánh khác trước.

🚫 **KHÔNG chia sẻ mật khẩu** với người khác. → tạo thêm tài khoản nếu có người mới.

🚫 **KHÔNG nhập KPI ở tab "KPI" cho thợ của chi nhánh khác**. Nếu khách đến chi nhánh mình nhưng do thợ chi nhánh khác đặt được lịch → luôn dùng tab **"Lịch chéo"**.

🚫 **KHÔNG bấm "Áp dụng giam lương" nhiều lần trong 1 tháng** dù không gây sai số, vẫn là thao tác không cần thiết.

🚫 **KHÔNG để Ngày vào làm trống** khi thêm nhân viên → các tháng trước đó sẽ không tính được.

🚫 **KHÔNG đánh sai loại thợ** (chính / phụ) → KPI tính theo ngưỡng khác nhau, sai là lệch hết.

---

## 12. KHI GẶP SỰ CỐ

### 12.1. Không thấy số liệu / bảng trống

Thứ tự kiểm tra:

1. **Chi nhánh đã chọn đúng chưa?** (góc trên bên phải)
2. **Tháng / ngày đã chọn đúng chưa?**
3. **Nhân viên có nằm trong khoảng thời gian chọn không?** (ngày vào làm – ngày nghỉ)
4. Bấm **F5** để tải lại trang.

### 12.2. Lưu không được / báo lỗi đỏ

Đọc kỹ nội dung thông báo lỗi đỏ:
- *"Hóa chất phải từ 450.000 VND trở lên"* → có dòng doanh thu thấp hơn ngưỡng. Sửa / xóa dòng đó.
- *"Số tài khoản đã được dùng"* → kiểm tra xem có nhân viên nào đã có STK này không.
- *"endDate is required when status is left"* → chọn "Đã nghỉ" thì bắt buộc điền ngày nghỉ.
- *"Attendance date is outside employment range"* → ngày chấm công nằm ngoài ngày vào làm / ngày nghỉ. Sửa ngày.

### 12.3. Quên chi nhánh cũ bấm sửa xong không lưu được

Bấm **"Hủy"** rồi thử lại từ đầu. Nếu vẫn không được → F5 rồi làm lại.

### 12.4. Bị đăng xuất đột ngột

Hệ thống tự đăng xuất sau **7 ngày** không hoạt động để bảo mật. Đăng nhập lại bình thường, **dữ liệu không mất**.

### 12.5. Không đăng nhập được

1. Gõ lại tên đăng nhập và mật khẩu (chú ý phím **Caps Lock**).
2. Nếu vẫn không được → dùng **"Quên mật khẩu?"** để lấy lại (xem mục 1.3).

### 12.6. Ảnh CCCD không upload được

- Kiểm tra định dạng file: chỉ JPEG / PNG / WebP / GIF.
- Kiểm tra dung lượng: ≤ 8MB.
- Thử ảnh khác. Nếu vẫn lỗi → báo IT.

### 12.7. Số liệu giữa các trang không khớp

- Bấm **F5** (hoặc Ctrl + R) để tải lại.
- Nếu 2 người cùng thao tác trên 2 máy khác nhau, kết quả người này sửa sẽ hiển thị cho người kia sau khi F5.

### 12.8. Trang không mở / bị trắng

- Kiểm tra mạng internet.
- Thử trình duyệt khác (Chrome / Cốc Cốc / Edge).
- Liên hệ IT.

---

## LIÊN HỆ HỖ TRỢ

- **Vấn đề kỹ thuật / website không vào được / lỗi hệ thống**:
  - Nguyễn Việt Sơn — **0978478240**

- **Vấn đề nghiệp vụ / không biết nhập gì**:
  - Liên hệ sếp hoặc đồng nghiệp đã dùng quen hệ thống.

---

## TÓM TẮT 1 NGÀY LÀM VIỆC TIÊU CHUẨN

### Đầu ngày
1. Đăng nhập → chọn chi nhánh.
2. Vào **Chấm công** → tab **Trạng thái** → chấm có mặt / muộn / vắng cho từng thợ hôm nay.

### Trong ngày (khi có khách đặt từ xa)
3. Khách đến chi nhánh mình, nhưng người đặt được lịch là thợ chi nhánh khác?
   → Vào **Chấm công** → tab **Lịch chéo** → chọn chi nhánh của thợ đó → thêm lịch.

### Cuối ngày / sáng hôm sau
4. Vào **Chấm công** → tab **KPI** → chọn ngày hôm qua → nhập lịch hóa chất / gội / sản phẩm / check-in cho từng thợ **của chi nhánh đang mở** (các lịch chéo do thợ chi nhánh khác đặt giúp đã được ghi ở bước 3, không cần nhập lại).
5. Vào tab **Báo cáo ngày** → chấm "đã báo cáo" / "báo cáo muộn" / "chưa báo cáo" + "video đã đăng / chưa đăng".

### Cuối tuần
6. Vào **Kết quả KPI** → tab **KPI tuần** → xem ai đạt / không đạt.
7. Vào **Tổng quan** → tab **Chuyển khoản KPI tuần** → chuyển tiền thưởng/phạt.

### Cuối tháng
8. Vào **Lương tháng** → tab **Tính lương** → nhập hoa hồng cho từng thợ.
9. Kiểm tra cột **Phạt PS** khớp với dự kiến → nếu sai, bấm vào số để sửa.
10. Bấm **"Áp dụng giam lương tháng này"**.
11. Vào **Tổng quan** → tab **Chuyển khoản lương** → chuyển lương.

---

*Hướng dẫn này được viết cho phiên bản hiện tại của hệ thống. Nếu giao diện thay đổi, nhờ kỹ thuật cập nhật lại file này.*

*Developer: Nguyễn Việt Sơn — Contact: 0978478240*
