#!/usr/bin/env bash
# Chạy backend (giả lập) và giao diện cùng lúc. Nhấn Ctrl+C để dừng cả hai.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -d frontend/node_modules ] || npm --prefix frontend install
mvn -q -f backend/pom.xml spring-boot:run &
BACK=$!
trap 'kill $BACK 2>/dev/null || true' EXIT
npm --prefix frontend run dev
