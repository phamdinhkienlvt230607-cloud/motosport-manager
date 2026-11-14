-- MotoSport Manager database schema for PostgreSQL 15+.
-- Apply to a new, empty database. Never store plaintext passwords here.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TYPE account_status AS ENUM ('active', 'locked');
CREATE TYPE import_receipt_status AS ENUM ('draft', 'confirmed', 'cancelled');
CREATE TYPE sales_invoice_status AS ENUM ('draft', 'pending', 'paid', 'cancelled');
CREATE TYPE inventory_movement_type AS ENUM ('opening', 'purchase', 'sale', 'adjustment', 'return_in', 'return_out');

CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) NOT NULL UNIQUE,
  full_name varchar(160) NOT NULL,
  job_title varchar(100),
  phone varchar(30),
  email varchar(254),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employees_email_format CHECK (email IS NULL OR position('@' IN email) > 1)
);

CREATE UNIQUE INDEX employees_email_unique_ci ON employees (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX employees_active_idx ON employees (is_active, full_name);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX role_permissions_permission_idx ON role_permissions (permission_id, role_id);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid UNIQUE REFERENCES employees(id) ON DELETE RESTRICT,
  username varchar(80) NOT NULL,
  password_hash text NOT NULL,
  display_name varchar(160) NOT NULL,
  status account_status NOT NULL DEFAULT 'active',
  failed_login_attempts integer NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  locked_until timestamptz,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_password_hash_not_empty CHECK (length(password_hash) >= 20),
  CONSTRAINT users_locked_until_consistent CHECK (status = 'locked' OR locked_until IS NULL)
);

CREATE UNIQUE INDEX users_username_unique_ci ON users (lower(username));
CREATE INDEX users_status_idx ON users (status, username);
CREATE INDEX users_created_by_idx ON users (created_by);

CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX user_roles_role_idx ON user_roles (role_id, user_id);

CREATE TABLE vehicle_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vehicle_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL UNIQUE,
  name varchar(180) NOT NULL,
  brand_id uuid NOT NULL REFERENCES vehicle_brands(id) ON DELETE RESTRICT,
  category_id uuid NOT NULL REFERENCES vehicle_categories(id) ON DELETE RESTRICT,
  displacement_cc integer NOT NULL CHECK (displacement_cc > 0),
  model_year smallint NOT NULL CHECK (model_year BETWEEN 1900 AND 2200),
  color varchar(60) NOT NULL,
  engine_number varchar(100),
  vin varchar(100),
  cost_price numeric(14,2) NOT NULL CHECK (cost_price >= 0),
  sale_price numeric(14,2) NOT NULL CHECK (sale_price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicles_engine_number_unique UNIQUE (engine_number),
  CONSTRAINT vehicles_vin_unique UNIQUE (vin)
);

CREATE INDEX vehicles_brand_idx ON vehicles (brand_id, is_active);
CREATE INDEX vehicles_category_idx ON vehicles (category_id, is_active);
CREATE INDEX vehicles_name_idx ON vehicles (name);
CREATE INDEX vehicles_low_stock_idx ON vehicles (stock_quantity) WHERE is_active;
CREATE UNIQUE INDEX vehicles_image_url_unique_idx
  ON vehicles (btrim(image_url))
  WHERE image_url IS NOT NULL AND btrim(image_url) <> '';

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) NOT NULL UNIQUE,
  full_name varchar(160) NOT NULL,
  phone varchar(30) NOT NULL,
  email varchar(254),
  address text NOT NULL,
  registered_at date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_email_format CHECK (email IS NULL OR position('@' IN email) > 1)
);

CREATE INDEX customers_name_idx ON customers (full_name);
CREATE INDEX customers_phone_idx ON customers (phone);
CREATE UNIQUE INDEX customers_email_unique_ci ON customers (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) NOT NULL UNIQUE,
  name varchar(180) NOT NULL,
  contact_name varchar(160) NOT NULL,
  phone varchar(30) NOT NULL,
  email varchar(254),
  address text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_email_format CHECK (email IS NULL OR position('@' IN email) > 1)
);

CREATE INDEX suppliers_name_idx ON suppliers (name);
CREATE INDEX suppliers_phone_idx ON suppliers (phone);
CREATE UNIQUE INDEX suppliers_email_unique_ci ON suppliers (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE import_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number varchar(40) NOT NULL UNIQUE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  received_at timestamptz NOT NULL DEFAULT now(),
  status import_receipt_status NOT NULL DEFAULT 'draft',
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  note text,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_receipt_total_valid CHECK (total = subtotal - discount),
  CONSTRAINT import_receipt_status_dates CHECK (
    (status <> 'confirmed' OR confirmed_at IS NOT NULL)
    AND (status <> 'cancelled' OR cancelled_at IS NOT NULL)
  )
);

CREATE INDEX import_receipts_supplier_date_idx ON import_receipts (supplier_id, received_at DESC);
CREATE INDEX import_receipts_employee_date_idx ON import_receipts (employee_id, received_at DESC);
CREATE INDEX import_receipts_status_date_idx ON import_receipts (status, received_at DESC);

CREATE TABLE import_receipt_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_receipt_id uuid NOT NULL REFERENCES import_receipts(id) ON DELETE RESTRICT,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0),
  line_total numeric(14,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX import_receipt_details_vehicle_idx ON import_receipt_details (vehicle_id, import_receipt_id);

CREATE TABLE sales_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number varchar(40) NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  issued_at timestamptz NOT NULL DEFAULT now(),
  status sales_invoice_status NOT NULL DEFAULT 'draft',
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  customer_name_snapshot varchar(160),
  customer_phone_snapshot varchar(30),
  customer_address_snapshot text,
  note text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_invoice_total_valid CHECK (total = subtotal - discount),
  CONSTRAINT sales_invoice_discount_valid CHECK (discount <= subtotal),
  CONSTRAINT sales_invoice_status_dates CHECK (
    (status <> 'paid' OR paid_at IS NOT NULL)
    AND (status <> 'cancelled' OR cancelled_at IS NOT NULL)
  )
);

CREATE INDEX sales_invoices_customer_date_idx ON sales_invoices (customer_id, issued_at DESC);
CREATE INDEX sales_invoices_employee_date_idx ON sales_invoices (employee_id, issued_at DESC);
CREATE INDEX sales_invoices_status_date_idx ON sales_invoices (status, issued_at DESC);

CREATE TABLE sales_invoice_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_invoice_id uuid NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost_snapshot numeric(14,2) NOT NULL CHECK (unit_cost_snapshot >= 0),
  line_total numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sales_invoice_details_vehicle_idx ON sales_invoice_details (vehicle_id, sales_invoice_id);

CREATE TABLE inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  movement_type inventory_movement_type NOT NULL,
  quantity_delta integer NOT NULL CHECK (quantity_delta <> 0),
  import_receipt_detail_id uuid REFERENCES import_receipt_details(id) ON DELETE RESTRICT,
  sales_invoice_detail_id uuid REFERENCES sales_invoice_details(id) ON DELETE RESTRICT,
  reason text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_movement_source_valid CHECK (
    (movement_type = 'purchase' AND quantity_delta > 0 AND import_receipt_detail_id IS NOT NULL AND sales_invoice_detail_id IS NULL)
    OR (movement_type = 'sale' AND quantity_delta < 0 AND sales_invoice_detail_id IS NOT NULL AND import_receipt_detail_id IS NULL)
    OR (movement_type IN ('opening', 'adjustment', 'return_in', 'return_out') AND import_receipt_detail_id IS NULL AND sales_invoice_detail_id IS NULL)
  )
);

CREATE UNIQUE INDEX inventory_movements_import_detail_unique ON inventory_movements (import_receipt_detail_id) WHERE import_receipt_detail_id IS NOT NULL;
CREATE UNIQUE INDEX inventory_movements_sales_detail_unique ON inventory_movements (sales_invoice_detail_id) WHERE sales_invoice_detail_id IS NOT NULL;
CREATE INDEX inventory_movements_vehicle_date_idx ON inventory_movements (vehicle_id, occurred_at DESC);
CREATE INDEX inventory_movements_actor_date_idx ON inventory_movements (created_by, occurred_at DESC);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(100) NOT NULL,
  entity_type varchar(100) NOT NULL,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_actor_date_idx ON audit_logs (actor_user_id, occurred_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id, occurred_at DESC);
CREATE INDEX audit_logs_action_date_idx ON audit_logs (action, occurred_at DESC);

CREATE TRIGGER employees_set_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER vehicle_brands_set_updated_at BEFORE UPDATE ON vehicle_brands FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER vehicle_categories_set_updated_at BEFORE UPDATE ON vehicle_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER vehicles_set_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER customers_set_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER suppliers_set_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER import_receipts_set_updated_at BEFORE UPDATE ON import_receipts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sales_invoices_set_updated_at BEFORE UPDATE ON sales_invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO roles (code, name, description) VALUES
  ('admin', 'Admin', 'Toàn quyền quản trị hệ thống'),
  ('manager', 'Quản lý', 'Quản lý hoạt động cửa hàng và báo cáo'),
  ('sales', 'Nhân viên bán hàng', 'Khách hàng, bán hàng và hóa đơn'),
  ('warehouse', 'Nhân viên kho', 'Xe, danh mục và nhập kho'),
  ('accountant', 'Kế toán', 'Hóa đơn và báo cáo doanh thu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO permissions (code, name, description) VALUES
  ('dashboard:view', 'Xem tổng quan', 'Truy cập dashboard'),
  ('vehicles:manage', 'Quản lý xe', 'Xem và quản lý hồ sơ xe, tồn kho'),
  ('categories:manage', 'Quản lý danh mục xe', 'Quản lý hãng xe và dòng xe'),
  ('customers:manage', 'Quản lý khách hàng', 'Xem và quản lý khách hàng'),
  ('suppliers:manage', 'Quản lý nhà cung cấp', 'Xem và quản lý nhà cung cấp'),
  ('purchases:manage', 'Quản lý nhập hàng', 'Tạo, xác nhận và tra cứu phiếu nhập'),
  ('sales:manage', 'Quản lý bán hàng', 'Tạo và xử lý giao dịch bán xe'),
  ('invoices:manage', 'Quản lý hóa đơn', 'Xem và quản lý hóa đơn'),
  ('reports:view', 'Xem báo cáo', 'Xem báo cáo vận hành và doanh thu'),
  ('settings:manage', 'Quản lý cài đặt', 'Thay đổi cấu hình hệ thống'),
  ('accounts:manage', 'Quản lý tài khoản', 'Tạo user, gán role, khóa và đặt lại mật khẩu')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'manager'
  AND p.code IN (
    'dashboard:view', 'vehicles:manage', 'categories:manage', 'customers:manage',
    'suppliers:manage', 'purchases:manage', 'sales:manage', 'invoices:manage', 'reports:view'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE (r.code = 'sales' AND p.code IN ('dashboard:view', 'customers:manage', 'sales:manage', 'invoices:manage'))
   OR (r.code = 'warehouse' AND p.code IN ('dashboard:view', 'vehicles:manage', 'categories:manage', 'purchases:manage'))
   OR (r.code = 'accountant' AND p.code IN ('dashboard:view', 'invoices:manage', 'reports:view'))
ON CONFLICT DO NOTHING;

COMMIT;