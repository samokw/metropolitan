DROP TABLE IF EXISTS housing_data;
CREATE TABLE housing_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    census_metropolitan_area VARCHAR(255),
    `month` INT,
    `year` INT,
    total_starts INT DEFAULT 0,
    total_complete INT DEFAULT 0,
    singles_starts INT DEFAULT 0,
    semis_starts INT DEFAULT 0,
    row_starts INT DEFAULT 0,
    apartment_starts INT DEFAULT 0,
    singles_complete INT DEFAULT 0,
    semis_complete INT DEFAULT 0,
    row_complete INT DEFAULT 0,
    apartment_complete INT DEFAULT 0
);

DROP TABLE IF EXISTS labour_market_data;
CREATE TABLE labour_market_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    province INT DEFAULT 0,
    education_level INT DEFAULT 0,
    labour_force_status INT DEFAULT 0,
    survey_year INT DEFAULT 0,
    survey_month INT DEFAULT 0
);
