-- Sinh tự động từ database/01_schema.sql bằng scripts/sync-migrations.py. Không sửa tay.
-- =====================================================================
-- VTPH Coffee - Lược đồ cơ sở dữ liệu (Chương 5)
-- Suy ra từ ERD Chen (Chương 4, mục 4.6) và các yêu cầu Chương 3.
-- MySQL 8.4, InnoDB, utf8mb4.
-- Quy ước: tên bảng/cột snake_case tiếng Anh; số tiền là BIGINT (đồng);
-- không xóa cứng dữ liệu giao dịch (NFR-010): mọi khóa ngoại RESTRICT.
-- =====================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci;

-- Xóa theo thứ tự (chạy lại được)

-- ---------------------------------------------------------------------
-- M01 / M10: nhân sự, tài khoản, chấm công, ca, ngày kinh doanh
-- ---------------------------------------------------------------------
CREATE TABLE employee (
  employee_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name    VARCHAR(100) NOT NULL,
  phone        VARCHAR(15)  NULL,
  email        VARCHAR(120) NULL,
  PRIMARY KEY (employee_id)
) ENGINE=InnoDB COMMENT='Nhân viên của quán (FR-M01-007, 008, 013)';

CREATE TABLE account (
  account_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id     INT UNSIGNED NOT NULL,
  username        VARCHAR(50)  NOT NULL,
  secret_hash     VARCHAR(255) NOT NULL COMMENT 'Mật khẩu/PIN đã băm, không lưu dạng thuần (NFR-012)',
  role            ENUM('OWNER_MANAGER','CASHIER','WAITER','BARISTA') NOT NULL,
  status          ENUM('ACTIVE','TEMP_LOCKED','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until    DATETIME NULL,
  is_station      TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 = tài khoản dùng chung của máy thu ngân/màn hình pha chế: chỉ để đăng nhập thao tác, không chấm công',
  PRIMARY KEY (account_id),
  UNIQUE KEY uq_account_employee (employee_id),
  UNIQUE KEY uq_account_username (username),
  CONSTRAINT fk_account_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id),
  CONSTRAINT ck_account_attempts CHECK (failed_attempts <= 5),
  CONSTRAINT ck_account_lock CHECK (status <> 'TEMP_LOCKED' OR locked_until IS NOT NULL)
) ENGINE=InnoDB COMMENT='Tài khoản đăng nhập; mỗi nhân viên một tài khoản, cộng tài khoản quầy dùng chung (BR-042, ASM-13)';

CREATE TABLE attendance (
  attendance_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id    INT UNSIGNED NOT NULL,
  shift          ENUM('MORNING','EVENING') NOT NULL,
  check_in_time  DATETIME NOT NULL,
  check_out_time DATETIME NULL,
  PRIMARY KEY (attendance_id),
  KEY ix_attendance_employee (employee_id, check_in_time),
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employee (employee_id),
  CONSTRAINT ck_attendance_time CHECK (check_out_time IS NULL OR check_out_time >= check_in_time)
) ENGINE=InnoDB COMMENT='Chấm công vào/ra (FR-M10-002)';

CREATE TABLE attendance_edit (
  edit_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attendance_id INT UNSIGNED NOT NULL,
  edited_by     INT UNSIGNED NOT NULL,
  edited_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  old_value     VARCHAR(500) NOT NULL,
  new_value     VARCHAR(500) NOT NULL,
  PRIMARY KEY (edit_id),
  KEY ix_attedit_attendance (attendance_id),
  CONSTRAINT fk_attedit_attendance FOREIGN KEY (attendance_id) REFERENCES attendance (attendance_id),
  CONSTRAINT fk_attedit_employee FOREIGN KEY (edited_by) REFERENCES employee (employee_id)
) ENGINE=InnoDB COMMENT='Lịch sử chỉnh sửa chấm công, thực thể yếu của attendance (FR-M10-003, BR-039)';

CREATE TABLE business_day (
  business_date DATE NOT NULL,
  status        ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  closed_at     DATETIME NULL,
  note          VARCHAR(500) NULL COMMENT 'Ghi chú của Chủ quán khi chốt ngày',
  PRIMARY KEY (business_date),
  CONSTRAINT ck_day_closed CHECK (status = 'OPEN' OR closed_at IS NOT NULL)
) ENGINE=InnoDB COMMENT='Ngày kinh doanh và chốt ngày (FR-M10-008, BR-037)';

CREATE TABLE cashier_session (
  session_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  business_date  DATE NOT NULL,
  shift          ENUM('MORNING','EVENING') NOT NULL,
  status         ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
  opening_cash   BIGINT NOT NULL,
  expected_cash  BIGINT NULL,
  actual_cash    BIGINT NULL,
  difference     BIGINT NULL,
  opened_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at      DATETIME NULL,
  opened_by      INT UNSIGNED NOT NULL,
  closed_by      INT UNSIGNED NULL COMMENT 'Có thể là Chủ quán/Quản lý khi chốt thay (FR-M10-007)',
  open_flag      TINYINT GENERATED ALWAYS AS (IF(status = 'OPEN', 1, NULL)) STORED,
  PRIMARY KEY (session_id),
  UNIQUE KEY uq_session_day_shift (business_date, shift),
  UNIQUE KEY uq_one_open_session (open_flag),
  CONSTRAINT fk_session_day FOREIGN KEY (business_date) REFERENCES business_day (business_date),
  CONSTRAINT fk_session_opened_by FOREIGN KEY (opened_by) REFERENCES employee (employee_id),
  CONSTRAINT fk_session_closed_by FOREIGN KEY (closed_by) REFERENCES employee (employee_id),
  CONSTRAINT ck_session_cash CHECK (opening_cash >= 0 AND (actual_cash IS NULL OR actual_cash >= 0)),
  CONSTRAINT ck_session_closed CHECK (status = 'OPEN' OR (closed_at IS NOT NULL AND closed_by IS NOT NULL
                                       AND expected_cash IS NOT NULL AND actual_cash IS NOT NULL AND difference IS NOT NULL)),
  CONSTRAINT ck_session_diff CHECK (difference IS NULL OR difference = actual_cash - expected_cash)
) ENGINE=InnoDB COMMENT='Phiên ca thu ngân; tại một thời điểm chỉ một phiên OPEN (BR-035, BR-036)';

-- ---------------------------------------------------------------------
-- M02: thực đơn
-- ---------------------------------------------------------------------
CREATE TABLE menu_item (
  item_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  item_group ENUM('COFFEE','TEA','SMOOTHIE','CAKE') NOT NULL,
  status     ENUM('SELLING','OUT_OF_STOCK','STOPPED') NOT NULL DEFAULT 'SELLING',
  allow_hot  TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Đồ uống nóng chỉ phục vụ tại quán (BR-013)',
  allow_cold TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Đồ uống lạnh và bánh bán được cả mang đi (BR-013)',
  PRIMARY KEY (item_id),
  UNIQUE KEY uq_menu_item_name (name),
  CONSTRAINT ck_menu_item_mode CHECK (allow_hot = 1 OR allow_cold = 1)
) ENGINE=InnoDB COMMENT='Món trong thực đơn (FR-M02-001..005)';

CREATE TABLE item_size (
  item_id       INT UNSIGNED NOT NULL,
  size          ENUM('M','L') NOT NULL,
  price         BIGINT NOT NULL,
  status        ENUM('SELLING','OUT_OF_STOCK','STOPPED') NOT NULL DEFAULT 'SELLING',
  status_source ENUM('SYSTEM','OWNER_MANAGER') NULL COMMENT 'Ai đặt Hết hàng (BR-006, ASM-08)',
  PRIMARY KEY (item_id, size),
  CONSTRAINT fk_item_size_item FOREIGN KEY (item_id) REFERENCES menu_item (item_id),
  CONSTRAINT ck_item_size_price CHECK (price >= 0),
  CONSTRAINT ck_item_size_source CHECK (status <> 'OUT_OF_STOCK' OR status_source IS NOT NULL)
) ENGINE=InnoDB COMMENT='Kích thước M/L và giá; thực thể yếu của menu_item (FR-M02-003)';

CREATE TABLE topping (
  topping_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  surcharge     BIGINT NOT NULL DEFAULT 0,
  status        ENUM('SELLING','OUT_OF_STOCK','STOPPED') NOT NULL DEFAULT 'SELLING',
  status_source ENUM('SYSTEM','OWNER_MANAGER') NULL,
  PRIMARY KEY (topping_id),
  UNIQUE KEY uq_topping_name (name),
  CONSTRAINT ck_topping_surcharge CHECK (surcharge >= 0),
  CONSTRAINT ck_topping_source CHECK (status <> 'OUT_OF_STOCK' OR status_source IS NOT NULL)
) ENGINE=InnoDB COMMENT='Topping và phụ phí (FR-M02-004, 007)';

CREATE TABLE menu_item_topping (
  item_id    INT UNSIGNED NOT NULL,
  topping_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (item_id, topping_id),
  CONSTRAINT fk_mit_item FOREIGN KEY (item_id) REFERENCES menu_item (item_id),
  CONSTRAINT fk_mit_topping FOREIGN KEY (topping_id) REFERENCES topping (topping_id)
) ENGINE=InnoDB COMMENT='Topping được phép dùng với món (quan hệ N-N, FR-M02-007)';

-- ---------------------------------------------------------------------
-- M06: nguyên liệu, công thức, kho
-- ---------------------------------------------------------------------
CREATE TABLE ingredient (
  ingredient_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  unit          VARCHAR(20)  NOT NULL,
  min_stock     DECIMAL(12,3) NOT NULL DEFAULT 0,
  current_stock DECIMAL(12,3) NOT NULL DEFAULT 0,
  track_expiry  TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Chỉ sữa tươi và bánh theo dõi hạn dùng (BR-017)',
  PRIMARY KEY (ingredient_id),
  UNIQUE KEY uq_ingredient_name (name),
  CONSTRAINT ck_ingredient_stock CHECK (current_stock >= 0 AND min_stock >= 0)  -- BR-011: tồn không âm
) ENGINE=InnoDB COMMENT='Nguyên liệu và tồn kho hiện tại (FR-M06-004, 007, 011)';

CREATE TABLE recipe (
  recipe_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id    INT UNSIGNED NULL,
  size       ENUM('M','L') NULL,
  topping_id INT UNSIGNED NULL,
  PRIMARY KEY (recipe_id),
  UNIQUE KEY uq_recipe_item_size (item_id, size),
  UNIQUE KEY uq_recipe_topping (topping_id),
  CONSTRAINT fk_recipe_item_size FOREIGN KEY (item_id, size) REFERENCES item_size (item_id, size),
  CONSTRAINT fk_recipe_topping FOREIGN KEY (topping_id) REFERENCES topping (topping_id),
  -- cung loại trừ: công thức của một kích thước món HOẶC của một topping
  CONSTRAINT ck_recipe_arc CHECK (
    (item_id IS NOT NULL AND size IS NOT NULL AND topping_id IS NULL) OR
    (item_id IS NULL AND size IS NULL AND topping_id IS NOT NULL))
) ENGINE=InnoDB COMMENT='Công thức của một kích thước món hoặc một topping (FR-M06-001, 002)';

CREATE TABLE recipe_line (
  recipe_id     INT UNSIGNED NOT NULL,
  ingredient_id INT UNSIGNED NOT NULL,
  quantity      DECIMAL(12,3) NOT NULL,
  PRIMARY KEY (recipe_id, ingredient_id),
  CONSTRAINT fk_rl_recipe FOREIGN KEY (recipe_id) REFERENCES recipe (recipe_id),
  CONSTRAINT fk_rl_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (ingredient_id),
  CONSTRAINT ck_rl_quantity CHECK (quantity > 0)
) ENGINE=InnoDB COMMENT='Dòng định lượng nguyên liệu (kể cả ly, nắp); thực thể yếu của recipe';

CREATE TABLE stock_receipt (
  receipt_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ingredient_id INT UNSIGNED NOT NULL,
  quantity      DECIMAL(12,3) NOT NULL,
  received_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiry_date   DATE NULL COMMENT 'Bắt buộc với nguyên liệu track_expiry = 1 (BR-017), kiểm tra bằng trigger',
  PRIMARY KEY (receipt_id),
  KEY ix_receipt_ingredient (ingredient_id, expiry_date),
  CONSTRAINT fk_receipt_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (ingredient_id),
  CONSTRAINT ck_receipt_quantity CHECK (quantity > 0)
) ENGINE=InnoDB COMMENT='Phiếu nhập kho (FR-M06-003, 008)';

CREATE TABLE waste_record (
  waste_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ingredient_id INT UNSIGNED NOT NULL,
  quantity      DECIMAL(12,3) NOT NULL,
  reason        VARCHAR(255) NOT NULL,
  status        ENUM('PROPOSED','CONFIRMED','REJECTED') NOT NULL DEFAULT 'PROPOSED',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by    INT UNSIGNED NOT NULL,
  confirmed_at  DATETIME NULL,
  confirmed_by  INT UNSIGNED NULL,
  PRIMARY KEY (waste_id),
  KEY ix_waste_ingredient (ingredient_id),
  CONSTRAINT fk_waste_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (ingredient_id),
  CONSTRAINT fk_waste_created_by FOREIGN KEY (created_by) REFERENCES employee (employee_id),
  CONSTRAINT fk_waste_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES employee (employee_id),
  CONSTRAINT ck_waste_quantity CHECK (quantity > 0),
  CONSTRAINT ck_waste_confirm CHECK (status = 'PROPOSED' OR (confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL))
) ENGINE=InnoDB COMMENT='Phiếu hao hụt: pha chế đề xuất, Chủ quán/Quản lý xác nhận (FR-M06-006, 009, ASM-11)';

CREATE TABLE stock_adjustment (
  adjustment_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ingredient_id   INT UNSIGNED NOT NULL,
  quantity_before DECIMAL(12,3) NOT NULL,
  quantity_after  DECIMAL(12,3) NOT NULL,
  reason          VARCHAR(255) NOT NULL,
  adjusted_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  adjusted_by     INT UNSIGNED NOT NULL,
  PRIMARY KEY (adjustment_id),
  KEY ix_adjust_ingredient (ingredient_id),
  CONSTRAINT fk_adjust_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredient (ingredient_id),
  CONSTRAINT fk_adjust_employee FOREIGN KEY (adjusted_by) REFERENCES employee (employee_id),
  CONSTRAINT ck_adjust_qty CHECK (quantity_before >= 0 AND quantity_after >= 0)
) ENGINE=InnoDB COMMENT='Điều chỉnh tồn kho khi kiểm kê lệch (FR-M06-005, ISS-C4-14)';

-- ---------------------------------------------------------------------
-- M09, M08: khuyến mãi, thành viên
-- ---------------------------------------------------------------------
CREATE TABLE promotion (
  promotion_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name             VARCHAR(100) NOT NULL,
  item_group       ENUM('COFFEE','TEA','SMOOTHIE','CAKE') NOT NULL,
  discount_percent TINYINT UNSIGNED NOT NULL,
  start_date       DATE NULL,
  end_date         DATE NULL,
  daily_start      TIME NOT NULL,
  daily_end        TIME NOT NULL,
  active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Chọn chương trình tạo trước khi trùng mức giảm (ASM-21)',
  PRIMARY KEY (promotion_id),
  CONSTRAINT ck_promotion_percent CHECK (discount_percent BETWEEN 1 AND 50),   -- ISS-C4-08
  CONSTRAINT ck_promotion_dates CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB COMMENT='Chương trình khuyến mãi theo phần trăm cho một nhóm món (FR-M09-001..004)';

CREATE TABLE customer (
  customer_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name   VARCHAR(100) NOT NULL,
  phone       CHAR(10) NOT NULL,
  points      INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (customer_id),
  UNIQUE KEY uq_customer_phone (phone),                          -- BR-024
  CONSTRAINT ck_customer_phone CHECK (phone REGEXP '^0[0-9]{9}$') -- ISS-C4-18
) ENGINE=InnoDB COMMENT='Khách hàng thành viên (FR-M08-001..006)';

-- ---------------------------------------------------------------------
-- M03, M04, M05: bàn và đơn hàng
-- ---------------------------------------------------------------------
CREATE TABLE dining_table (
  table_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  number   TINYINT UNSIGNED NOT NULL,
  area     ENUM('INDOOR','OUTDOOR') NOT NULL,
  status   ENUM('EMPTY','SERVING','WAITING_PAYMENT') NOT NULL DEFAULT 'EMPTY',
  PRIMARY KEY (table_id),
  UNIQUE KEY uq_table_number (number)
) ENGINE=InnoDB COMMENT='14 bàn: 8 trong nhà, 6 ngoài trời (FR-M03-001, ASM-20)';

CREATE TABLE orders (
  order_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_type ENUM('DINE_IN','TAKEAWAY') NOT NULL COMMENT 'Phân biệt quan hệ kế thừa (ISA)',
  status     ENUM('DRAFT','PROCESSING','DONE','CANCELLED') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INT UNSIGNED NOT NULL,
  PRIMARY KEY (order_id),
  KEY ix_orders_status (status),
  CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES employee (employee_id),
  CONSTRAINT ck_orders_draft CHECK (status <> 'DRAFT' OR order_type = 'TAKEAWAY')   -- chỉ đơn mang đi có đơn nháp
) ENGINE=InnoDB COMMENT='Đơn hàng (lớp cha của đơn tại quán và đơn mang đi)';

CREATE TABLE dine_in_order (
  order_id       INT UNSIGNED NOT NULL,
  table_id       INT UNSIGNED NOT NULL,
  open_table_id  INT UNSIGNED NULL COMMENT 'Bằng table_id khi đơn còn mở, NULL khi đã thanh toán/hủy; duy nhất => mỗi bàn tối đa một đơn mở (ASM-01)',
  PRIMARY KEY (order_id),
  UNIQUE KEY uq_one_open_order_per_table (open_table_id),
  KEY ix_dinein_table (table_id),
  CONSTRAINT fk_dinein_order FOREIGN KEY (order_id) REFERENCES orders (order_id),
  CONSTRAINT fk_dinein_table FOREIGN KEY (table_id) REFERENCES dining_table (table_id)
) ENGINE=InnoDB COMMENT='Đơn tại quán: gắn với một bàn (FR-M03-002, 006)';

CREATE TABLE takeaway_order (
  order_id       INT UNSIGNED NOT NULL,
  queue_date     DATE NULL,
  queue_number   SMALLINT UNSIGNED NULL COMMENT 'Số thứ tự trong ngày từ 001; đơn nháp chưa có (ASM-04)',
  payment_method ENUM('CASH','TRANSFER_QR') NOT NULL,
  quoted_total   BIGINT NULL COMMENT 'Số tiền đã báo khách khi tạo đơn nháp chuyển khoản/QR; so khớp lại lúc xác nhận (ASM-03)',
  customer_id    INT UNSIGNED NULL COMMENT 'Thành viên dự định tích/dùng điểm cho đơn nháp',
  points_to_use  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Số điểm dự định dùng, đã tính trong quoted_total',
  handed_over_at DATETIME NULL COMMENT 'Thời điểm Thu ngân giao đồ cho khách; NULL là chưa giao',
  PRIMARY KEY (order_id),
  UNIQUE KEY uq_takeaway_queue (queue_date, queue_number),
  CONSTRAINT fk_takeaway_order FOREIGN KEY (order_id) REFERENCES orders (order_id),
  CONSTRAINT fk_takeaway_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id),
  CONSTRAINT ck_takeaway_queue CHECK ((queue_date IS NULL AND queue_number IS NULL) OR (queue_date IS NOT NULL AND queue_number >= 1))
) ENGINE=InnoDB COMMENT='Đơn mang đi: số thứ tự trong ngày, phương thức thanh toán (FR-M04-001..006)';

CREATE TABLE order_batch (
  batch_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  sent_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (batch_id),
  KEY ix_batch_order (order_id),
  CONSTRAINT fk_batch_order FOREIGN KEY (order_id) REFERENCES orders (order_id)
) ENGINE=InnoDB COMMENT='Mỗi lần gửi order xuống quầy pha chế có thời điểm riêng (FR-M03-003)';

CREATE TABLE order_line (
  line_id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id         INT UNSIGNED NOT NULL,
  item_id          INT UNSIGNED NOT NULL,
  size             ENUM('M','L') NOT NULL,
  quantity         SMALLINT UNSIGNED NOT NULL,
  temperature      ENUM('HOT','COLD') NULL COMMENT 'NULL với bánh',
  sugar_level      TINYINT UNSIGNED NULL COMMENT '0/30/50/70/100 (%), NULL với bánh',
  ice_level        ENUM('NONE','LOW','NORMAL','SEPARATE') NULL COMMENT 'NULL với bánh hoặc đồ uống nóng; SEPARATE (đá riêng) chỉ dùng cho đơn mang đi',
  unit_price       BIGINT NOT NULL COMMENT 'Giá chốt lúc gửi order (BR-018)',
  discount_percent TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Khuyến mãi chốt lúc gửi order (BR-019)',
  promotion_id     INT UNSIGNED NULL,
  status           ENUM('NEW','MAKING','DONE','CANCELLED') NOT NULL DEFAULT 'NEW',
  cancel_reason    VARCHAR(255) NULL,
  cancelled_by     INT UNSIGNED NULL,
  cancelled_at     DATETIME NULL,
  PRIMARY KEY (line_id),
  KEY ix_line_batch (batch_id),
  KEY ix_line_status (status),
  CONSTRAINT fk_line_batch FOREIGN KEY (batch_id) REFERENCES order_batch (batch_id),
  CONSTRAINT fk_line_item_size FOREIGN KEY (item_id, size) REFERENCES item_size (item_id, size),
  CONSTRAINT fk_line_promotion FOREIGN KEY (promotion_id) REFERENCES promotion (promotion_id),
  CONSTRAINT fk_line_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES employee (employee_id),
  CONSTRAINT ck_line_quantity CHECK (quantity >= 1),
  CONSTRAINT ck_line_price CHECK (unit_price >= 0),
  CONSTRAINT ck_line_discount CHECK (discount_percent BETWEEN 0 AND 100),
  CONSTRAINT ck_line_sugar CHECK (sugar_level IS NULL OR sugar_level IN (0,30,50,70,100)),
  CONSTRAINT ck_line_cancel CHECK (status <> 'CANCELLED' OR (cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL))
) ENGINE=InnoDB COMMENT='Dòng món: trạng thái được quản lý theo từng dòng món (BR-004)';

CREATE TABLE order_line_topping (
  line_id    INT UNSIGNED NOT NULL,
  topping_id INT UNSIGNED NOT NULL,
  surcharge  BIGINT NOT NULL COMMENT 'Phụ phí chốt lúc gửi order (BR-018)',
  PRIMARY KEY (line_id, topping_id),
  CONSTRAINT fk_olt_line FOREIGN KEY (line_id) REFERENCES order_line (line_id),
  CONSTRAINT fk_olt_topping FOREIGN KEY (topping_id) REFERENCES topping (topping_id),
  CONSTRAINT ck_olt_surcharge CHECK (surcharge >= 0)
) ENGINE=InnoDB COMMENT='Topping của một dòng món; thực thể yếu của order_line';

-- ---------------------------------------------------------------------
-- M07: hóa đơn, hoàn tiền; M08: lịch sử điểm
-- ---------------------------------------------------------------------
CREATE TABLE invoice (
  invoice_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id           INT UNSIGNED NOT NULL,
  session_id         INT UNSIGNED NOT NULL,
  customer_id        INT UNSIGNED NULL,
  payment_method     ENUM('CASH','TRANSFER_QR') NOT NULL,
  subtotal           BIGINT NOT NULL COMMENT 'Giá món + topping, sau khuyến mãi',
  promotion_discount BIGINT NOT NULL DEFAULT 0,
  points_used        INT UNSIGNED NOT NULL DEFAULT 0,
  total              BIGINT NOT NULL COMMENT 'Số tiền thực trả, làm tròn 500 đồng (BR-021)',
  points_earned      INT UNSIGNED NOT NULL DEFAULT 0,
  status             ENUM('PAID','CANCELLED') NOT NULL DEFAULT 'PAID',
  issued_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  issued_by          INT UNSIGNED NOT NULL COMMENT 'Thu ngân lập hóa đơn',
  reprint_count      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  cancel_reason      VARCHAR(255) NULL,
  cancelled_by       INT UNSIGNED NULL,
  cancelled_at       DATETIME NULL,
  PRIMARY KEY (invoice_id),
  UNIQUE KEY uq_invoice_order (order_id),                           -- BR-029: một đơn thanh toán một lần
  KEY ix_invoice_session (session_id),
  KEY ix_invoice_customer (customer_id),
  KEY ix_invoice_issued (issued_at),
  CONSTRAINT fk_invoice_order FOREIGN KEY (order_id) REFERENCES orders (order_id),
  CONSTRAINT fk_invoice_session FOREIGN KEY (session_id) REFERENCES cashier_session (session_id),
  CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id),
  CONSTRAINT fk_invoice_issued_by FOREIGN KEY (issued_by) REFERENCES employee (employee_id),
  CONSTRAINT fk_invoice_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES employee (employee_id),
  CONSTRAINT ck_invoice_amounts CHECK (subtotal >= 0 AND promotion_discount >= 0 AND total >= 0),
  CONSTRAINT ck_invoice_round CHECK (total % 500 = 0),              -- BR-021: làm tròn 500 đồng
  CONSTRAINT ck_invoice_points CHECK (points_used = 0 OR customer_id IS NOT NULL),
  CONSTRAINT ck_invoice_cancel CHECK (status = 'PAID' OR (cancel_reason IS NOT NULL AND cancelled_by IS NOT NULL AND cancelled_at IS NOT NULL))
) ENGINE=InnoDB COMMENT='Hóa đơn: không sửa, không xóa; hủy thì chuyển Đã hủy (BR-030, BR-031)';

CREATE TABLE refund_record (
  refund_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id      INT UNSIGNED NOT NULL,
  order_line_id   INT UNSIGNED NULL COMMENT 'Dòng món bị hủy riêng (hoàn một phần)',
  type            ENUM('FULL','PARTIAL') NOT NULL,
  cash_amount     BIGINT NOT NULL,
  points_refunded INT UNSIGNED NOT NULL DEFAULT 0,
  reason          VARCHAR(255) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by      INT UNSIGNED NOT NULL,
  confirmed_at    DATETIME NULL,
  confirmed_by    INT UNSIGNED NULL,
  PRIMARY KEY (refund_id),
  KEY ix_refund_invoice (invoice_id),
  CONSTRAINT fk_refund_invoice FOREIGN KEY (invoice_id) REFERENCES invoice (invoice_id),
  CONSTRAINT fk_refund_line FOREIGN KEY (order_line_id) REFERENCES order_line (line_id),
  CONSTRAINT fk_refund_created_by FOREIGN KEY (created_by) REFERENCES employee (employee_id),
  CONSTRAINT fk_refund_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES employee (employee_id),
  CONSTRAINT ck_refund_amount CHECK (cash_amount >= 0 AND cash_amount % 500 = 0),
  CONSTRAINT ck_refund_type CHECK ((type = 'FULL' AND order_line_id IS NULL) OR (type = 'PARTIAL' AND order_line_id IS NOT NULL)),
  CONSTRAINT ck_refund_confirm CHECK ((confirmed_at IS NULL) = (confirmed_by IS NULL))
) ENGINE=InnoDB COMMENT='Hoàn tiền toàn bộ (hủy hóa đơn) hoặc một phần (hủy riêng dòng món); việc trả tiền thực tế ở ngoài hệ thống (BR-027, BR-033)';

CREATE TABLE point_transaction (
  tx_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  invoice_id  INT UNSIGNED NULL,
  type        ENUM('EARN','REDEEM','REFUND','REVOKE') NOT NULL,
  points      INT UNSIGNED NOT NULL,
  shortfall   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Phần không đủ để thu hồi (BR-032)',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tx_id),
  KEY ix_pt_customer (customer_id, created_at),
  CONSTRAINT fk_pt_customer FOREIGN KEY (customer_id) REFERENCES customer (customer_id),
  CONSTRAINT fk_pt_invoice FOREIGN KEY (invoice_id) REFERENCES invoice (invoice_id),
  CONSTRAINT ck_pt_shortfall CHECK (shortfall = 0 OR type = 'REVOKE')
) ENGINE=InnoDB COMMENT='Lịch sử biến động điểm: tích, dùng, hoàn, thu hồi (FR-M08-006)';

SET FOREIGN_KEY_CHECKS = 1;
