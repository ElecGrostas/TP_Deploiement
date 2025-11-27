CREATE DATABASE IF NOT EXISTS supervision
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_general_ci;

USE supervision;

DROP TABLE IF EXISTS history;
DROP TABLE IF EXISTS variables;
DROP TABLE IF EXISTS automates;

CREATE TABLE automates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_automate_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE variables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    automate_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    register_address INT NOT NULL,
    register_type ENUM('holding','input','coil','discrete') NOT NULL DEFAULT 'holding',
    frequency_sec INT NOT NULL DEFAULT 5,
    unit VARCHAR(20),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automate_id) REFERENCES automates(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    variable_id INT NOT NULL,
    value DOUBLE NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (variable_id) REFERENCES variables(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX idx_history_variable_time (variable_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO automates (name, ip_address) VALUES
  ('Automate Ligne 1', '192.168.0.10'),
  ('Automate Ligne 2', '192.168.0.11');

INSERT INTO variables (automate_id, name, register_address, register_type, frequency_sec, unit) VALUES
  (1, 'Température Cuve',  1, 'holding', 2, '°C'),
  (1, 'Pression Réseau',   2, 'holding', 5, 'bar'),
  (2, 'Vitesse Moteur',   10, 'input',   1, 'rpm');
