# Lệnh thường dùng. Windows không có make: xem docs/development/setup.md để chạy từng lệnh.
.PHONY: backend frontend test lint build sync-migrations check-sql up down

backend:        ## Chạy backend (chế độ giả lập, không cần MySQL) ở cổng 8080
	mvn -f backend/pom.xml spring-boot:run

frontend:       ## Chạy giao diện ở cổng 5173
	npm --prefix frontend run dev

test:           ## Chạy toàn bộ kiểm thử
	mvn -f backend/pom.xml -q test
	npm --prefix frontend run test

lint:           ## Kiểm tra mã nguồn giao diện
	npm --prefix frontend run lint
	npm --prefix frontend run format:check
	npm --prefix frontend run typecheck

build:          ## Đóng gói backend và giao diện
	mvn -f backend/pom.xml -q -DskipTests package
	npm --prefix frontend run build

sync-migrations: ## Sinh lại tệp Flyway từ database/*.sql
	python3 scripts/sync-migrations.py

check-sql:      ## Kiểm tra tệp Flyway khớp database/*.sql (không ghi)
	python3 scripts/sync-migrations.py --check

up:             ## Chạy MySQL (Docker) + backend + giao diện
	scripts/dev-mysql.sh

down:           ## Dừng container MySQL (dữ liệu giữ trong volume)
	docker stop vtph-mysql
