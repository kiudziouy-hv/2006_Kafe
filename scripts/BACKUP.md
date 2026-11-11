# Sao lưu và khôi phục

Theo RAD: sao lưu tự động **hai lần mỗi ngày** (lúc chuyển ca 14:30 và sau giờ đóng cửa), giữ **tối thiểu 30 bản**
gần nhất (NFR-013), và khôi phục được **trong vòng 4 giờ** (NFR-014). Việc sao lưu không phụ thuộc chốt ngày.

## Cài đặt (làm một lần trên máy chủ của quán)

1. **Tài khoản MySQL riêng cho sao lưu** (không dùng `root`, không dùng tài khoản của backend):

   ```sql
   CREATE USER 'vtph_backup'@'localhost' IDENTIFIED BY '<mật-khẩu-mạnh>';
   GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES ON VTPH_Coffee.* TO 'vtph_backup'@'localhost';
   ```

2. **File cấu hình mật khẩu** `/etc/vtph/backup.cnf` (quyền `600`, chủ sở hữu là tài khoản chạy cron):

   ```ini
   [client]
   user=vtph_backup
   password=<mật-khẩu-mạnh>
   ```

3. **Đặt múi giờ máy chủ là `Asia/Ho_Chi_Minh`** (`timedatectl set-timezone Asia/Ho_Chi_Minh`) để giờ cron đúng giờ quán.

4. **Lịch cron** (`crontab -e`), đường dẫn sửa theo nơi đặt repo:

   ```cron
   MYSQL_DEFAULTS_FILE=/etc/vtph/backup.cnf
   BACKUP_DIR=/var/backups/vtph
   30 14 * * * /opt/vtph/scripts/backup.sh >> /var/log/vtph-backup.log 2>&1
   30 22 * * * /opt/vtph/scripts/backup.sh >> /var/log/vtph-backup.log 2>&1
   ```

   Giờ thứ hai (22:30) giả định quán đóng cửa lúc 22:00 (ca tối kết thúc 22:00 theo BR-034); đổi nếu quán đóng khác giờ.

## Sao lưu ra ngoài máy chủ

Thư mục `/var/backups/vtph` nằm cùng ổ đĩa với CSDL: nếu ổ hỏng thì mất cả hai. Nhóm đã chọn lưu ra một nơi ngoài máy chủ
(ổ USB, ổ mạng/NAS hoặc máy khác trong mạng quán). Mount nơi đó vào máy chủ rồi đặt `OFFSITE_DIR`; script chép thêm một bản
sau mỗi lần sao lưu và cũng giữ tối đa `KEEP` bản ở đó. Nếu không chép được (ổ chưa mount, đầy), script thoát mã 3 và ghi
cảnh báo vào log; bản ở `BACKUP_DIR` vẫn còn nguyên.

```cron
OFFSITE_DIR=/mnt/vtph-backup
```

Đặt dòng trên cạnh `MYSQL_DEFAULTS_FILE` và `BACKUP_DIR` trong crontab. Định kỳ kiểm tra log `/var/log/vtph-backup.log`.

## Khôi phục

```bash
# 1. Dừng backend.
# 2. Chọn bản sao lưu (tên có ngày giờ) rồi khôi phục. Lệnh này GHI ĐÈ dữ liệu hiện có:
MYSQL_DEFAULTS_FILE=/etc/vtph/restore.cnf scripts/restore.sh /var/backups/vtph/VTPH_Coffee_20261027-143000.sql.gz --yes
# 3. Bật lại backend và kiểm tra /api/health.
```

Khôi phục cần tài khoản có quyền tạo/xóa bảng và trigger (ví dụ `root`), khác với tài khoản sao lưu chỉ đọc ở trên.

**Hãy diễn tập khôi phục định kỳ** vào một CSDL thử, không đợi có sự cố:

```bash
DB_NAME=VTPH_Test scripts/restore.sh <file.sql.gz> --yes
```

Script đã được kiểm thử: 12 lần sao lưu liên tiếp đều thành công và xoay vòng đúng; khôi phục sang CSDL khác cho
số bảng, trigger, thủ tục và số dòng dữ liệu khớp bản gốc.
