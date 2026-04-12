package com.metropolitan.backend.labour_market;

import com.metropolitan.backend.labour_market.dto.OntarioPumfAnnualRateDto;
import com.metropolitan.backend.labour_market.dto.ProvinceEducationEmploymentDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.springframework.stereotype.Service;

@Service
public class LabourPumfAggregationService {

    private static final int MONTHS_PER_YEAR = 12;

    @PersistenceContext
    private EntityManager entityManager;

    @SuppressWarnings("unchecked")
    public List<OntarioPumfAnnualRateDto> ontarioAnnualRatesFromPumf() {
        String sql =
                """
                SELECT survey_year, survey_month,
                    SUM(CASE WHEN labour_force_status = 1 THEN 1 ELSE 0 END),
                    SUM(CASE WHEN labour_force_status IN (1, 2) THEN 1 ELSE 0 END),
                    SUM(CASE WHEN labour_force_status = 2 THEN 1 ELSE 0 END),
                    COUNT(*)
                FROM labour_market_data
                WHERE province = 35 AND survey_year > 0 AND survey_month > 0
                GROUP BY survey_year, survey_month
                ORDER BY survey_year, survey_month
                """;

        List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();
        Map<Integer, List<double[]>> byYear = new TreeMap<>();

        for (Object[] row : rows) {
            int surveyYear = ((Number) row[0]).intValue();
            long employed = ((Number) row[2]).longValue();
            long labourForce = ((Number) row[3]).longValue();
            long unemployed = ((Number) row[4]).longValue();
            long population = ((Number) row[5]).longValue();

            // Match StatCan table 14100393: employment rate = employed / population; unemployment = unemployed / labour force.
            double employmentRate = population > 0 ? 100.0 * employed / population : 0.0;
            double unemploymentRate = labourForce > 0 ? 100.0 * unemployed / labourForce : 0.0;
            double participationRate = population > 0 ? 100.0 * labourForce / population : 0.0;

            byYear
                    .computeIfAbsent(surveyYear, y -> new ArrayList<>())
                    .add(new double[] {employmentRate, unemploymentRate, participationRate});
        }

        List<OntarioPumfAnnualRateDto> out = new ArrayList<>();
        for (Map.Entry<Integer, List<double[]>> e : byYear.entrySet()) {
            List<double[]> months = e.getValue();
            int n = months.size();
            double sumE = 0, sumU = 0, sumP = 0;
            for (double[] t : months) {
                sumE += t[0];
                sumU += t[1];
                sumP += t[2];
            }
            boolean partialYear = n < MONTHS_PER_YEAR;
            out.add(
                    new OntarioPumfAnnualRateDto(
                            e.getKey(),
                            sumE / n,
                            sumU / n,
                            sumP / n,
                            n,
                            partialYear));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    public List<ProvinceEducationEmploymentDto> employmentRatesByProvinceAndEducation() {
        String sql =
                """
                SELECT survey_year, survey_month, province, education_level,
                    SUM(CASE WHEN labour_force_status = 1 THEN 1 ELSE 0 END),
                    COUNT(*)
                FROM labour_market_data
                WHERE survey_year > 0 AND survey_month > 0
                GROUP BY survey_year, survey_month, province, education_level
                """;

        List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();
        Map<String, List<Double>> monthlyRates = new HashMap<>();

        for (Object[] row : rows) {
            int province = ((Number) row[2]).intValue();
            int education = ((Number) row[3]).intValue();
            long employed = ((Number) row[4]).longValue();
            long population = ((Number) row[5]).longValue();
            double rate = population > 0 ? 100.0 * employed / population : 0.0;
            String key = province + ":" + education;
            monthlyRates.computeIfAbsent(key, k -> new ArrayList<>()).add(rate);
        }

        List<ProvinceEducationEmploymentDto> out = new ArrayList<>();
        for (Map.Entry<String, List<Double>> e : monthlyRates.entrySet()) {
            String[] parts = e.getKey().split(":");
            int province = Integer.parseInt(parts[0]);
            int educationLevel = Integer.parseInt(parts[1]);
            List<Double> rates = e.getValue();
            double avg =
                    rates.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            out.add(new ProvinceEducationEmploymentDto(province, educationLevel, avg));
        }
        out.sort(
                Comparator.comparingInt(ProvinceEducationEmploymentDto::province)
                        .thenComparingInt(ProvinceEducationEmploymentDto::educationLevel));
        return out;
    }
}
