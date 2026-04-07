CREATE TABLE dream_passes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(50) NOT NULL,
    guest_name VARCHAR(50) NOT NULL,
    created_by_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    check_in_date DATE NULL,
    check_out_date DATE NULL,
    status ENUM('draft','pending','approved','rejected') DEFAULT 'draft',
    approved_by_admin_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    approved_at DATETIME NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;



CREATE TABLE dream_pass_activities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dream_pass_id BIGINT UNSIGNED NOT NULL,
    activity_name ENUM(
        'Museum',
        'Carriage Riding',
        'Horseback Riding',
        'Mini Golf',
        'Archery',
        'Pool Table',
        'Art Sessions'
    ) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dream_pass_id) REFERENCES dream_passes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_activity_per_pass (dream_pass_id, activity_name)
);

CREATE TABLE dream_pass_activity_redemptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dream_pass_activity_id BIGINT UNSIGNED NOT NULL,
    redeemed_at DATE NOT NULL,
    redeemed_by_staff_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    staff_passcode VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dream_pass_activity_id) REFERENCES dream_pass_activities(id) ON DELETE CASCADE,
    FOREIGN KEY (redeemed_by_staff_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_redemption_per_day (dream_pass_activity_id, redeemed_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE dream_pass_souvenir_discounts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    dream_pass_id BIGINT UNSIGNED NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    applicable_items JSON NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (dream_pass_id) REFERENCES dream_passes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_discount_per_pass (dream_pass_id)
);         CREATE TABLE `otps` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `email` varchar(255) NOT NULL,
  `otp` varchar(6) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `type` enum('registration','forgotPassword') NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;