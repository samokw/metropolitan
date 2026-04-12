package com.metropolitan.backend.labour_rates;

import java.util.List;

import com.metropolitan.backend.labour_rates.models.LfsOntarioAnnual;

public interface LfsOntarioAnnualService {

    List<LfsOntarioAnnual> allByYearAsc();
}
