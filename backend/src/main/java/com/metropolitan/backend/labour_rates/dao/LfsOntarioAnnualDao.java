package com.metropolitan.backend.labour_rates.dao;

import java.util.List;

import org.springframework.data.repository.CrudRepository;

import com.metropolitan.backend.labour_rates.models.LfsOntarioAnnual;

public interface LfsOntarioAnnualDao extends CrudRepository<LfsOntarioAnnual, Integer> {

    List<LfsOntarioAnnual> findAllByOrderByYearAsc();
}
