package com.metropolitan.backend.labour_rates.dao;

import com.metropolitan.backend.labour_rates.models.LfsOntarioAnnual;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface LfsOntarioAnnualDao extends CrudRepository<LfsOntarioAnnual, Integer> {

    List<LfsOntarioAnnual> findAllByOrderByYearAsc();
}
