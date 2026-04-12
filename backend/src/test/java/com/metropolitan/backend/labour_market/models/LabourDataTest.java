package com.metropolitan.backend.labour_market.models;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LabourDataTest {

  private LabourData labourData;

  @BeforeEach
  void setUp() {
    labourData = new LabourData();
  }

  @Test
  void testDefaultConstructor() {
    assertNotNull(labourData);
    assertNull(labourData.getId());
    assertNull(labourData.getProvince());
    assertNull(labourData.getEducationLevel());
    assertNull(labourData.getLabourForceStatus());
  }

  @Test
  void testParameterizedConstructor() {
    LabourData data = new LabourData(1, 2, 3, 4);
    assertEquals(1, data.getId());
    assertEquals(2, data.getProvince());
    assertEquals(4, data.getEducationLevel());
    assertEquals(3, data.getLabourForceStatus());
    assertEquals(0, data.getSurveyYear());
    assertEquals(0, data.getSurveyMonth());
  }

  @Test
  void testParameterizedConstructorWithSurveyPeriod() {
    LabourData data = new LabourData(1, 35, 1, 4, 2024, 3);
    assertEquals(2024, data.getSurveyYear());
    assertEquals(3, data.getSurveyMonth());
  }

  @Test
  void testSetAndGetId() {
    labourData.setId(10);
    assertEquals(10, labourData.getId());
  }

  @Test
  void testSetAndGetProvince() {
    labourData.setProvince(20);
    assertEquals(20, labourData.getProvince());
  }

  @Test
  void testSetAndGetEducationLevel() {
    labourData.setEducationLevel(30);
    assertEquals(30, labourData.getEducationLevel());
  }

  @Test
  void testSetAndGetLabourForceStatus() {
    labourData.setLabourForceStatus(40);
    assertEquals(40, labourData.getLabourForceStatus());
  }
}
