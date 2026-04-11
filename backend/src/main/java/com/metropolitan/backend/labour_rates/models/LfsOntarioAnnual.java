package com.metropolitan.backend.labour_rates.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "lfs_ontario_annual")
public class LfsOntarioAnnual {

    @Id
    @Column(name = "`year`")
    private Integer year;

    @Column(name = "employment_rate")
    private Double employmentRate;

    @Column(name = "unemployment_rate")
    private Double unemploymentRate;

    @Column(name = "participation_rate")
    private Double participationRate;

    public LfsOntarioAnnual() {
    }

    public LfsOntarioAnnual(
            Integer year,
            Double employmentRate,
            Double unemploymentRate,
            Double participationRate) {
        this.year = year;
        this.employmentRate = employmentRate;
        this.unemploymentRate = unemploymentRate;
        this.participationRate = participationRate;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public Double getEmploymentRate() {
        return employmentRate;
    }

    public void setEmploymentRate(Double employmentRate) {
        this.employmentRate = employmentRate;
    }

    public Double getUnemploymentRate() {
        return unemploymentRate;
    }

    public void setUnemploymentRate(Double unemploymentRate) {
        this.unemploymentRate = unemploymentRate;
    }

    public Double getParticipationRate() {
        return participationRate;
    }

    public void setParticipationRate(Double participationRate) {
        this.participationRate = participationRate;
    }
}
