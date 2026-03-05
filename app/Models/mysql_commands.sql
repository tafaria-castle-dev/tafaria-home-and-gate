CREATE TABLE guards (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    badge_number VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

CREATE TABLE check_points (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    point_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

CREATE TABLE guests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guest_name VARCHAR(255) NOT NULL,
    section VARCHAR(255) NOT NULL,
    entry_time TIMESTAMP NULL,
    exit_time TIMESTAMP NULL,
    check_in TIMESTAMP NULL,
    check_out TIMESTAMP NULL,
    contact_id VARCHAR(255)  utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    contact_person_id VARCHAR(255) utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    phone_number VARCHAR(255) NULL,
    kids_count INT UNSIGNED NOT NULL DEFAULT 0,
    adults_count INT UNSIGNED NOT NULL DEFAULT 1,
    dream_pass_code VARCHAR(255) NULL,
    is_express_check_in TINYINT(1) NOT NULL DEFAULT 0,
    is_express_check_out TINYINT(1) NOT NULL DEFAULT 0,
    type ENUM('walk_in', 'drive_in') NOT NULL DEFAULT 'walk_in',
    checked_in_by_user_id VARCHAR(255) utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    checked_in_by_guard_id BIGINT UNSIGNED NULL,
    cleared_bills JSON NULL,
    cleared_bills_by_user_id VARCHAR(255) utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    cleared_by_house_keeping JSON NULL,
    cleared_by_house_keeping_user_id VARCHAR(255) utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_person_id) REFERENCES contact_persons(id) ON DELETE SET NULL,
    FOREIGN KEY (checked_in_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (checked_in_by_guard_id) REFERENCES guards(id) ON DELETE SET NULL,
    FOREIGN KEY (cleared_bills_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (cleared_by_house_keeping_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE patrols (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guard_id BIGINT UNSIGNED NOT NULL,
    status ENUM('ongoing', 'completed', 'missed') NOT NULL DEFAULT 'ongoing',
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (guard_id) REFERENCES guards(id) ON DELETE CASCADE
);

CREATE TABLE patrol_checkpoints (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    patrol_id BIGINT UNSIGNED NOT NULL,
    check_point_id BIGINT UNSIGNED NOT NULL,
    scanned_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (patrol_id) REFERENCES patrols(id) ON DELETE CASCADE,
    FOREIGN KEY (check_point_id) REFERENCES check_points(id) ON DELETE CASCADE
);