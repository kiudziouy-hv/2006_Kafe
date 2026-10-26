-- =====================================================================
-- VTPH Coffee - Tạo database (chạy một lần, trước 01_schema.sql)
-- MySQL 8.4. Chạy bằng tài khoản có quyền CREATE (ví dụ root).
-- Tạo tài khoản ứng dụng riêng, KHÔNG dùng root cho backend (xem database/README.md).
-- =====================================================================
CREATE DATABASE IF NOT EXISTS VTPH_Coffee
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_as_ci;
