#!/usr/bin/env python3
# Chạy kịch bản kiểm thử ràng buộc nghiệp vụ trên VTPH_Coffee. Mỗi test chạy trong một giao dịch rồi ROLLBACK.
# Mật khẩu lấy từ biến môi trường MYSQL_PWD (không lưu trong file). Dùng: MYSQL_PWD=... python3 run_tests.py
import subprocess, os, sys
MYSQL='/usr/local/mysql/bin/mysql'
USER=os.environ.get('MYSQL_USER','vtph')
SETUP_ORDER=("INSERT INTO orders (order_id,order_type,status,created_by) VALUES (%d,'DINE_IN','PROCESSING',4);"
             "INSERT INTO dine_in_order (order_id,table_id) VALUES (%d,%d);")
T=[]
def t(id_,rule,expect,sql): T.append((id_,rule,expect,sql))
t('T01','BR-011 tồn kho không âm','error:ck_ingredient_stock',"UPDATE ingredient SET current_stock=-1 WHERE ingredient_id=1;")
t('T02','BR-024 số điện thoại thành viên duy nhất','error:Duplicate',"INSERT INTO customer (full_name,phone) VALUES ('Trùng số','0912345678');")
t('T03','ISS-C4-18 số điện thoại 10 chữ số bắt đầu bằng 0','error:ck_customer_phone',"INSERT INTO customer (full_name,phone) VALUES ('Sai số','12345');")
t('T04','ISS-C4-08 mức giảm khuyến mãi 1-50%','error:ck_promotion_percent',"INSERT INTO promotion (name,item_group,discount_percent,daily_start,daily_end) VALUES ('Quá mức','TEA',60,'10:00:00','11:00:00');")
t('T05','BR-021 tổng tiền hóa đơn làm tròn 500 đồng','error:ck_invoice_round',
  "INSERT INTO orders (order_id,order_type,status,created_by) VALUES (100,'TAKEAWAY','PROCESSING',2);INSERT INTO takeaway_order (order_id,queue_date,queue_number,payment_method) VALUES (100,CURDATE(),9,'CASH');"
  "INSERT INTO invoice (order_id,session_id,payment_method,subtotal,total,issued_by) VALUES (100,1,'CASH',83250,83250,2);")
t('T06','BR-029 một đơn không thanh toán hai lần','error:uq_invoice_order',
  "INSERT INTO invoice (order_id,session_id,payment_method,subtotal,total,issued_by) VALUES (1,1,'CASH',500,500,2);")
t('T07','BR-035 chỉ có một phiên ca thu ngân đang mở','error:uq_one_open_session',
  "INSERT INTO business_day (business_date,status,closed_at) VALUES (CURDATE()+INTERVAL 1 DAY,'CLOSED',NOW());INSERT INTO cashier_session (business_date,shift,opening_cash,opened_by) VALUES (CURDATE(),'MORNING',100000,2);")
t('T08','ISS-C4-10 còn đơn nháp thì không được chốt ca','error:ISS-C4-10',
  "UPDATE cashier_session SET status='CLOSED',closed_at=NOW(),closed_by=2,expected_cash=1000,actual_cash=1000,difference=0 WHERE session_id=1;")
t('T09','Chốt ca thành công sau khi đã hủy đơn nháp','ok',
  "UPDATE orders SET status='CANCELLED' WHERE order_id=3;UPDATE takeaway_order SET handed_over_at=NOW() WHERE order_id=2;UPDATE cashier_session SET status='CLOSED',closed_at=NOW(),closed_by=2,expected_cash=1000,actual_cash=1000,difference=0 WHERE session_id=1;")
t('T10','BR-035/ASM-15 không phát hành hóa đơn khi không có ca mở','error:phiên ca thu ngân đang mở',
  "UPDATE orders SET status='CANCELLED' WHERE order_id=3;UPDATE takeaway_order SET handed_over_at=NOW() WHERE order_id=2;UPDATE cashier_session SET status='CLOSED',closed_at=NOW(),closed_by=2,expected_cash=1000,actual_cash=1000,difference=0 WHERE session_id=1;"
  "INSERT INTO orders (order_id,order_type,status,created_by) VALUES (101,'TAKEAWAY','PROCESSING',2);INSERT INTO takeaway_order (order_id,queue_date,queue_number,payment_method) VALUES (101,CURDATE(),9,'CASH');"
  "INSERT INTO invoice (order_id,session_id,payment_method,subtotal,total,issued_by) VALUES (101,1,'CASH',1000,1000,2);")
t('T11','BR-028 đơn tại quán còn món New/Making thì không thanh toán','error:BR-028',
  SETUP_ORDER%(102,102,5)+"INSERT INTO order_batch (batch_id,order_id) VALUES (900,102);INSERT INTO order_line (batch_id,item_id,size,quantity,unit_price) VALUES (900,1,'M',1,29000);"
  "INSERT INTO invoice (order_id,session_id,payment_method,subtotal,total,issued_by) VALUES (102,1,'CASH',29000,29000,2);")
t('T12','BR-014 đơn nháp không phát sinh hóa đơn','error:đơn nháp',
  "INSERT INTO invoice (order_id,session_id,payment_method,subtotal,total,issued_by) VALUES (3,1,'TRANSFER_QR',42000,42000,2);")
t('T13','BR-030 không sửa nội dung giao dịch của hóa đơn','error:BR-030',"UPDATE invoice SET total=1000 WHERE invoice_id=1;")
t('T14','NFR-010 không xóa hóa đơn','error:NFR-010',"DELETE FROM invoice WHERE invoice_id=1;")
t('T15','BR-004 chuyển trạng thái dòng món không hợp lệ (Done -> New)','error:BR-004',"UPDATE order_line SET status='NEW' WHERE line_id=1;")
t('T16','BR-025 hủy món đã Making bắt buộc ghi lý do','error:BR-025',
  "CALL sp_start_making(3);UPDATE order_line SET status='CANCELLED',cancelled_by=1,cancelled_at=NOW() WHERE line_id=3;")
t('T17','BR-025 hủy món đã Making có lý do thì thành công','ok',
  "CALL sp_start_making(3);UPDATE order_line SET status='CANCELLED',cancel_reason='khách đổi ý',cancelled_by=1,cancelled_at=NOW() WHERE line_id=3;")
t('T18','BR-010 thiếu nguyên liệu: không cho Making, size chuyển Hết hàng (SYSTEM)','error:BR-010',
  "UPDATE ingredient SET current_stock=1 WHERE name='Cà phê hạt Robusta';CALL sp_start_making(3);")
t('T19','ASM-01 mỗi bàn tối đa một đơn đang mở','error:uq_one_open_order_per_table',
  SETUP_ORDER%(103,103,5)+SETUP_ORDER%(104,104,5))
t('T20','ASM-01 bàn đã thanh toán xong thì mở được đơn mới','ok',SETUP_ORDER%(105,105,3))
t('T21','BR-017 nguyên liệu theo dõi hạn dùng phải có hạn sử dụng','error:BR-017',
  "INSERT INTO stock_receipt (ingredient_id,quantity) VALUES (3,1000);")
t('T22','Nguyên liệu không theo dõi hạn dùng nhập kho không cần hạn','ok',
  "INSERT INTO stock_receipt (ingredient_id,quantity) VALUES (5,1000);")
t('T23','ASM-11 phiếu hao hụt xác nhận phải có người xác nhận','error:ck_waste_confirm',
  "UPDATE waste_record SET status='CONFIRMED' WHERE waste_id=1;")
t('T24','ASM-13 tài khoản Khóa tạm phải có thời điểm mở khóa','error:ck_account_lock',
  "UPDATE account SET status='TEMP_LOCKED' WHERE account_id=2;")
t('T25','BR-027 hoàn một phần phải gắn với dòng món','error:ck_refund_type',
  "INSERT INTO refund_record (invoice_id,type,cash_amount,reason,created_by) VALUES (2,'PARTIAL',1000,'x',1);")
t('T26','BR-037 không chốt ngày khi còn đơn mở và ca đang mở','error:BR-037',
  "UPDATE business_day SET status='CLOSED',closed_at=NOW() WHERE business_date=CURDATE();")
t('T27','FR-M06-001/002 công thức thuộc một kích thước món HOẶC một topping','error:ck_recipe_arc',
  "INSERT INTO recipe (item_id,size,topping_id) VALUES (1,'M',1);")
t('T28','BR-013 món phải phục vụ được ít nhất một cách (nóng hoặc lạnh)','error:ck_menu_item_mode',
  "INSERT INTO menu_item (name,item_group,allow_hot,allow_cold) VALUES ('Món lỗi','TEA',0,0);")
t('T29','FR-M02-004 mức đường chỉ 0/30/50/70/100','error:ck_line_sugar',
  "INSERT INTO order_line (batch_id,item_id,size,quantity,unit_price,sugar_level) VALUES (1,1,'M',1,29000,40);")
t('T30','BR-031 không hủy hóa đơn khi đơn còn món Making','error:BR-031',
  "CALL sp_start_making(3);UPDATE invoice SET status='CANCELLED',cancel_reason='sai',cancelled_by=1,cancelled_at=NOW() WHERE invoice_id=2;")
t('T31','BR-031 hủy hóa đơn khi ca chưa chốt và không còn món Making','ok',
  "UPDATE invoice SET status='CANCELLED',cancel_reason='khách yêu cầu',cancelled_by=1,cancelled_at=NOW() WHERE invoice_id=2;")
t('T32','BR-031/BR-038 không hủy hóa đơn khi ca đã chốt','error:BR-031',
  "UPDATE orders SET status='CANCELLED' WHERE order_id=3;UPDATE takeaway_order SET handed_over_at=NOW() WHERE order_id=2;UPDATE cashier_session SET status='CLOSED',closed_at=NOW(),closed_by=2,expected_cash=1000,actual_cash=1000,difference=0 WHERE session_id=1;"
  "UPDATE invoice SET status='CANCELLED',cancel_reason='muộn',cancelled_by=1,cancelled_at=NOW() WHERE invoice_id=2;")
t('T33','BR-030 hóa đơn đã hủy không đổi sang trạng thái khác','error:BR-030',
  "UPDATE invoice SET status='CANCELLED',cancel_reason='a',cancelled_by=1,cancelled_at=NOW() WHERE invoice_id=2;UPDATE invoice SET status='PAID' WHERE invoice_id=2;")
t('T34','BR-018 giá món/giá trị âm không hợp lệ','error:ck_line_price',
  "INSERT INTO order_line (batch_id,item_id,size,quantity,unit_price) VALUES (1,1,'M',1,-1);")
t('T35','NFR-010 hóa đơn in lại chỉ tăng bộ đếm in lại, không đổi nội dung','ok',
  "UPDATE invoice SET reprint_count=reprint_count+1 WHERE invoice_id=1;")
t('T36','UC-31 còn đơn mang đi chưa giao khách thì không được chốt ca','error:chưa giao khách',
  "UPDATE orders SET status='CANCELLED' WHERE order_id=3;UPDATE cashier_session SET status='CLOSED',closed_at=NOW(),closed_by=2,expected_cash=1000,actual_cash=1000,difference=0 WHERE session_id=1;")
def run(sql):
    full="START TRANSACTION;"+sql+";ROLLBACK;"
    p=subprocess.run([MYSQL,'-u',USER,'--default-character-set=utf8mb4','--batch','-e',full,'VTPH_Coffee'],capture_output=True,text=True)
    return p.returncode,(p.stderr or '').strip()
ok=0; rows=[]
for id_,rule,exp,sql in T:
    rc,err=run(sql)
    if exp=='ok': good=(rc==0)
    else: good=(rc!=0 and exp.split(':',1)[1].lower() in err.lower())
    ok+=good; short=(err.split('\n')[-1] if err else 'thực hiện thành công').replace('ERROR ','')[:120]
    rows.append((id_,rule,'THÀNH CÔNG' if exp=='ok' else 'BỊ CHẶN',('ĐẠT' if good else 'KHÔNG ĐẠT'),short))
w=lambda s:print(s)
w('| Mã | Quy tắc kiểm thử | Kết quả mong đợi | Kết luận | Phản hồi của MySQL |'); w('|---|---|---|---|---|')
for r in rows: w('| '+' | '.join(r)+' |')
w(f'\nTổng: {ok}/{len(T)} đạt')
sys.exit(0 if ok==len(T) else 1)
