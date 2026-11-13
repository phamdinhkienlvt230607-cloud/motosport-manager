# Tích hợp đăng nhập và phân quyền

## Trạng thái hiện tại

Frontend đã có màn hình đăng nhập, guard route, lọc menu theo vai trò và trang quản lý tài khoản. Backend chưa được nối; `mockAuthService.ts` chỉ là adapter giả lập để thử giao diện. Phiên đăng nhập và tài khoản mock chỉ nằm trong bộ nhớ JavaScript, mất khi tải lại trang. Không có vai trò hoặc token nào được lưu trong `localStorage`.

Mock dùng SHA-256 để kiểm tra luồng nhập liệu, không phải bcrypt và không phải giải pháp xác thực an toàn. Không dùng mock cho dữ liệu thật hoặc môi trường triển khai. Backend phải nhận mật khẩu qua HTTPS, băm/xác minh bằng bcrypt (hoặc thuật toán tương đương), phát hành JWT và kiểm tra trạng thái/quyền trên mọi API.

Tài khoản demo đang hoạt động: `admin`, `manager`, `sales`, `warehouse`, `accountant`. Mật khẩu chung: `Moto@2026`. Tài khoản `locked` dùng cùng mật khẩu nhưng luôn bị từ chối vì trạng thái khóa.

## Vai trò và quyền frontend

Giá trị vai trò ổn định trong code: `admin`, `manager`, `sales`, `warehouse`, `accountant`. Nhãn hiển thị tiếng Việt được định nghĩa riêng trong `src/auth/permissions.ts`. Danh sách quyền frontend cũng nằm tại đó; menu và route dùng cùng ma trận. Các quyền này chỉ cải thiện trải nghiệm người dùng, không phải hàng rào bảo mật backend.

| Vai trò | Chức năng frontend |
|---|---|
| `admin` | Toàn quyền, gồm cài đặt và quản lý tài khoản |
| `manager` | Xe, danh mục, khách hàng, nhà cung cấp, nhập hàng, bán hàng, hóa đơn, báo cáo |
| `sales` | Khách hàng, bán hàng, hóa đơn |
| `warehouse` | Xe, danh mục, nhập hàng |
| `accountant` | Hóa đơn, báo cáo |

Dashboard được phép cho cả năm vai trò. Hãy thống nhất mã quyền và quyền dashboard với phụ trách backend trước khi chốt API.

## API đề xuất để thống nhất với Backend

Đây là hợp đồng đề xuất, chưa phải API đang chạy:

| Method | Endpoint | Mục đích |
|---|---|---|
| `POST` | `/auth/login` | Nhận `{ username, password }`, trả access token và hồ sơ user |
| `POST` | `/auth/logout` | Thu hồi phiên/refresh token nếu backend hỗ trợ |
| `GET` | `/auth/me` | Trả hồ sơ và quyền của phiên hiện tại |
| `GET` | `/users` | Danh sách tài khoản, yêu cầu `accounts:manage` |
| `POST` | `/users` | Tạo user; backend tự băm mật khẩu |
| `PATCH` | `/users/:id` | Sửa username, tên hiển thị, role |
| `PATCH` | `/users/:id/status` | Khóa hoặc mở khóa tài khoản |
| `POST` | `/users/:id/reset-password` | Đặt lại mật khẩu; backend chỉ lưu bcrypt hash |

Hồ sơ đăng nhập tối thiểu đề xuất: `{ id, username, name, role, status, permissions }`. Backend cần trả lỗi ổn định cho sai thông tin, tài khoản khóa và thiếu quyền; frontend không nên dựa vào nội dung thông báo lỗi tùy ý.

Database backend dự kiến cần `Users`, `Roles`, `Permissions` cùng bảng nối role-permission (và user-role nếu một user được có nhiều role). Kiểm tra khóa tài khoản, role và permission phải thực hiện ở backend cho từng request; ẩn menu hay chặn route phía client không thay thế được kiểm tra này.

## Nối API

1. Thống nhất endpoint, payload, mã role/quyền, cách refresh/thu hồi JWT và định dạng lỗi với người phụ trách NestJS.
2. Thay các hàm trong `src/auth/mockAuthService.ts` bằng lời gọi API; giữ nguyên kiểu dữ liệu ở `src/auth/authTypes.ts` nếu hợp đồng đã khớp.
3. Cập nhật `AuthProvider` để nạp phiên qua `/auth/me`, xử lý hết hạn token và đăng xuất theo hợp đồng đã thống nhất. Không đưa mật khẩu hoặc quyền có thể chỉnh sửa vào storage phía client.
4. Nếu quyền trả về từ API khác ma trận mock, cập nhật `src/auth/permissions.ts` hoặc chuyển sang dùng `permissions` từ hồ sơ server.
5. Bảo vệ mọi endpoint NestJS bằng JWT guard và permission guard. Kiểm tra cả API quản lý tài khoản, kể cả khi người dùng gọi API trực tiếp ngoài giao diện.

## File frontend

- `src/auth/authTypes.ts`, `authContext.ts`, `AuthContext.tsx`, `useAuth.ts`: kiểu, context và phiên đăng nhập.
- `src/auth/permissions.ts`, `RouteGuards.tsx`: ma trận quyền và guard giao diện.
- `src/auth/mockAuthService.ts`: adapter mock cần thay bằng API.
- `src/auth/auth.css`: giao diện đăng nhập và quản lý tài khoản.
- `src/pages/LoginPage.tsx`, `AccountsPage.tsx`: login, từ chối truy cập và quản trị tài khoản.
- `src/App.tsx`, `src/layouts/MainLayout.tsx`: gắn route guard, menu theo quyền và đăng xuất.