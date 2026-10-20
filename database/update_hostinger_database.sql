-- Hatian Quick Update Script for Hostinger phpMyAdmin (SQL tab)
-- Run this if you already imported the database before and just need to add the new columns:

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Add receipt_images column to hatians table if it does not already exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'hatians'
  AND COLUMN_NAME = 'receipt_images';

SET @query = IF(@col_exists = 0,
  'ALTER TABLE `hatians` ADD COLUMN `receipt_images` JSON DEFAULT NULL AFTER `payment_methods`',
  'SELECT "receipt_images column already exists"');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add default_payment_methods column to users table if it does not already exist
SET @col_user_exists = 0;
SELECT COUNT(*) INTO @col_user_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'default_payment_methods';

SET @query_user = IF(@col_user_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `default_payment_methods` JSON DEFAULT NULL AFTER `email`',
  'SELECT "default_payment_methods column already exists"');
PREPARE stmt_user FROM @query_user;
EXECUTE stmt_user;
DEALLOCATE PREPARE stmt_user;

-- 3. Register migrations as completed
INSERT IGNORE INTO `migrations` (`migration`, `batch`) VALUES
('0001_01_01_000000_create_users_table', 1),
('0001_01_01_000001_create_cache_table', 1),
('0001_01_01_000002_create_jobs_table', 1),
('2026_10_19_000001_create_hatians_table', 1),
('2026_10_20_000001_add_receipt_images_to_hatians_table', 1),
('2026_10_20_000002_add_default_payment_methods_to_users_table', 1);

SET FOREIGN_KEY_CHECKS = 1;

