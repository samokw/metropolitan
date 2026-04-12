package com.metropolitan.backend.labour_market.models;

import jakarta.persistence.*;

@Entity
@Table(name = "labour_market_data")
public class LabourData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "province")
    private Integer province;

    @Column(name = "education_level")
    private Integer educationLevel;

    @Column(name = "labour_force_status")
    private Integer labourForceStatus;

    @Column(name = "survey_year")
    private Integer surveyYear;

    @Column(name = "survey_month")
    private Integer surveyMonth;

    public LabourData(
            Integer id,
            Integer province,
            Integer labourForceStatus,
            Integer educationLevel,
            Integer surveyYear,
            Integer surveyMonth) {
        this.id = id;
        this.province = province;
        this.labourForceStatus = labourForceStatus;
        this.educationLevel = educationLevel;
        this.surveyYear = surveyYear;
        this.surveyMonth = surveyMonth;
    }

    public LabourData(Integer id, Integer province, Integer labourForceStatus, Integer educationLevel) {
        this(id, province, labourForceStatus, educationLevel, 0, 0);
    }

    public LabourData() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getProvince() {
        return province;
    }

    public void setProvince(Integer province) {
        this.province = province;
    }

    public Integer getEducationLevel() {
        return educationLevel;
    }

    public void setEducationLevel(Integer educationLevel) {
        this.educationLevel = educationLevel;
    }

    public Integer getLabourForceStatus() {
        return labourForceStatus;
    }

    public void setLabourForceStatus(Integer labourForceStatus) {
        this.labourForceStatus = labourForceStatus;
    }

    public Integer getSurveyYear() {
        return surveyYear;
    }

    public void setSurveyYear(Integer surveyYear) {
        this.surveyYear = surveyYear;
    }

    public Integer getSurveyMonth() {
        return surveyMonth;
    }

    public void setSurveyMonth(Integer surveyMonth) {
        this.surveyMonth = surveyMonth;
    }
}
