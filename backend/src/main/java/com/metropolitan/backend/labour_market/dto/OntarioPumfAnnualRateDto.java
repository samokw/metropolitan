package com.metropolitan.backend.labour_market.dto;

/**
 * Ontario labour rates for a calendar year, computed by averaging monthly PUMF-derived rates
 * across all survey waves stored for that year. Definitions align with StatCan LFS table 14100393:
 * employment rate = employed / population in the microdata file, unemployment = unemployed /
 * labour force, participation = labour force / population. {@code partialYear} is true when fewer
 * than 12 months are present (rolling / incomplete year).
 */
public record OntarioPumfAnnualRateDto(
        int year,
        double employmentRate,
        double unemploymentRate,
        double participationRate,
        int monthsAveraged,
        boolean partialYear) {}
