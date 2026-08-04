# Sổ Tay AI — Ghi chú + Quản lý chi tiêu

Ứng dụng ghi chú tích hợp AI (Google Gemini): mỗi ghi chú được AI tự tóm tắt ý chính,
gắn thẻ phân loại, và nếu ghi chú có nhắc đến một khoản tiền cụ thể thì tự động
tách ra thành mục chi tiêu trong sổ.

Kiến trúc: 1 server Node.js/Express duy nhất, vừa phục vụ giao diện web (thư mục `public/`)
vừa xử lý gọi Gemini API — API key được **giấu ở backend**, không lộ ra trình duyệt.

Dữ liệu (ghi chú + chi tiêu) được lưu dạng file JSON trong thư mục `data/` trên server.

---

## 1. Chạy thử ở máy bạn

```bash
npm install
cp .env.example .env
```

Mở file `.env`, dán API key Gemini vào (lấy miễn phí tại
https://aistudio.google.com/apikey):

```
GEMINI_API_KEY=AIzaSy...key_cua_ban
```

Chạy server:

```bash
npm start
```

Mở trình duyệt tại **http://localhost:3000**

---

## 2. Đưa lên mạng (deploy)

Vì có backend giấu API key nên **không thể** host trên GitHub Pages (chỉ chạy được
file tĩnh). Cách đơn giản nhất là dùng một dịch vụ Node.js miễn phí, ví dụ **Render**:

1. Đẩy thư mục này lên một repo GitHub riêng.
2. Vào https://render.com → **New +** → **Web Service** → chọn repo vừa tạo.
3. Cấu hình:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Mục **Environment Variables**, thêm:
   - `GEMINI_API_KEY` = key của bạn
   - `GEMINI_MODEL` = `gemini-2.5-flash` (tuỳ chọn, có thể bỏ qua)
5. Deploy xong Render cho bạn 1 đường link dạng `https://ten-app.onrender.com` —
   mở lên là dùng được ngay, cả frontend lẫn AI.

> Lưu ý: gói miễn phí của Render sẽ "ngủ" sau vài phút không có người dùng,
> lần truy cập đầu tiên sau đó có thể mất 20–30 giây để khởi động lại — đây là
> giới hạn bình thường của gói free, không phải lỗi.

Railway hoặc Fly.io cũng dùng được tương tự nếu bạn muốn thử dịch vụ khác.

### Về việc lưu dữ liệu khi deploy

Thư mục `data/` lưu trên ổ đĩa của server. Trên gói miễn phí của Render, ổ đĩa
**không persistent** — mỗi lần server khởi động lại (sau khi ngủ), dữ liệu ghi chú/chi tiêu
cũ có thể bị mất. Nếu bạn cần dữ liệu lưu lâu dài, các hướng nâng cấp sau này:
- Bật **Persistent Disk** trả phí trên Render, hoặc
- Chuyển sang một database thật (ví dụ SQLite trên volume, hoặc Supabase/MongoDB Atlas free tier).

Mình có thể giúp bạn nâng cấp phần này khi bạn cần.

---

## 3. Cấu trúc project

```
notes-expense-ai/
├── server.js           # API: /api/notes, /api/expenses, /api/expenses/summary
├── lib/
│   ├── gemini.js        # Gọi Gemini API, ép AI trả JSON theo schema cố định
│   └── store.js          # Đọc/ghi dữ liệu ra file JSON
├── data/                 # notes.json, expenses.json (tự tạo khi chạy)
├── public/                # Giao diện web (HTML/CSS/JS thuần)
└── .env                    # API key (không commit lên GitHub)
```

## 4. Có thể mở rộng thêm

- Thêm đăng nhập để nhiều người dùng chung 1 app mà dữ liệu tách riêng.
- Cho AI trả lời câu hỏi kiểu "tháng này tôi tiêu bao nhiêu cho ăn uống?" dựa trên dữ liệu đã lưu.
- Biểu đồ chi tiêu theo thời gian (dùng Chart.js).
- Nhắc nhở ("reminder") từ những ý chính AI trích ra trong ghi chú.

Cứ nói với mình nếu bạn muốn làm thêm phần nào ở trên.
