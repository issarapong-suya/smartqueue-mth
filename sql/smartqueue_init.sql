-- sql/smartqueue_init.sql
-- สคริปต์สร้างฐานข้อมูลและตารางเริ่มต้นสำหรับ SmartQueue v2 (แยกจาก HOSxP)

CREATE DATABASE IF NOT EXISTS `smartqueue` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smartqueue`;

-- 1. ตารางจุดบริการ (Station)
CREATE TABLE IF NOT EXISTS `sq_stations` (
  `id` VARCHAR(30) NOT NULL COMMENT 'รหัส เช่น sa1, rx1, er1',
  `name` VARCHAR(100) NOT NULL COMMENT 'ชื่อจุดบริการ เช่น จุดซักประวัติ โต๊ะ 1',
  `depcodes` VARCHAR(100) DEFAULT '' COMMENT 'รหัสแผนก HOSxP เช่น 002 หรือ 003,061',
  `layout` VARCHAR(50) DEFAULT 'default' COMMENT 'screening, pharmacy, er, doctor, dental, summary',
  `slots` INT DEFAULT 1 COMMENT 'จำนวนช่องบริการ',
  `time_per_queue` INT DEFAULT 10 COMMENT 'นาทีเฉลี่ยต่อคิว',
  `dep_station` INT DEFAULT 1 COMMENT 'จำนวนจุดบริการที่เปิดพร้อมกัน',
  `work_start` TIME DEFAULT '08:00:00',
  `is_active` TINYINT(1) DEFAULT 1,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ตารางประวัติการเรียกคิว
CREATE TABLE IF NOT EXISTS `sq_call_log` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `station_id` VARCHAR(30) NOT NULL,
  `queue_id` VARCHAR(30) NOT NULL,
  `patient_name` VARCHAR(255) DEFAULT '',
  `called_by` VARCHAR(100) DEFAULT 'system',
  `call_type` ENUM('normal', 'repeat', 'skip') DEFAULT 'normal',
  `called_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_station` (`station_id`),
  INDEX `idx_called_at` (`called_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ตารางผู้ใช้งาน Caller App
CREATE TABLE IF NOT EXISTS `sq_users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(100) DEFAULT '',
  `default_station` VARCHAR(30) DEFAULT '',
  `role` ENUM('caller', 'admin') DEFAULT 'caller',
  `is_active` TINYINT(1) DEFAULT 1,
  `last_login` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ตารางข้อความประชาสัมพันธ์ (Marquee)
CREATE TABLE IF NOT EXISTS `sq_announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `content` TEXT NOT NULL,
  `priority` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ตารางการตั้งค่าทั่วไป
CREATE TABLE IF NOT EXISTS `sq_settings` (
  `key_name` VARCHAR(100) PRIMARY KEY,
  `value` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ข้อมูลเริ่มต้น: Stations ตามระบบเดิมของโรงพยาบาลแม่ทะ
INSERT INTO `sq_stations` (`id`, `name`, `depcodes`, `layout`, `slots`, `time_per_queue`, `dep_station`, `sort_order`) VALUES
('sa',  'จุดซักประวัติ',     '002,022',                         'screening', 6, 5,  6, 1),
('sa1', 'จุดซักประวัติ โต๊ะ 1', '002,022',                         'screening', 1, 5,  6, 1),
('sa2', 'จุดซักประวัติ โต๊ะ 2', '002,022',                         'screening', 1, 5,  6, 2),
('sa3', 'จุดซักประวัติ โต๊ะ 3', '002,022',                         'screening', 1, 5,  6, 3),
('sa4', 'จุดซักประวัติ โต๊ะ 4', '002,022',                         'screening', 1, 5,  6, 4),
('sa5', 'จุดซักประวัติ โต๊ะ 5', '002,022',                         'screening', 1, 5,  6, 5),
('sa6', 'จุดซักประวัติ โต๊ะ 6', '002,022',                         'screening', 1, 5,  6, 6),
('sb',  'ห้องตรวจ',        '014,022,054,055,056,057,058',     'doctor',    6, 8,  6, 10),
('sb1', 'ห้องตรวจ 1',       '014,022,054,055,056,057,058',     'doctor',    1, 8,  6, 11),
('sb2', 'ห้องตรวจ 2',       '014,022,054,055,056,057,058',     'doctor',    1, 8,  6, 12),
('sb3', 'ห้องตรวจ 3',       '014,022,054,055,056,057,058',     'doctor',    1, 8,  6, 13),
('sb4', 'ห้องตรวจ 4',       '014,022,054,055,056,057,058',     'doctor',    1, 8,  6, 14),
('sb5', 'ห้องตรวจ 5',       '014,022,054,055,056,057,058',     'doctor',    1, 8,  6, 15),
('sb6', 'ห้องตรวจ 6',       '014,022,054,055,056,057,058',     'doctor',    1, 8,  6, 16),
('rx',  'ห้องยาและการเงิน',   '059,027',                         'pharmacy',  6, 3,  5, 20),
('rx1', 'ห้องยา ช่อง 1',    '059,027',                         'pharmacy',  1, 3,  5, 21),
('rx2', 'ห้องยา ช่อง 2',    '059,027',                         'pharmacy',  1, 3,  5, 22),
('rx3', 'ห้องยา ช่อง 3',    '059,027',                         'pharmacy',  1, 3,  5, 23),
('rx4', 'ห้องยา ช่อง 4',    '059,027',                         'pharmacy',  1, 3,  5, 24),
('rx5', 'ห้องยา ช่อง 5',    '059,027',                         'pharmacy',  1, 3,  5, 25),
('f',   'ช่องชำระเงิน',      '027',                             'pharmacy',  1, 3,  1, 26),
('er',  'ห้องฉุกเฉิน',       '003',                             'er',        4, 10, 1, 30),
('er1', 'ห้องฉุกเฉิน จอ 1',   '003,061',                         'er',        1, 10, 1, 31),
('t',   'ห้องฉีดยา ทำแผล',   '061',                             'treatment', 1, 10, 1, 35),
('d',   'ทันตกรรม',         '008,053',                         'dental',    4, 20, 4, 40),
('l',   'ห้องปฏิบัติการ (LAB)','010',                             'default',   1, 5,  1, 50),
('x',   'เอกซเรย์ (X-Ray)',  '011',                             'default',   1, 10, 1, 60)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `layout`=VALUES(`layout`), `depcodes`=VALUES(`depcodes`);

-- ผู้ใช้เริ่มต้นสำหรับการทดสอบ
INSERT INTO `sq_users` (`username`, `password_hash`, `display_name`, `default_station`, `role`) VALUES
('admin', 'admin1234', 'ผู้ดูแลระบบ', 'sa1', 'admin'),
('user1', '1234', 'เจ้าหน้าที่ 1', 'sa1', 'caller')
ON DUPLICATE KEY UPDATE `display_name`=VALUES(`display_name`);

-- ข้อความเริ่มต้น
INSERT INTO `sq_announcements` (`content`, `priority`) VALUES
('ยินดีต้อนรับสู่ โรงพยาบาลแม่ทะ จังหวัดลำปาง กรุณาฟังเสียงเรียกและตรวจดูหมายเลขคิวของท่าน', 10)
ON DUPLICATE KEY UPDATE `content`=VALUES(`content`);

-- ตั้งค่าเริ่มต้น
INSERT INTO `sq_settings` (`key_name`, `value`) VALUES
('hospital_name', 'โรงพยาบาลแม่ทะ จังหวัดลำปาง'),
('tts_speed', '0.9')
ON DUPLICATE KEY UPDATE `value`=VALUES(`value`);
