@echo off
rem Chạy backend và giao diện ở hai cửa sổ riêng.
cd /d "%~dp0\.."
if not exist frontend\node_modules call npm --prefix frontend install
start "backend" cmd /k mvn -f backend\pom.xml spring-boot:run
call npm --prefix frontend run dev
