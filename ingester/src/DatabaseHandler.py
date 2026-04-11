"""
DatabaseHandler.py: OO object to handle putting data into the database.
"""
import os
import sys
import time
import mariadb
class DatabaseHandler:
    """
    DatabaseHandler class: Handles connection & data transfer to the database.
    """
    def __init__(self, connect, max_retries=5, retry_delay=5):
        """
        __init__: Initializes the object & tries to connect.
        """
        self.conn = None
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        if connect:
            self.connect()

    def connect(self):
        """
        connect: Attempts to establish a connection to the database `max_retries` times.
        """
        for attempt in range(self.max_retries):
            try:
                self.conn = mariadb.connect(
                    user=os.getenv("DB_USER", "root"),
                    password=os.getenv("DB_PASSWORD", "pwd"),
                    host=os.getenv("DB_HOST", "database"),
                    port=3306,
                    database=os.getenv("DB_DATABASE", "template_db"),
                )
                print("Successfully connected to MariaDB database")
                self.create_table()
                return
            except mariadb.Error as e:
                print(f"Connection attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
        sys.exit("FATAL: Failed to connect to database after multiple attempts")


    def create_table(self):
        """
        create_table: Creates the database tables if they don't exist.
        """
        self.create_housing_data_table()
        self.create_labour_market_data_table()
        self.create_lfs_ontario_annual_table()
        self.create_pipeline_runs_table()

    def create_pipeline_runs_table(self):
        """
        create_pipeline_runs_table: Creates the pipeline_runs table if it doesn't exist.
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS pipeline_runs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    source VARCHAR(50) NOT NULL COMMENT 'Pipeline source',
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
                )
                """
            )
            self.conn.commit()

            cursor.execute(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pipeline_runs' "
                "AND COLUMN_NAME = 'strategy'"
            )
            if cursor.fetchone()[0] == 0:
                cursor.execute(
                    "ALTER TABLE pipeline_runs ADD COLUMN "
                    "strategy VARCHAR(20) DEFAULT 'bulk' COMMENT 'Load strategy used (bulk, per_row)' "
                    "AFTER error_count"
                )
                self.conn.commit()
        except mariadb.Error as e:
            print(f"Error creating pipeline_runs table: {e}")
        finally:
            cursor.close()

    def create_housing_data_table(self):
        """
        create_housing_data_table: Creates the housing_data table if it doesn't exist.
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """
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
                )
                """
            )
            self.conn.commit()
        except mariadb.Error as e:
            print(f"Error creating housing_data table: {e}")
        finally:
            cursor.close()

    def create_labour_market_data_table(self):
        """
        create_labour_market_data_table: Creates the labour_market_data table if it doesn't exist.
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS labour_market_data (
                    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Primary Key',
                    jsonid INT DEFAULT 0 COMMENT 'JSON ID',
                    province INT DEFAULT 0 COMMENT 'Province',
                    education_level INT DEFAULT 0 COMMENT 'Education Level',
                    labour_force_status INT DEFAULT 0 COMMENT 'Labour Force Status',
                    survey_year INT DEFAULT 0 COMMENT 'LFS PUMF SURVYEAR',
                    survey_month INT DEFAULT 0 COMMENT 'LFS PUMF SURVMNTH'
                )
                """
            )
            self.conn.commit()

            migrations = [
                ("survey_year", "INT DEFAULT 0 COMMENT 'LFS PUMF SURVYEAR'", "labour_force_status"),
                ("survey_month", "INT DEFAULT 0 COMMENT 'LFS PUMF SURVMNTH'", "survey_year"),
            ]
            for col, ddl, after_col in migrations:
                cursor.execute(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS "
                    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'labour_market_data' "
                    "AND COLUMN_NAME = ?",
                    (col,),
                )
                if cursor.fetchone()[0] == 0:
                    cursor.execute(
                        f"ALTER TABLE labour_market_data ADD COLUMN {col} {ddl} "
                        f"AFTER {after_col}"
                    )
                    self.conn.commit()
        except mariadb.Error as e:
            print(f"Error creating labour_market_data table: {e}")
        finally:
            cursor.close()

    def create_lfs_ontario_annual_table(self):
        """Annual Ontario LFS rates from StatCan summary CSV (product 14100393)."""
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS lfs_ontario_annual (
                    `year` INT PRIMARY KEY COMMENT 'Calendar year',
                    employment_rate DECIMAL(5,2) DEFAULT NULL COMMENT 'Employment rate %',
                    unemployment_rate DECIMAL(5,2) DEFAULT NULL COMMENT 'Unemployment rate %',
                    participation_rate DECIMAL(5,2) DEFAULT NULL COMMENT 'Participation rate %'
                )
                """
            )
            self.conn.commit()
        except mariadb.Error as e:
            print(f"Error creating lfs_ontario_annual table: {e}")
        finally:
            cursor.close()

    # Helper function to safely convert values with potential commas
    def safe_convert(self, value):
        if value == "" or value is None:
            return 0
        # Remove commas and convert to integer
        return int(str(value).replace(',', ''))

    def insert_housing_data(self, housing_data):
        """
        insert_housing_data: Insert a single housing record.
        Kept for backwards compatibility — prefer bulk_load_housing_records.
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO housing_data 
                (jsonid, census_metropolitan_area, month, year, total_starts, total_complete, 
                singles_starts, semis_starts, row_starts, apartment_starts,
                singles_complete, semis_complete, row_complete, apartment_complete)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    housing_data.jsonid,
                    housing_data.census_metropolitan_area,
                    self.safe_convert(housing_data.month),
                    self.safe_convert(housing_data.year),
                    self.safe_convert(housing_data.total_starts),
                    self.safe_convert(housing_data.total_complete),
                    self.safe_convert(housing_data.singles_starts),
                    self.safe_convert(housing_data.semis_starts),
                    self.safe_convert(housing_data.row_starts),
                    self.safe_convert(housing_data.apartment_starts),
                    self.safe_convert(housing_data.singles_complete),
                    self.safe_convert(housing_data.semis_complete),
                    self.safe_convert(housing_data.row_complete),
                    self.safe_convert(housing_data.apartment_complete),
                )
            )
        except mariadb.Error as e:
            raise e
        finally:
            cursor.close()

    def bulk_load_housing_records(self, rows):
        """
        Replace all housing data with a fresh snapshot using TRUNCATE + batch INSERT.
        The StatCan download always contains the full historical dataset, so a
        complete reload is idempotent and much faster than per-row dedup.

        Args:
            rows: list of tuples matching the housing_data column order
                  (jsonid, census_metropolitan_area, month, year,
                   total_starts, total_complete,
                   singles_starts, semis_starts, row_starts, apartment_starts,
                   singles_complete, semis_complete, row_complete, apartment_complete)
        Returns:
            int: number of rows inserted
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute("TRUNCATE TABLE housing_data")

            batch_size = 5000
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i + batch_size]
                cursor.executemany(
                    """INSERT INTO housing_data
                    (jsonid, census_metropolitan_area, month, year,
                     total_starts, total_complete,
                     singles_starts, semis_starts, row_starts, apartment_starts,
                     singles_complete, semis_complete, row_complete, apartment_complete)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    batch
                )
            self.conn.commit()
            return len(rows)
        except mariadb.Error as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def insert_labour_market_data(self, labour_market_data):
        """
        insert_labour_market_data: Insert a single labour market record.
        Kept for backwards compatibility — prefer bulk_load_labour_records.
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """INSERT INTO labour_market_data 
                (jsonid, province, education_level, labour_force_status, survey_year, survey_month)
                VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    self.safe_convert(labour_market_data.jsonid),
                    self.safe_convert(labour_market_data.province),
                    self.safe_convert(labour_market_data.education_level),
                    self.safe_convert(labour_market_data.labour_force_status),
                    self.safe_convert(getattr(labour_market_data, "survey_year", 0)),
                    self.safe_convert(getattr(labour_market_data, "survey_month", 0)),
                )
            )
        except mariadb.Error as e:
            raise e
        finally:
            cursor.close()

    def bulk_load_labour_records(self, survey_year, survey_month, rows):
        """
        Replace one PUMF survey month: DELETE that wave, then batch INSERT.
        Other survey months in the table are preserved.

        Args:
            survey_year: LFS reference year (SURVYEAR).
            survey_month: LFS reference month (SURVMNTH).
            rows: list of tuples (jsonid, province, education_level, labour_force_status,
                  survey_year, survey_month)
        Returns:
            int: number of rows inserted
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                "DELETE FROM labour_market_data WHERE survey_year = ? AND survey_month = ?",
                (survey_year, survey_month),
            )

            batch_size = 5000
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i + batch_size]
                cursor.executemany(
                    """INSERT INTO labour_market_data
                    (jsonid, province, education_level, labour_force_status, survey_year, survey_month)
                    VALUES (?, ?, ?, ?, ?, ?)""",
                    batch
                )
            self.conn.commit()
            return len(rows)
        except mariadb.Error as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def bulk_load_lfs_ontario_annual(self, rows):
        """
        Replace Ontario annual LFS rate rows (TRUNCATE + batch INSERT).

        Args:
            rows: list of tuples (year, employment_rate, unemployment_rate, participation_rate)
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute("TRUNCATE TABLE lfs_ontario_annual")
            if not rows:
                self.conn.commit()
                return 0
            batch_size = 5000
            for i in range(0, len(rows), batch_size):
                batch = rows[i : i + batch_size]
                cursor.executemany(
                    """INSERT INTO lfs_ontario_annual
                    (`year`, employment_rate, unemployment_rate, participation_rate)
                    VALUES (?, ?, ?, ?)""",
                    batch,
                )
            self.conn.commit()
            return len(rows)
        except mariadb.Error as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def close(self):
        """
        close: Close database connection.
        """
        if self.conn:
            self.conn.close()
            print("Closed database connection\n")

    def __del__(self):
        """
        __del__: Object destructor.
        """
        try:
            self.close()
        except Exception:
            pass
