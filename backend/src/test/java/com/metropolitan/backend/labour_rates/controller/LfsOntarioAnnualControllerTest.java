package com.metropolitan.backend.labour_rates.controller;

import com.metropolitan.backend.labour_rates.LfsOntarioAnnualService;
import com.metropolitan.backend.labour_rates.models.LfsOntarioAnnual;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LfsOntarioAnnualControllerTest {

    @Mock
    private LfsOntarioAnnualService lfsOntarioAnnualService;

    @InjectMocks
    private LfsOntarioAnnualController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testAllByYear() {
        List<LfsOntarioAnnual> rows =
                List.of(new LfsOntarioAnnual(2020, 57.5, 9.0, 65.0), new LfsOntarioAnnual(2021, 59.9, 8.0, 66.0));
        when(lfsOntarioAnnualService.allByYearAsc()).thenReturn(rows);

        ResponseEntity<List<LfsOntarioAnnual>> response = controller.allByYear();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(rows, response.getBody());
        verify(lfsOntarioAnnualService, times(1)).allByYearAsc();
    }
}
