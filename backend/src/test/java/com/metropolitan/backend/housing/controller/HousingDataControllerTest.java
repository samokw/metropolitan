package com.metropolitan.backend.housing.controller;

import com.metropolitan.backend.housing.DataService;
import com.metropolitan.backend.housing.models.Data;
import com.metropolitan.backend.controller.HousingDataController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HousingDataControllerTest {

    @Mock
    private DataService dataService;

    @InjectMocks
    private HousingDataController housingDataController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testGetDataById() {
        Integer id = 1;
        Data mockData = new Data(id, "TestArea", 100, 50, 3, 2024, 20, 15, 10, 5, 18, 14, 9, 4);
        when(dataService.getData(id)).thenReturn(mockData);

        ResponseEntity<Data> response = housingDataController.getData(id);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(mockData, response.getBody());
        verify(dataService, times(1)).getData(id);
    }

    @Test
    void testGetDataById_NotFound() {
        Integer id = 999;
        when(dataService.getData(id)).thenReturn(null);

        ResponseEntity<Data> response = housingDataController.getData(id);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }

    @Test
    void testGetAllData() {
        List<Data> mockDataList = Arrays.asList(
                new Data(1, "Area1", 100, 50, 3, 2024, 20, 15, 10, 5, 18, 14, 9, 4),
                new Data(2, "Area2", 200, 80, 4, 2024, 30, 25, 20, 15, 28, 24, 19, 14)
        );
        when(dataService.allData()).thenReturn(mockDataList);

        ResponseEntity<Iterable<Data>> response = housingDataController.allData();

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(mockDataList, response.getBody());
        verify(dataService, times(1)).allData();
    }

    @Test
    void testGetTotalHousingStartsByCensusArea() {
        String censusArea = "TestArea";
        Integer totalStarts = 500;
        when(dataService.getTotalStartsByArea(censusArea)).thenReturn(totalStarts);

        ResponseEntity<Integer> response = housingDataController.getTotalHousingStartsByCensusArea(censusArea);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(totalStarts, response.getBody());
        verify(dataService, times(1)).getTotalStartsByArea(censusArea);
    }

    @Test
    void testGetTotalHousingCompletionsByCensusArea() {
        String censusArea = "TestArea";
        Integer totalComplete = 300;
        when(dataService.getTotalCompleteByArea(censusArea)).thenReturn(totalComplete);

        ResponseEntity<Integer> response = housingDataController.getTotalHousingCompletionsByCensusArea(censusArea);

        assertNotNull(response);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(totalComplete, response.getBody());
        verify(dataService, times(1)).getTotalCompleteByArea(censusArea);
    }
}
