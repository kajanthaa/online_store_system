-- ========================================================
-- Online Grocery Store Database Schema (Practical 01 & 02)
-- ========================================================

CREATE DATABASE IF NOT EXISTS `grocery` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `grocery`;

-- 1. Admin Users (Practical 02 - Authentication & Security)
-- Password for 'admin' is 'admin123' (hashed using bcrypt)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Categories Table (Practical 01 - Core System)
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Products Table (Practical 01 CRUD + Practical 02 Stock Management)
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `category_id` INT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT 'kg',
  `image_url` VARCHAR(255) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Customers Table (Practical 01 & 02)
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `phone` VARCHAR(20) DEFAULT '',
  `address` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Orders Table (Practical 01 & 02)
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `total` DECIMAL(10, 2) NOT NULL,
  `status` ENUM('Pending', 'Paid', 'Completed', 'Cancelled') DEFAULT 'Pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Order Items Table
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `qty` INT NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Payments Table (Practical 02 - Mock Payment Workflow)
CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `method` VARCHAR(50) DEFAULT 'Card',
  `reference` VARCHAR(60) NOT NULL,
  `status` ENUM('Success', 'Failed') NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ========================================================
-- Seed Data
-- ========================================================

-- Insert admin (admin / admin123)
INSERT INTO `users` (`id`, `username`, `password_hash`, `role`)
VALUES (1, 'admin', '$2a$10$wN9Q7iP0sFv6VfFp.Ea6oO9p2z/gM2a9B1kF8p4zC6nB7qW8rK0uC', 'admin')
ON DUPLICATE KEY UPDATE `username` = 'admin';

-- Insert Default Categories
INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Fresh Fruits', 'Fresh organic fruits straight from orchards'),
(2, 'Fresh Vegetables', 'Farm fresh vegetables and leafy greens'),
(3, 'Dairy & Eggs', 'Milk, butter, cheese, and farm fresh eggs'),
(4, 'Bakery & Bread', 'Freshly baked artisanal breads and snacks'),
(5, 'Beverages', 'Natural juices, tea, coffee, and soft drinks'),
(6, 'Grains & Pulses', 'Rice, wheat, lentils, and pantry staples')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Insert Sample Products
INSERT INTO `products` (`id`, `name`, `category_id`, `price`, `stock`, `unit`) VALUES
(1, 'Crisp Royal Gala Apples', 1, 3.50, 45, '1 kg'),
(2, 'Organic Cavendish Bananas', 1, 1.80, 60, '1 dozen'),
(3, 'Fresh Farm Carrots', 2, 2.20, 8, '1 kg'),
(4, 'Tender Baby Spinach', 2, 1.50, 5, '250 g'),
(5, 'Full Cream Fresh Milk', 3, 1.95, 30, '1 Litre'),
(6, 'Organic Farm Eggs', 3, 3.40, 25, 'Pack of 12'),
(7, 'Whole Grain Brown Bread', 4, 2.25, 15, '400 g loaf'),
(8, 'Artisan Butter Croissants', 4, 4.50, 4, 'Pack of 4'),
(9, 'Cold Pressed Orange Juice', 5, 3.20, 20, '500 ml'),
(10, 'Premium Basmati Rice', 6, 8.50, 50, '5 kg')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Insert Sample Customer
INSERT INTO `customers` (`id`, `name`, `email`, `phone`, `address`) VALUES
(1, 'Kajan Kumar', 'kajan@example.com', '+94 77 123 4567', '42 Main Street, Colombo'),
(2, 'Priya Raman', 'priya@example.com', '+94 71 987 6543', '15 Temple Road, Jaffna')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
