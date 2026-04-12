package com.metropolitan.backend.labour_market.controller;

import com.metropolitan.backend.labour_market.LabourPumfAggregationService;
import com.metropolitan.backend.labour_market.dto.OntarioPumfAnnualRateDto;
import com.metropolitan.backend.labour_market.dto.ProvinceEducationEmploymentDto;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/api")
public class LabourPumfAggregationController {

    private final LabourPumfAggregationService labourPumfAggregationService;

    @Autowired
    public LabourPumfAggregationController(LabourPumfAggregationService labourPumfAggregationService) {
        this.labourPumfAggregationService = labourPumfAggregationService;
    }

    /**
     * Ontario employment, unemployment, and participation rates by calendar year, each value
     * the mean of monthly rates computed from stored PUMF waves. Partial years use whatever
     * months have been ingested (rolling average).
     */
    @GetMapping("/labourOntarioAnnualFromPumf")
    public ResponseEntity<List<OntarioPumfAnnualRateDto>> ontarioAnnualFromPumf() {
        return ResponseEntity.ok(labourPumfAggregationService.ontarioAnnualRatesFromPumf());
    }

    /** Employment rate by province and education, averaged across all loaded PUMF months. */
    @GetMapping("/labourEmploymentRatesByProvinceEducation")
    public ResponseEntity<List<ProvinceEducationEmploymentDto>> employmentByProvinceEducation() {
        return ResponseEntity.ok(labourPumfAggregationService.employmentRatesByProvinceAndEducation());
    }
}
