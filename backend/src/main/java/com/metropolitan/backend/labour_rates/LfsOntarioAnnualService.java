package com.metropolitan.backend.labour_rates;

import com.metropolitan.backend.labour_rates.models.LfsOntarioAnnual;
import java.util.List;

public interface LfsOntarioAnnualService {

    List<LfsOntarioAnnual> allByYearAsc();
}
