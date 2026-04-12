package com.metropolitan.backend.labour_rates.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.metropolitan.backend.labour_rates.LfsOntarioAnnualService;
import com.metropolitan.backend.labour_rates.models.LfsOntarioAnnual;

@RestController
@RequestMapping(path = "/api/labourRatesByYear")
public class LfsOntarioAnnualController {

    private final LfsOntarioAnnualService lfsOntarioAnnualService;

    @Autowired
    public LfsOntarioAnnualController(LfsOntarioAnnualService lfsOntarioAnnualService) {
        this.lfsOntarioAnnualService = lfsOntarioAnnualService;
    }

    @GetMapping
    public ResponseEntity<List<LfsOntarioAnnual>> allByYear() {
        return ResponseEntity.ok(lfsOntarioAnnualService.allByYearAsc());
    }
}
