-- Switch to the desired database
USE template_db;

-- Drop the existing table
--DROP TABLE note;

-- Create the new table
-- Create the table (if not exists)
CREATE TABLE IF NOT EXISTS housing_data (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary Key',
    jsonid INT DEFAULT 0 COMMENT 'JSON ID',
    census_metropolitan_area VARCHAR(255) COMMENT 'Census Metropolitan Area',
    month INT DEFAULT NULL COMMENT 'Month',
    year INT DEFAULT NULL COMMENT 'Year',
    total_starts INT DEFAULT 0 COMMENT 'Total Starts',
    total_complete INT DEFAULT 0 COMMENT 'Total Complete',
    singles_starts INT DEFAULT 0 COMMENT 'Singles Starts',
    semis_starts INT DEFAULT 0 COMMENT 'Semis Starts',
    row_starts INT DEFAULT 0 COMMENT 'Row Starts',
    apartment_starts INT DEFAULT 0 COMMENT 'Apartment Starts',
    singles_complete INT DEFAULT 0 COMMENT 'Singles Complete',
    semis_complete INT DEFAULT 0 COMMENT 'Semis Complete',
    row_complete INT DEFAULT 0 COMMENT 'Row Complete',
    apartment_complete INT DEFAULT 0 COMMENT 'Apartment Complete'
);

CREATE TABLE IF NOT EXISTS labour_market_data (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary Key',
    jsonid INT DEFAULT 0 COMMENT 'JSON ID',
    province INT DEFAULT 0 COMMENT 'Province',
    education_level INT DEFAULT 0 COMMENT 'Education Level',
    labour_force_status INT DEFAULT 0 COMMENT 'Labour Force Status',
    survey_year INT DEFAULT 0 COMMENT 'LFS PUMF SURVYEAR (reference year)',
    survey_month INT DEFAULT 0 COMMENT 'LFS PUMF SURVMNTH (reference month)'
);

-- Annual Ontario LFS rates from StatCan summary table (14-10-0393-01, product 14100393) for time-series charts
CREATE TABLE IF NOT EXISTS lfs_ontario_annual (
    `year` INT PRIMARY KEY COMMENT 'Calendar year',
    employment_rate DECIMAL(5,2) DEFAULT NULL COMMENT 'Employment rate %',
    unemployment_rate DECIMAL(5,2) DEFAULT NULL COMMENT 'Unemployment rate %',
    participation_rate DECIMAL(5,2) DEFAULT NULL COMMENT 'Participation rate %'
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(50) NOT NULL COMMENT 'Pipeline source (housing, labour)',
    records_extracted INT DEFAULT 0,
    records_transformed INT DEFAULT 0,
    records_loaded INT DEFAULT 0,
    records_rejected INT DEFAULT 0,
    bytes_downloaded INT DEFAULT 0,
    estimated_bytes_loaded INT DEFAULT 0,
    success_rate_pct DECIMAL(5,2) DEFAULT 0,
    duration_seconds DECIMAL(8,2) DEFAULT 0,
    error_count INT DEFAULT 0,
    strategy VARCHAR(20) DEFAULT 'bulk' COMMENT 'Load strategy used (bulk, per_row)',
    run_at DATETIME DEFAULT CURRENT_TIMESTAMP
);