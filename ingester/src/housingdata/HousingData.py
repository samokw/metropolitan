"""
HousingData.py: Data model for housing starts and completions.
"""

class HousingData:
    """
    HousingData class: Represents housing starts and completions data for a metropolitan area.
    Contains data for total, singles, semis, row and apartment statistics for both starts and completions.
    """
    # pylint: disable=too-many-instance-attributes,too-many-arguments,too-many-positional-arguments

    def __init__(
        self, jsonid,
        census_metropolitan_area, month, total_starts, total_complete,
        singles_starts, semis_starts, row_starts, apartment_starts,
        singles_complete, semis_complete, row_complete, apartment_complete,
        year=0
    ):
        self.__jsonid = jsonid
        self.__census_metropolitan_area = census_metropolitan_area
        self.__total_starts = total_starts
        self.__total_complete = total_complete
        self.__month = month
        self.__year = year
        self.__singles_starts = singles_starts
        self.__semis_starts = semis_starts
        self.__row_starts = row_starts
        self.__apartment_starts = apartment_starts
        self.__singles_complete = singles_complete
        self.__semis_complete = semis_complete
        self.__row_complete = row_complete
        self.__apartment_complete = apartment_complete

    @property
    def jsonid(self):
        """str: Gets the jsonid."""
        return self.__jsonid

    @property
    def census_metropolitan_area(self):
        """str: Gets the census metropolitan area."""
        return self.__census_metropolitan_area

    @property
    def year(self):
        """int: Gets the year."""
        return self.__year

    @property
    def month(self):
        """int: Gets the month."""
        return self.__month

    @property
    def total_starts(self):
        """int: Gets the total number of starts."""
        return self.__total_starts

    @property
    def total_complete(self):
        """int: Gets the total number of completes."""
        return self.__total_complete

    @property
    def singles_starts(self):
        """int: Gets the number of singles starts."""
        return self.__singles_starts

    @property
    def semis_starts(self):
        """int: Gets the number of semis starts."""
        return self.__semis_starts

    @property
    def row_starts(self):
        """int: Gets the number of row starts."""
        return self.__row_starts

    @property
    def apartment_starts(self):
        """int: Gets the number of apartment starts."""
        return self.__apartment_starts

    @property
    def singles_complete(self):
        """int: Gets the number of singles completes."""
        return self.__singles_complete

    @property
    def semis_complete(self):
        """int: Gets the number of semis completes."""
        return self.__semis_complete

    @property
    def row_complete(self):
        """int: Gets the number of row completes."""
        return self.__row_complete

    @property
    def apartment_complete(self):
        """int: Gets the number of apartment completes."""
        return self.__apartment_complete

    @jsonid.setter
    def jsonid(self, value):
        """Set the jsonid."""
        self.__jsonid = value

    @census_metropolitan_area.setter
    def census_metropolitan_area(self, value):
        """Set the census metropolitan area."""
        self.__census_metropolitan_area = value

    @year.setter
    def year(self, value):
        """Set the year."""
        self.__year = value

    @month.setter
    def month(self, value):
        """Set the month."""
        self.__month = value

    @total_starts.setter
    def total_starts(self, value):
        """Set the total number of starts."""
        self.__total_starts = value

    @total_complete.setter
    def total_complete(self, value):
        """Set the total number of completes."""
        self.__total_complete = value

    @singles_starts.setter
    def singles_starts(self, value):
        """Set the number of singles starts."""
        self.__singles_starts = value

    @semis_starts.setter
    def semis_starts(self, value):
        """Set the number of semis starts."""
        self.__semis_starts = value

    @row_starts.setter
    def row_starts(self, value):
        """Set the number of row starts."""
        self.__row_starts = value

    @apartment_starts.setter
    def apartment_starts(self, value):
        """Set the number of apartment starts."""
        self.__apartment_starts = value

    @singles_complete.setter
    def singles_complete(self, value):
        """Set the number of singles completes."""
        self.__singles_complete = value

    @semis_complete.setter
    def semis_complete(self, value):
        """Set the number of semis completes."""
        self.__semis_complete = value

    @row_complete.setter
    def row_complete(self, value):
        """Set the number of row completes."""
        self.__row_complete = value

    @apartment_complete.setter
    def apartment_complete(self, value):
        """Set the number of apartment completes."""
        self.__apartment_complete = value

    def __repr__(self):
        """Return an unambiguous string representation of the HousingData."""
        return (
            f"jsonid={self.__jsonid!r}, "
            f"HousingData(census_metropolitan_area={self.__census_metropolitan_area!r}, "
            f"year={self.__year!r}, "
            f"month={self.__month!r}, "
            f"total_starts={self.__total_starts!r}, "
            f"total_complete={self.__total_complete!r}, "
            f"singles_starts={self.__singles_starts!r}, "
            f"semis_starts={self.__semis_starts!r}, "
            f"row_starts={self.__row_starts!r}, "
            f"apartment_starts={self.__apartment_starts!r}, "
            f"singles_complete={self.__singles_complete!r}, "
            f"semis_complete={self.__semis_complete!r}, "
            f"row_complete={self.__row_complete!r}, "
            f"apartment_complete={self.__apartment_complete!r})"
        )