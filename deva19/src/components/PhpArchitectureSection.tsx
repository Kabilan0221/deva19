import React, { useState } from 'react';
import {
  Database,
  Server,
  FileCode,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Terminal,
  Key,
  Copy,
  ExternalLink,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { StoreSettings } from '../types';

interface PhpArchitectureSectionProps {
  settings?: StoreSettings | null;
  currentUser?: any;
}

export const PhpArchitectureSection: React.FC<PhpArchitectureSectionProps> = ({
  settings,
  currentUser,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // Download SQL Dump Handler
  const handleDownloadSQL = () => {
    setDownloading('sql');
    const sqlContent = `-- ==========================================================
-- DEVARAJ TRADERS (தேவராஜ் பட்டாசு கடை), KANCHIPURAM
-- MySQL 8.0+ Complete Relational Database Schema Dump
-- ==========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS \`devaraj_crackers\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`devaraj_crackers\`;

CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(100) NOT NULL,
  \`username\` VARCHAR(50) NOT NULL UNIQUE,
  \`email\` VARCHAR(100) NOT NULL UNIQUE,
  \`mobile\` VARCHAR(20) NOT NULL,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`role\` ENUM('OWNER', 'WORKER') NOT NULL DEFAULT 'WORKER',
  \`status\` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  \`last_login\` DATETIME NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`categories\` (
  \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(100) NOT NULL,
  \`slug\` VARCHAR(100) NOT NULL UNIQUE,
  \`display_order\` INT NOT NULL DEFAULT 1,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`products\` (
  \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`code\` VARCHAR(50) NOT NULL UNIQUE,
  \`barcode\` VARCHAR(50) NOT NULL UNIQUE,
  \`name\` VARCHAR(255) NOT NULL,
  \`category_id\` INT UNSIGNED NOT NULL,
  \`mrp\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  \`discount_percentage\` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  \`selling_price\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  \`stock_quantity\` INT NOT NULL DEFAULT 0,
  \`min_stock_alert\` INT NOT NULL DEFAULT 20,
  \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS \`invoices\` (
  \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  \`invoice_number\` VARCHAR(50) NOT NULL UNIQUE,
  \`customer_name\` VARCHAR(100) NOT NULL,
  \`customer_mobile\` VARCHAR(20) NOT NULL,
  \`subtotal\` DECIMAL(12, 2) NOT NULL,
  \`discount\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  \`grand_total\` DECIMAL(12, 2) NOT NULL,
  \`payment_mode\` ENUM('CASH', 'UPI', 'CARD', 'ONLINE') NOT NULL DEFAULT 'CASH',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initial Seed Data
INSERT INTO \`categories\` VALUES
(1, 'One Sound Crackers', 'one-sound', 1, 1),
(2, 'Sparklers', 'sparklers', 2, 1),
(3, 'Flower Pots', 'flower-pots', 3, 1),
(4, 'Ground Chakkars', 'ground-chakkars', 4, 1),
(5, 'Rockets & Missiles', 'rockets', 5, 1),
(6, 'Aerial Sky Shots', 'sky-shots', 6, 1),
(7, 'Garland Crackers', 'garlands', 7, 1),
(8, 'Festival Gift Boxes', 'gift-boxes', 8, 1);

INSERT INTO \`users\` (\`id\`, \`name\`, \`username\`, \`email\`, \`mobile\`, \`password_hash\`, \`role\`) VALUES
(1, 'R.S. Gopinath (Owner)', 'admin', 'admin@devarajtraders.com', '8870929100', '$2y$10\$e84WvH2mC.TzL8XF3q6Y7OWZ9uV7XQe2g9T5h8X1r5v4w6z8Y7oK.', 'OWNER'),
(2, 'Kabilan (Staff 1)', 'worker1', 'worker1@devarajtraders.com', '9444415380', '$2y$10\$e84WvH2mC.TzL8XF3q6Y7OWZ9uV7XQe2g9T5h8X1r5v4w6z8Y7oK.', 'WORKER');

SET FOREIGN_KEY_CHECKS = 1;
`;

    const blob = new Blob([sqlContent], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devaraj_crackers_mysql8_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloading(null), 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-red-950 p-6 rounded-3xl text-white shadow-lg border border-red-900/50">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-600/30 text-amber-300 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 border border-red-500/30">
            <Server className="w-3.5 h-3.5" />
            <span>Architecture & Stack Specification</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-['Outfit',sans-serif]">
            PHP 8.3+ / MySQL 8 / PDO / XAMPP Engine
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Full enterprise specifications: Prepared Statements, CSRF tokens, Dompdf thermal & A4 billing, PhpSpreadsheet export, QuaggaJS barcode scanner, and WhatsApp Cloud API integration.
          </p>
        </div>

        <button
          onClick={handleDownloadSQL}
          disabled={downloading === 'sql'}
          className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-5 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{downloading === 'sql' ? 'Generating...' : 'Download MySQL 8 .SQL Dump'}</span>
        </button>
      </div>

      {/* 4 Key Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-gray-900 mb-1">MySQL 8 & PDO</h3>
          <p className="text-xs text-gray-500 mb-3">
            InnoDB transactions with <code>SELECT ... FOR UPDATE</code> pessimistic stock locking and prepared statements.
          </p>
          <span className="inline-block bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
            UTF8MB4 Strict
          </span>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
            <FileCode className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-gray-900 mb-1">Dompdf & Spreadsheets</h3>
          <p className="text-xs text-gray-500 mb-3">
            80mm/58mm thermal receipts + GST A4 Tax Invoices and PhpSpreadsheet CSV/Excel reports.
          </p>
          <span className="inline-block bg-purple-50 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
            Dompdf 3.0+
          </span>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-gray-900 mb-1">Security & Sessions</h3>
          <p className="text-xs text-gray-500 mb-3">
            CSRF tokens, <code>password_hash(PASSWORD_BCRYPT)</code>, and OTP verification flow.
          </p>
          <span className="inline-block bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
            CSRF Protected
          </span>
        </div>

        {/* Pillar 4 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-gray-900 mb-1">WhatsApp Cloud API</h3>
          <p className="text-xs text-gray-500 mb-3">
            Instant PDF bill and order notification alerts dispatched to store owner and customer mobiles.
          </p>
          <span className="inline-block bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
            Meta Graph API v19
          </span>
        </div>
      </div>

      {/* Code & Configuration Preview Accordion */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-red-600" />
            <span className="font-extrabold text-xs text-gray-900 uppercase tracking-wider">
              XAMPP / Apache PHP 8.3 Connection Snippet (PDO)
            </span>
          </div>
          <button
            onClick={() =>
              handleCopy(
                `$pdo = new PDO("mysql:host=127.0.0.1;dbname=devaraj_crackers;charset=utf8mb4", "root", "", [\n  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,\n  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,\n  PDO::ATTR_EMULATE_PREPARES => false,\n]);`,
                'pdo_code'
              )
            }
            className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 font-semibold cursor-pointer"
          >
            {copiedSection === 'pdo_code' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedSection === 'pdo_code' ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        <div className="p-4 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed">
          <pre>{`<?php
declare(strict_types=1);

// Database Connection: /php_backend/config/db.php
$dsn = "mysql:host=127.0.0.1;dbname=devaraj_crackers;charset=utf8mb4;port=3306";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false, // Native MySQL 8 Prepared Statements
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci, time_zone = '+05:30'"
];

$pdo = new PDO($dsn, "root", "", $options);

// Atomic POS Billing with Pessimistic Stock Lock
$pdo->beginTransaction();
$stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id FOR UPDATE");
$stmt->execute(['id' => $productId]);
$product = $stmt->fetch();

if ($product['stock_quantity'] >= $qty) {
    // Deduct stock & create invoice
    $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - :qty WHERE id = :id")->execute(['qty' => $qty, 'id' => $productId]);
    $pdo->commit();
}`}</pre>
        </div>
      </div>
    </div>
  );
};
