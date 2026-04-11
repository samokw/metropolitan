package com.metropolitan.backend.labour_rates;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.metropolitan.backend.labour_rates.dao.LfsOntarioAnnualDao;
import com.metropolitan.backend.labour_rates.models.LfsOntarioAnnual;

@Service
public class LfsOntarioAnnualServiceImpl implements LfsOntarioAnnualService {

    @Autowired
    private LfsOntarioAnnualDao lfsOntarioAnnualDao;

    @Override
    public List<LfsOntarioAnnual> allByYearAsc() {
        return lfsOntarioAnnualDao.findAllByOrderByYearAsc();
    }
}
