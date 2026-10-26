#!/usr/bin/env python3
"""Tạo các tệp Flyway trong backend/src/main/resources/db từ database/*.sql (nguồn chuẩn của Chương 5).

Bỏ USE và khối DROP TABLE; ALTER DATABASE được đổi sang CSDL hiện tại (không kèm tên)
(Flyway luôn chạy trên cơ sở dữ liệu trống hoặc đã có phiên bản). Nội dung còn lại giữ nguyên.
Chạy lại bất cứ khi nào sửa database/*.sql:  python3 scripts/sync-migrations.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "database"
OUT = ROOT / "backend" / "src" / "main" / "resources" / "db"
MAP = {  # tệp nguồn -> (thư mục, tên Flyway)
    "01_schema.sql": ("migration", "V1__schema.sql"),
    "02_triggers.sql": ("migration", "V2__triggers.sql"),
    "03_seed_master.sql": ("seed", "V3__seed_master.sql"),
    "04_views_procedures.sql": ("migration", "V4__views_procedures.sql"),
    "05_seed_transactions.sql": ("seed", "V5__seed_transactions.sql"),
}

def convert(text: str) -> str:
    # Giữ charset/collation của CSDL (accent-sensitive) nhưng áp cho CSDL hiện tại thay vì tên cố định.
    text = re.sub(r"^ALTER DATABASE\s+\w+\s+", "ALTER DATABASE ", text, flags=re.M)
    text = re.sub(r"^USE\s+\w+;\s*$", "", text, flags=re.M | re.I)
    text = re.sub(r"^DROP TABLE IF EXISTS[^;]*;\s*$", "", text, flags=re.M | re.S)
    return "-- Sinh tự động từ database/{name} bằng scripts/sync-migrations.py. Không sửa tay.\n" + text

def main() -> None:
    for name, (folder, target) in MAP.items():
        dest = OUT / folder / target
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(convert((SRC / name).read_text(encoding="utf-8")).replace("{name}", name), encoding="utf-8")
        print(f"{name} -> db/{folder}/{target}")

if __name__ == "__main__":
    main()
