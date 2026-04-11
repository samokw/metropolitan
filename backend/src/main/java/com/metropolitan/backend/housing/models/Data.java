package com.metropolitan.backend.housing.models;

import jakarta.persistence.*;

@Entity
@Table(name = "housing_data")
public class Data {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "census_metropolitan_area")
    private String censusArea;

    @Column(name = "total_starts")
    private Integer totalStarts;

    @Column(name = "total_complete")
    private Integer totalComplete;

    @Column(name = "`month`")
    private Integer month;

    @Column(name = "`year`")
    private Integer year;

    @Column(name = "singles_starts")
    private Integer singleStarts;

    @Column(name = "semis_starts")
    private Integer semisStarts;

    @Column(name = "row_starts")
    private Integer rowStarts;

    @Column(name = "apartment_starts")
    private Integer apartmentStarts;

    @Column(name = "singles_complete")
    private Integer singlesComplete;

    @Column(name = "semis_complete")
    private Integer semisComplete;

    @Column(name = "row_complete")
    private Integer rowComplete;

    @Column(name = "apartment_complete")
    private Integer apartmentComplete;

    public Data() {
        
    }

    public Data(Integer id, String censusArea, Integer totalStarts, Integer totalComplete, Integer month, Integer year, Integer singleStarts, Integer semisStarts, Integer rowStarts, Integer apartmentStarts, Integer singlesComplete, Integer semisComplete, Integer rowComplete, Integer apartmentComplete) {
        this.id = id;
        this.censusArea = censusArea;
        this.totalStarts = totalStarts;
        this.totalComplete = totalComplete;
        this.month = month;
        this.year = year;
        this.singleStarts = singleStarts;
        this.semisStarts = semisStarts;
        this.rowStarts = rowStarts;
        this.apartmentStarts = apartmentStarts;
        this.singlesComplete = singlesComplete;
        this.semisComplete = semisComplete;
        this.rowComplete = rowComplete;
        this.apartmentComplete = apartmentComplete;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getCensusArea() {
        return censusArea;
    }

    public void setCensusArea(String censusArea) {
        this.censusArea = censusArea;
    }

    public Integer getTotalStarts() {
        return totalStarts;
    }

    public void setTotalStarts(Integer totalStarts) {
        this.totalStarts = totalStarts;
    }

    public Integer getTotalComplete() {
        return totalComplete;
    }

    public void setTotalComplete(Integer totalComplete) {
        this.totalComplete = totalComplete;
    }

    public Integer getMonth() {
        return month;
    }

    public void setMonth(Integer month) {
        this.month = month;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public Integer getSingleStarts() {
        return singleStarts;
    }

    public void setSingleStarts(Integer singleStarts) {
        this.singleStarts = singleStarts;
    }

    public Integer getRowStarts() {
        return rowStarts;
    }

    public void setRowStarts(Integer rowStarts) {
        this.rowStarts = rowStarts;
    }

    public Integer getApartmentStarts() {
        return apartmentStarts;
    }

    public void setApartmentStarts(Integer apartmentStarts) {
        this.apartmentStarts = apartmentStarts;
    }

    public Integer getSemisStarts() {
        return semisStarts;
    }

    public void setSemisStarts(Integer semisStarts) {
        this.semisStarts = semisStarts;
    }

    public Integer getSinglesComplete() {
        return singlesComplete;
    }

    public void setSinglesComplete(Integer singlesComplete) {
        this.singlesComplete = singlesComplete;
    }

    public Integer getSemisComplete() {
        return semisComplete;
    }

    public void setSemisComplete(Integer semisComplete) {
        this.semisComplete = semisComplete;
    }

    public Integer getRowComplete() {
        return rowComplete;
    }

    public void setRowComplete(Integer rowComplete) {
        this.rowComplete = rowComplete;
    }

    public Integer getApartmentComplete() {
        return apartmentComplete;
    }

    public void setApartmentComplete(Integer apartmentComplete) {
        this.apartmentComplete = apartmentComplete;
    }
}
