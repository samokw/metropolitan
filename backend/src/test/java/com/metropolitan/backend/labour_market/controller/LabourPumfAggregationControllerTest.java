package com.metropolitan.backend.labour_market.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.metropolitan.backend.labour_market.LabourPumfAggregationService;
import com.metropolitan.backend.labour_market.dto.OntarioPumfAnnualRateDto;
import com.metropolitan.backend.labour_market.dto.ProvinceEducationEmploymentDto;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(LabourPumfAggregationController.class)
class LabourPumfAggregationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LabourPumfAggregationService labourPumfAggregationService;

    @Test
    void ontarioAnnualFromPumfReturnsJson() throws Exception {
        when(labourPumfAggregationService.ontarioAnnualRatesFromPumf())
                .thenReturn(
                        List.of(
                                new OntarioPumfAnnualRateDto(2024, 62.0, 5.5, 66.0, 12, false)));

        mockMvc.perform(get("/api/labourOntarioAnnualFromPumf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].year").value(2024))
                .andExpect(jsonPath("$[0].monthsAveraged").value(12))
                .andExpect(jsonPath("$[0].partialYear").value(false));
    }

    @Test
    void employmentByProvinceEducationReturnsJson() throws Exception {
        when(labourPumfAggregationService.employmentRatesByProvinceAndEducation())
                .thenReturn(List.of(new ProvinceEducationEmploymentDto(35, 4, 80.5)));

        mockMvc.perform(get("/api/labourEmploymentRatesByProvinceEducation"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].province").value(35))
                .andExpect(jsonPath("$[0].educationLevel").value(4))
                .andExpect(jsonPath("$[0].employmentRatePercent").value(80.5));
    }
}
