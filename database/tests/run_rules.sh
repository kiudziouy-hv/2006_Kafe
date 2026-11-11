#!/usr/bin/env bash
# Kiểm tra các quy tắc nghiệp vụ nằm trong CSDL (trigger, CHECK, UNIQUE, thủ tục).
# Cần CSDL vừa nạp bằng ../load.sh (đầy đủ, có 05). Mỗi ca chạy trong một giao dịch rồi ROLLBACK, không để lại dữ liệu.
#
#   MYSQL_ARGS="-uroot -p" ./run_rules.sh
set -uo pipefail
MYSQL_ARGS=${MYSQL_ARGS:--uroot}
pass=0; fail=0

run() { mysql $MYSQL_ARGS --default-character-set=utf8mb4 -N -B VTPH_Coffee -e "$1" 2>&1; }

# expect_fail <tên> <chuỗi phải có trong thông báo lỗi> <sql>
expect_fail() {
  local out code
  out=$(run "START TRANSACTION; $3; ROLLBACK;"); code=$?
  if [ $code -ne 0 ] && grep -qF -- "$2" <<<"$out"; then pass=$((pass+1)); echo "  ok    $1"
  else fail=$((fail+1)); echo "  LỖI   $1 (mong đợi lỗi chứa '$2', nhận exit=$code: ${out:0:200})"; fi
}
# expect_value <tên> <giá trị> <sql kết thúc bằng một SELECT>
expect_value() {
  local out code
  out=$(run "START TRANSACTION; $3; ROLLBACK;"); code=$?
  if [ $code -eq 0 ] && [ "$out" = "$2" ]; then pass=$((pass+1)); echo "  ok    $1"
  else fail=$((fail+1)); echo "  LỖI   $1 (mong đợi '$2', nhận exit=$code: ${out:0:200})"; fi
}

# Đơn tại quán ở bàn 1 có một dòng Cà phê sữa M (item 2) đang New; biến @o đơn, @l dòng.
SETUP_ORDER="
INSERT INTO orders(order_type,status,created_by) VALUES('DINE_IN','PROCESSING',4); SET @o=LAST_INSERT_ID();
INSERT INTO dine_in_order(order_id,table_id) VALUES(@o,1);
INSERT INTO order_batch(order_id) VALUES(@o); SET @b=LAST_INSERT_ID();
INSERT INTO order_line(batch_id,item_id,size,quantity,unit_price) VALUES(@b,2,'M',1,32000); SET @l=LAST_INSERT_ID();"
LINE_DONE="UPDATE order_line SET status='MAKING' WHERE line_id=@l; UPDATE order_line SET status='DONE' WHERE line_id=@l;"
INVOICE="INSERT INTO invoice(order_id,session_id,payment_method,subtotal,total,issued_by) VALUES(@o,1,'CASH',32000,32000,2)"

echo "Kho (BR-011, BR-017)"
expect_fail  "BR-011 tồn kho không âm"              "ck_ingredient_stock" "UPDATE ingredient SET current_stock=-1 WHERE ingredient_id=1"
expect_fail  "BR-017 sữa tươi bắt buộc hạn dùng"    "BR-017"              "INSERT INTO stock_receipt(ingredient_id,quantity) VALUES(3,10)"
expect_value "BR-017 có hạn dùng thì nhập được"     "1"                   "INSERT INTO stock_receipt(ingredient_id,quantity,expiry_date) VALUES(3,10,CURDATE()+INTERVAL 3 DAY); SELECT ROW_COUNT()"

echo "Đơn hàng và dòng món (ASM-01, BR-004, BR-025)"
expect_fail  "ASM-01 mỗi bàn tối đa một đơn mở"     "uq_one_open_order_per_table" "$SETUP_ORDER
  INSERT INTO orders(order_type,status,created_by) VALUES('DINE_IN','PROCESSING',4); SET @o2=LAST_INSERT_ID();
  INSERT INTO dine_in_order(order_id,table_id) VALUES(@o2,1)"
expect_fail  "BR-004 New không nhảy thẳng sang Done" "BR-004"  "$SETUP_ORDER UPDATE order_line SET status='DONE' WHERE line_id=@l"
expect_fail  "BR-004 Done không quay lại New"       "BR-004"  "$SETUP_ORDER $LINE_DONE UPDATE order_line SET status='NEW' WHERE line_id=@l"
expect_fail  "BR-025 hủy món Making phải có lý do"  "BR-025"  "$SETUP_ORDER UPDATE order_line SET status='MAKING' WHERE line_id=@l; UPDATE order_line SET status='CANCELLED' WHERE line_id=@l"
expect_fail  "NFR-010 không xóa đơn hàng"           "NFR-010" "DELETE FROM orders WHERE order_id=1"
expect_fail  "NFR-010 không xóa dòng món"           "NFR-010" "DELETE FROM order_line WHERE line_id=1"

echo "Hóa đơn (BR-021, BR-028, BR-029, BR-030, BR-035)"
expect_fail  "BR-028 còn dòng New thì chưa thanh toán" "BR-028" "$SETUP_ORDER $INVOICE"
expect_value "BR-028 mọi dòng Done thì thanh toán được, bàn được nhả" "1" "$SETUP_ORDER $LINE_DONE $INVOICE; SELECT open_table_id IS NULL FROM dine_in_order WHERE order_id=@o"
expect_fail  "BR-029 một đơn chỉ một hóa đơn"       "uq_invoice_order" "$SETUP_ORDER $LINE_DONE $INVOICE; $INVOICE"
expect_fail  "BR-021 tổng tiền phải chia hết 500"   "ck_invoice_round" "$SETUP_ORDER $LINE_DONE INSERT INTO invoice(order_id,session_id,payment_method,subtotal,total,issued_by) VALUES(@o,1,'CASH',32100,32100,2)"
expect_fail  "BR-030 không sửa nội dung hóa đơn"    "BR-030"  "UPDATE invoice SET total=1000 WHERE invoice_id=1"
expect_fail  "BR-030 không xóa hóa đơn"             "NFR-010" "DELETE FROM invoice WHERE invoice_id=1"
expect_fail  "BR-035 chỉ một phiên ca mở"           "uq_one_open_session" "INSERT INTO cashier_session(business_date,shift,opening_cash,opened_by) VALUES(CURDATE(),'MORNING',0,2)"

echo "Chốt ca và chốt ngày (ISS-C4-10, BR-037, BR-038)"
expect_fail  "ISS-C4-10 còn đơn nháp thì không chốt ca" "ISS-C4-10" "UPDATE cashier_session SET status='CLOSED',closed_at=NOW(),closed_by=2,expected_cash=1,actual_cash=1,difference=0 WHERE session_id=1"
expect_fail  "BR-037 còn phiên ca mở thì không chốt ngày" "BR-037" "UPDATE business_day SET status='CLOSED',closed_at=NOW() WHERE business_date=CURDATE()"

echo "Khuyến mãi và thành viên"
expect_fail  "Khuyến mãi tối đa 50%"                "ck_promotion_percent" "INSERT INTO promotion(name,item_group,discount_percent,daily_start,daily_end) VALUES('x','TEA',51,'08:00','09:00')"
expect_fail  "Số điện thoại 10 chữ số bắt đầu bằng 0" "ck_customer_phone" "INSERT INTO customer(full_name,phone) VALUES('A','1234567890')"
expect_fail  "BR-024 mỗi số điện thoại một thành viên" "uq_customer_phone" "INSERT INTO customer(full_name,phone) VALUES('B','0912345678')"

echo "Thủ tục pha chế (BR-009, BR-010)"
expect_value "sp_start_making trừ kho đồ uống"      "1" "$SETUP_ORDER SET @before=(SELECT current_stock FROM ingredient WHERE ingredient_id=1); CALL sp_start_making(@l); SELECT current_stock < @before FROM ingredient WHERE ingredient_id=1"
expect_value "sp_start_making chuyển dòng sang Making" "MAKING" "$SETUP_ORDER CALL sp_start_making(@l); SELECT status FROM order_line WHERE line_id=@l"
expect_fail  "BR-010 thiếu nguyên liệu thì không cho Making" "BR-010" "$SETUP_ORDER UPDATE ingredient SET current_stock=0 WHERE ingredient_id=1; CALL sp_start_making(@l)"

echo
echo "Đạt: $pass, lỗi: $fail"
[ $fail -eq 0 ]
