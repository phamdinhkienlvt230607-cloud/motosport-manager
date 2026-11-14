# Database MotoSport Manager

`schema.sql` là schema khởi tạo cho PostgreSQL 15+, gồm xác thực/RBAC và nghiệp vụ đang có trong frontend: nhân viên, xe, hãng/dòng xe, khách hàng, nhà cung cấp, phiếu nhập, hóa đơn bán, tồn kho và audit log.

## Tạo database mới

Tạo database rỗng bằng PostgreSQL, sau đó chạy:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
```

Migration này dùng `CREATE TYPE` và được thiết kế để chạy một lần trên database mới. Không chạy đè lên database đang có dữ liệu. Trước khi nâng cấp schema đã triển khai, hãy tạo migration phiên bản mới, backup và thử trên staging.

## Mô hình dữ liệu

- `employees` lưu hồ sơ nhân viên nghiệp vụ. `users` là tài khoản đăng nhập và có thể liên kết một-một tới nhân viên.
- `roles`, `permissions`, `user_roles`, `role_permissions` tạo RBAC nhiều-nhiều; permission code trùng với frontend hiện tại.
- `vehicles` tham chiếu hãng và danh mục; số khung/số máy có unique constraint khi có giá trị.
- `vehicles.image_url` lưu URL ảnh cho đúng một xe; migration `database/migrations/20261114_unique_vehicle_image_url.sql` từ chối chạy nếu phát hiện URL trùng và tạo unique index sau khi dữ liệu được kiểm tra.
- `import_receipts` và `sales_invoices` là chứng từ đầu; các bảng `*_details` lưu dòng xe và snapshot giá.
- `inventory_movements` ghi sổ phát sinh tồn theo từng xe. `vehicles.stock_quantity` là số dư đọc nhanh, cần được cập nhật nguyên tử cùng movement.
- `audit_logs` lưu dấu vết thao tác quan trọng, nhất là đăng nhập, gán role, khóa/mở tài khoản và sửa chứng từ.

Trước khi áp dụng migration trên database đang có dữ liệu, có thể kiểm tra URL trùng bằng truy vấn chỉ đọc:

```sql
SELECT btrim(image_url) AS image_url, COUNT(*) AS vehicle_count, ARRAY_AGG(id) AS vehicle_ids
FROM public.vehicles
WHERE image_url IS NOT NULL AND btrim(image_url) <> ''
GROUP BY btrim(image_url)
HAVING COUNT(*) > 1;
```

## Ánh xạ model frontend sang SQL

API/backend nên chuẩn hóa ID UUID thành chuỗi và ngày giờ ISO-8601. Nếu JSON API dùng camelCase, ORM hoặc DTO chịu trách nhiệm ánh xạ sang snake_case trong database.

| Model frontend | Cột SQL |
|---|---|
| `Vehicle.brandId`, `categoryId` | `vehicles.brand_id`, `category_id` |
| `Vehicle.displacement`, `year` | `vehicles.displacement_cc`, `model_year` |
| `Vehicle.cost`, `price`, `stock`, `image` | `cost_price`, `sale_price`, `stock_quantity`, `image_url` |
| `Customer.name`, `registeredAt` | `customers.full_name`, `registered_at` |
| `Supplier.contact` | `suppliers.contact_name` |
| `Employee.name`, `active` | `employees.full_name`, `is_active` |
| `ImportReceipt.receiptNumber`, `receivedAt` | `import_receipts.receipt_number`, `received_at` |
| `ImportReceiptDetail.importReceiptId` | `import_receipt_details.import_receipt_id` |
| `SalesInvoice.invoiceNumber`, `issuedAt` | `sales_invoices.invoice_number`, `issued_at` |
| `SalesInvoiceDetail.salesInvoiceId` | `sales_invoice_details.sales_invoice_id` |

Tổng dòng `line_total` được PostgreSQL tính từ số lượng và đơn giá. Tổng đầu chứng từ (`subtotal`, `discount`, `total`) do backend tính từ các dòng trong cùng transaction; frontend không gửi giá trị tổng đáng tin cậy. `Vehicle.stock` tương ứng số dư hiện tại, còn `inventory_movements.quantity_delta` là lịch sử biến động.

## Quy tắc backend bắt buộc

1. Tạo user đầu tiên bằng lệnh bootstrap backend có kiểm soát hoặc quy trình triển khai riêng. Không tạo admin mặc định với mật khẩu cố định.
2. NestJS phải hash và verify mật khẩu bằng bcrypt; chỉ lưu hash trong `users.password_hash`. Không ghi password/token vào log.
3. Mỗi API nội bộ phải xác thực JWT và kiểm tra status cùng permission ở backend. Permission/role từ frontend không đáng tin cậy.
4. Tạo phiếu nhập/bán phải dùng transaction: lock các dòng xe liên quan (`SELECT ... FOR UPDATE`), xác nhận số lượng/trạng thái, ghi chi tiết, cộng/trừ `stock_quantity`, tạo `inventory_movements`, cập nhật tổng chứng từ và audit log. Nếu một bước lỗi phải rollback tất cả.
5. Chỉ phiếu nhập `confirmed` được cộng kho; invoice `pending` hoặc `paid` được trừ kho theo quy tắc chốt đơn đã thống nhất. Hủy chứng từ đã ghi sổ phải tạo movement đảo tương ứng, không xóa lịch sử.
6. Gán role, khóa user và reset mật khẩu phải được backend kiểm tra quyền, ghi audit log và ngăn tự nâng role. Khóa tài khoản phải có hiệu lực với request tiếp theo, không chỉ lần đăng nhập sau.
7. `subtotal`, `discount`, `total`, trạng thái và các mốc thời gian phải được backend tính/kiểm soát trong transaction, không tin giá trị client gửi lên.

## Enum role và trạng thái

Role dùng mã `admin`, `manager`, `sales`, `warehouse`, `accountant`. Tên hiển thị tiếng Việt do ứng dụng quyết định. Trạng thái account là `active` hoặc `locked`; trạng thái phiếu nhập là `draft`, `confirmed`, `cancelled`; hóa đơn là `draft`, `pending`, `paid`, `cancelled`.

Schema chỉ là tầng lưu trữ. JWT strategy, bcrypt, API NestJS, guards, migration runner và quy trình bootstrap admin vẫn cần triển khai ở backend trước khi dùng thực tế.