package com.metropolitan.backend.labour_market.dto;

/** Employment rate (employed as % of population in each PUMF cell), averaged across loaded months. */
public record ProvinceEducationEmploymentDto(
        int province, int educationLevel, double employmentRatePercent) {}
