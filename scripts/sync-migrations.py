#!/usr/bin/env python3
"""Tạo các tệp Flyway trong backend/src/main/resources/db từ database/*.sql (nguồn chuẩn của Chương 5).

Bỏ USE và khối DROP TABLE; ALTER DATABASE được đổi sang CSDL hiện tại (không kèm tên)
(Flyway luôn chạy trên cơ sở dữ liệu trống hoặc đã có phiên bản). Nội dung còn lại giữ nguyên.
Chạy lại bất cứ khi nào sửa database/*.sql:  python3 scripts/sync-migrations.py
Chỉ kiểm tra, không ghi (thoát mã 1 nếu lệch):  python3 scripts/sync-migrations.py --check
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "database"
OUT = ROOT / "backend" / "src" / "main" / "resources" / "db"
MAP = {  # tệp nguồn -> (thư mục, tên Flyway)
    "01_schema.sql": ("migration", "V1__schema.sql"),
    "02_triggers.sql": ("migration", "V2__triggers.sql"),
    "03_seed_master.sql": ("seed", "V3__seed_master.sql"),
    "04_views_procedures.sql": ("migration", "V4__views_procedures.sql"),
    "05_seed_transactions.sql": ("seed", "V8__seed_transactions.sql"),  # đặt cuối để target=7 bỏ qua đơn mẫu
    "06_fix_expiry_view.sql": ("migration", "V6__fix_expiry_view.sql"),
    "07_invoice_reprint_log.sql": ("migration", "V7__invoice_reprint_log.sql"),
}

def convert(text: str) -> str:
    # Giữ charset/collation của CSDL (accent-sensitive) nhưng áp cho CSDL hiện tại thay vì tên cố định.
    text = re.sub(r"^ALTER DATABASE\s+\w+\s+", "ALTER DATABASE ", text, flags=re.M)
    text = re.sub(r"^USE\s+\w+;\s*$", "", text, flags=re.M | re.I)
    text = re.sub(r"^DROP TABLE IF EXISTS[^;]*;\s*$", "", text, flags=re.M | re.S)
    return "-- Sinh tự động từ database/{name} bằng scripts/sync-migrations.py. Không sửa tay.\n" + text

def main() -> None:
    check = "--check" in sys.argv[1:]
    stale = []
    for name, (folder, target) in MAP.items():
        dest = OUT / folder / target
        content = convert((SRC / name).read_text(encoding="utf-8")).replace("{name}", name)
        if check:
            if not dest.exists() or dest.read_text(encoding="utf-8") != content:
                stale.append(f"db/{folder}/{target}")
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(content, encoding="utf-8")
        print(f"{name} -> db/{folder}/{target}")
    if check:
        if stale:
            print("Tệp Flyway không khớp database/*.sql (chạy: python3 scripts/sync-migrations.py):", *stale, sep="\n  ")
            sys.exit(1)
        print("Tệp Flyway khớp database/*.sql.")

if __name__ == "__main__":
    main()
