package com.metropolitan.backend.housing.model;

import com.metropolitan.backend.housing.models.Data;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DataTest {

    @Test
    void testConstructorAndGetters() {
        Data data = new Data(1, "Test Area", 100, 50, 12, 2024, 20, 10, 30, 40, 5, 15, 25, 5);

        assertEquals(1, data.getId());
        assertEquals("Test Area", data.getCensusArea());
        assertEquals(100, data.getTotalStarts());
        assertEquals(50, data.getTotalComplete());
        assertEquals(12, data.getMonth());
        assertEquals(2024, data.getYear());
        assertEquals(20, data.getSingleStarts());
        assertEquals(10, data.getSemisStarts());
        assertEquals(30, data.getRowStarts());
        assertEquals(40, data.getApartmentStarts());
        assertEquals(5, data.getSinglesComplete());
        assertEquals(15, data.getSemisComplete());
        assertEquals(25, data.getRowComplete());
        assertEquals(5, data.getApartmentComplete());
    }

    @Test
    void testSetters() {
        Data data = new Data();
        data.setId(1);
        data.setCensusArea("New Area");
        data.setTotalStarts(200);
        data.setTotalComplete(100);
        data.setMonth(6);
        data.setYear(2024);
        data.setSingleStarts(30);
        data.setSemisStarts(15);
        data.setRowStarts(45);
        data.setApartmentStarts(60);
        data.setSinglesComplete(10);
        data.setSemisComplete(20);
        data.setRowComplete(30);
        data.setApartmentComplete(10);

        assertEquals(1, data.getId());
        assertEquals("New Area", data.getCensusArea());
        assertEquals(200, data.getTotalStarts());
        assertEquals(100, data.getTotalComplete());
        assertEquals(6, data.getMonth());
        assertEquals(2024, data.getYear());
        assertEquals(30, data.getSingleStarts());
        assertEquals(15, data.getSemisStarts());
        assertEquals(45, data.getRowStarts());
        assertEquals(60, data.getApartmentStarts());
        assertEquals(10, data.getSinglesComplete());
        assertEquals(20, data.getSemisComplete());
        assertEquals(30, data.getRowComplete());
        assertEquals(10, data.getApartmentComplete());
    }

    @Test
    void testDefaultConstructor() {
        Data data = new Data();

        assertNull(data.getId());
        assertNull(data.getCensusArea());
        assertNull(data.getTotalStarts());
        assertNull(data.getTotalComplete());
        assertNull(data.getMonth());
        assertNull(data.getYear());
        assertNull(data.getSingleStarts());
        assertNull(data.getSemisStarts());
        assertNull(data.getRowStarts());
        assertNull(data.getApartmentStarts());
        assertNull(data.getSinglesComplete());
        assertNull(data.getSemisComplete());
        assertNull(data.getRowComplete());
        assertNull(data.getApartmentComplete());
    }
}
