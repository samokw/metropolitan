import os
import sys
import unittest
from unittest.mock import MagicMock, patch, call
import pytest

# Add the src directory to the path so we can import DatabaseHandler
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))
from DatabaseHandler import DatabaseHandler

class TestDatabaseHandler(unittest.TestCase):
    
    def setUp(self):
        # Create mock objects
        self.mock_conn = MagicMock()
        self.mock_cursor = MagicMock()
        self.mock_conn.cursor.return_value = self.mock_cursor
        
    @patch('mariadb.connect')
    def test_connect_success(self, mock_connect):
        """Test successful connection to the database"""
        mock_connect.return_value = self.mock_conn
        
        # Create handler with connect=False to avoid connection in constructor
        db_handler = DatabaseHandler(connect=False)
        
        # Manually call connect - this is what we're testing
        db_handler.connect()
        
        # Now we should have exactly one call to connect
        mock_connect.assert_called_once()
        self.assertEqual(db_handler.conn, self.mock_conn)
    
    
    @patch('mariadb.connect')
    def test_create_table(self, mock_connect):
        """Test create_table calls both table creation methods"""
        mock_connect.return_value = self.mock_conn
        
        db_handler = DatabaseHandler(connect=False)
        db_handler.conn = self.mock_conn
        db_handler.create_housing_data_table = MagicMock()
        db_handler.create_labour_market_data_table = MagicMock()
        db_handler.create_lfs_ontario_annual_table = MagicMock()

        db_handler.create_table()

        db_handler.create_housing_data_table.assert_called_once()
        db_handler.create_labour_market_data_table.assert_called_once()
        db_handler.create_lfs_ontario_annual_table.assert_called_once()
    
    def test_create_housing_data_table(self):
        """Test creating the housing data table"""
        db_handler = DatabaseHandler(connect=False)
        db_handler.conn = self.mock_conn
        
        db_handler.create_housing_data_table()
        
        self.mock_cursor.execute.assert_called_once()
        self.mock_conn.commit.assert_called_once()
        self.mock_cursor.close.assert_called_once()
    
    def test_create_labour_market_data_table(self):
        """Test creating the labour market data table"""
        db_handler = DatabaseHandler(connect=False)
        db_handler.conn = self.mock_conn
        
        db_handler.create_labour_market_data_table()
        
        self.assertGreaterEqual(self.mock_cursor.execute.call_count, 1)
        self.assertGreaterEqual(self.mock_conn.commit.call_count, 1)
        self.mock_cursor.close.assert_called_once()
    
    def test_safe_convert(self):
        """Test safe_convert with different input values"""
        db_handler = DatabaseHandler(connect=False)
        
        # Test with empty string
        self.assertEqual(db_handler.safe_convert(""), 0)
        
        # Test with None
        self.assertEqual(db_handler.safe_convert(None), 0)
        
        # Test with integer
        self.assertEqual(db_handler.safe_convert(42), 42)
        
        # Test with string representation of integer
        self.assertEqual(db_handler.safe_convert("42"), 42)
        
        # Test with comma in number
        self.assertEqual(db_handler.safe_convert("1,234"), 1234)
    
    def test_insert_housing_data_new_record(self):
        """Test inserting new housing data"""
        db_handler = DatabaseHandler(connect=False)
        db_handler.conn = self.mock_conn
        
        # Mock fetchone to return None (record doesn't exist)
        self.mock_cursor.fetchone.return_value = None
        
        # Create mock housing data object
        housing_data = MagicMock()
        housing_data.jsonid = 1
        housing_data.census_metropolitan_area = "Test City"
        housing_data.month = 1
        housing_data.year = 2024
        housing_data.total_starts = "1,000"
        housing_data.total_complete = 500
        housing_data.singles_starts = 100
        housing_data.semis_starts = 200
        housing_data.row_starts = 300
        housing_data.apartment_starts = 400
        housing_data.singles_complete = 50
        housing_data.semis_complete = 100
        housing_data.row_complete = 150
        housing_data.apartment_complete = 200
        
        db_handler.insert_housing_data(housing_data)
        
        self.assertEqual(self.mock_cursor.execute.call_count, 1)
        self.mock_cursor.close.assert_called_once()
    
    def test_insert_housing_data_existing_record(self):
        """Test inserting housing data for an existing record"""
        # Create a mock without relying on HousingData class
        mock_housing_data = MagicMock()
        mock_housing_data.jsonid = "123"
        mock_housing_data.census_metropolitan_area = "Toronto"
        mock_housing_data.month = 6
        mock_housing_data.year = 2024
        mock_housing_data.total_starts = 100
        mock_housing_data.total_complete = 80
        mock_housing_data.singles_starts = 30
        mock_housing_data.semis_starts = 20
        mock_housing_data.row_starts = 20
        mock_housing_data.apartment_starts = 30
        mock_housing_data.singles_complete = 25
        mock_housing_data.semis_complete = 15
        mock_housing_data.row_complete = 15
        mock_housing_data.apartment_complete = 25
        mock_housing_data.year = 2024
        
        db_handler = DatabaseHandler(connect=False)
        db_handler.conn = self.mock_conn
        
        # Mock fetchone to return a record (record exists)
        self.mock_cursor.fetchone.return_value = (1,)
        
        db_handler.insert_housing_data(mock_housing_data)
        
        self.assertEqual(self.mock_cursor.execute.call_count, 1)
        self.mock_cursor.close.assert_called_once()
    
    def test_insert_labour_market_data_new_record(self):
        """Test inserting new labour market data"""
        db_handler = DatabaseHandler(connect=False)
        db_handler.conn = self.mock_conn
        
        # Mock fetchone to return None (record doesn't exist)
        self.mock_cursor.fetchone.return_value = None
        
        # Create mock labour market data object
        labour_data = MagicMock()
        labour_data.jsonid = 1
        labour_data.province = 2
        labour_data.education_level = 3
        labour_data.labour_force_status = 4
        labour_data.survey_year = 0
        labour_data.survey_month = 0
        
        db_handler.insert_labour_market_data(labour_data)
        
        self.assertEqual(self.mock_cursor.execute.call_count, 1)
        self.mock_cursor.close.assert_called_once()
    
    def test_insert_labour_market_data_existing_record(self):
        """Test inserting labour market data for an existing record"""
        # Create a mock without relying on LabourMarketData class
        mock_labour_data = MagicMock()
        mock_labour_data.jsonid = "456"
        mock_labour_data.province = 1
        mock_labour_data.education_level = 3
        mock_labour_data.labour_force_status = 4
        mock_labour_data.survey_year = 0
        mock_labour_data.survey_month = 0
        
        db_handler = DatabaseHandler(connect=False)
        db_handler.conn = self.mock_conn
        
        # Mock fetchone to return a record (record exists)
        self.mock_cursor.fetchone.return_value = (1,)
        
        db_handler.insert_labour_market_data(mock_labour_data)
        
        # Should call execute once to check if record exists
        self.assertEqual(self.mock_cursor.execute.call_count, 1)
        # Should not call commit since no insertion
        self.mock_conn.commit.assert_not_called()
        self.mock_cursor.close.assert_called_once()
    
    def test_close(self):
        """Test closing the database connection"""
        db_handler = DatabaseHandler(connect=False)
        db_handler.conn = self.mock_conn
        
        db_handler.close()
        
        self.mock_conn.close.assert_called_once()
    
    def test_destructor(self):
        """Test the destructor properly calls close"""
        db_handler = DatabaseHandler(connect=False)
        db_handler.conn = self.mock_conn
        db_handler.close = MagicMock()
        
        # Trigger destructor
        db_handler.__del__()
        
        db_handler.close.assert_called_once()

if __name__ == "__main__":
    unittest.main()
