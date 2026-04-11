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
                    run_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                """
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
                    labour_force_status INT DEFAULT 0 COMMENT 'Labour Force Status'
                )
                """
            )
            self.conn.commit()
        except mariadb.Error as e:
            print(f"Error creating labour_market_data table: {e}")
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
        insert_housing_data: Insert a new housing data if it doesn't exist.
        """
        cursor = self.conn.cursor()
        try:

            # Convert empty strings to integers for numeric fields
            month = self.safe_convert(housing_data.month)
            total_starts = self.safe_convert(housing_data.total_starts)
            total_complete = self.safe_convert(housing_data.total_complete)
            singles_starts = self.safe_convert(housing_data.singles_starts)
            semis_starts = self.safe_convert(housing_data.semis_starts)
            row_starts = self.safe_convert(housing_data.row_starts)
            apartment_starts = self.safe_convert(housing_data.apartment_starts)
            singles_complete = self.safe_convert(housing_data.singles_complete)
            semis_complete = self.safe_convert(housing_data.semis_complete)
            row_complete = self.safe_convert(housing_data.row_complete)
            apartment_complete = self.safe_convert(housing_data.apartment_complete)

            # First execute the query to check if housing data exists with all fields
            cursor.execute(
                """SELECT id FROM housing_data 
                WHERE jsonid = ?
                AND census_metropolitan_area = ? 
                AND month = ? 
                AND total_starts = ? 
                AND total_complete = ? 
                AND singles_starts = ? 
                AND semis_starts = ? 
                AND row_starts = ? 
                AND apartment_starts = ? 
                AND singles_complete = ? 
                AND semis_complete = ? 
                AND row_complete = ? 
                AND apartment_complete = ?""",
                (
                    housing_data.jsonid,
                    housing_data.census_metropolitan_area,
                    month,
                    total_starts,
                    total_complete,
                    singles_starts,
                    semis_starts,
                    row_starts,
                    apartment_starts,
                    singles_complete,
                    semis_complete,
                    row_complete,
                    apartment_complete
                )
            )

            # Now we can safely call fetchone() after executing a query
            result = cursor.fetchone()

            if result is None:
                # Insert new record if no exact match exists
                cursor.execute(
                    """INSERT INTO housing_data 
                    (jsonid, census_metropolitan_area, month, total_starts, total_complete, 
                    singles_starts, semis_starts, row_starts, apartment_starts,
                    singles_complete, semis_complete, row_complete, apartment_complete)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        housing_data.jsonid,
                        housing_data.census_metropolitan_area,
                        month,
                        total_starts,
                        total_complete,
                        singles_starts,
                        semis_starts,
                        row_starts,
                        apartment_starts,
                        singles_complete,
                        semis_complete,
                        row_complete,
                        apartment_complete
                    )
                )
                # Print detailed information including original values for debugging
                print(f"Inserted jsonid: {housing_data.jsonid}, housing data: ")
                self.conn.commit()
        except mariadb.Error as e:
            print(f"Error inserting housing data: {e}")
        finally:
            cursor.close()

    def insert_labour_market_data(self, labour_market_data):
        """
        insert_labour_market_data: Insert new labour market data if it doesn't exist.
        """
        cursor = self.conn.cursor()
        try:
            # Convert empty strings to integers for numeric fields
            jsonid = self.safe_convert(labour_market_data.jsonid)
            province = self.safe_convert(labour_market_data.province)
            education_level = self.safe_convert(labour_market_data.education_level)
            labour_force_status = self.safe_convert(labour_market_data.labour_force_status)
    
            # First check if this exact record already exists
            cursor.execute(
                """SELECT id FROM labour_market_data 
                WHERE jsonid = ?
                AND province = ? 
                AND education_level = ? 
                AND labour_force_status = ?""",
                (
                    jsonid,
                    province,
                    education_level,
                    labour_force_status
                )
            )
    
            result = cursor.fetchone()
    
            if result is None:
                # Insert new record if no exact match exists
                cursor.execute(
                    """INSERT INTO labour_market_data 
                    (jsonid, province, education_level, labour_force_status)
                    VALUES (?, ?, ?, ?)""",
                    (
                        jsonid,
                        province,
                        education_level,
                        labour_force_status
                    )
                )
                # print(f"Inserted labour market data for jsonid: {jsonid}")
                self.conn.commit()
        except mariadb.Error as e:
            print(f"Error inserting labour market data: {e}")
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
