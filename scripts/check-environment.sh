#!/usr/bin/env bash
# Kiểm tra công cụ cần thiết để phát triển. Không thay đổi gì trên máy.
ok=0
check() { # tên, lệnh, mô tả phiên bản tối thiểu
  if command -v "$2" >/dev/null 2>&1; then printf '  OK   %-8s %s\n' "$1" "$($2 $3 2>&1 | head -1)"; else printf '  THIẾU %-8s (%s)\n' "$1" "$4"; ok=1; fi
}
echo "Công cụ:"
check java java -version "cần Java 21"
check maven mvn -v "cần Maven 3.9+"
check node node -v "cần Node 22+"
check npm npm -v "đi kèm Node"
check docker docker --version "tùy chọn, để chạy compose"
exit $ok
