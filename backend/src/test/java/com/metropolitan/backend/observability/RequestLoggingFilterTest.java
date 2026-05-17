package com.metropolitan.backend.observability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootTest(
    classes = RequestLoggingFilterTest.TestApplication.class,
    properties = "logging.structured.format.console=logstash"
)
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class RequestLoggingFilterTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Test
    void logsStructuredRequestFieldsAndSetsRequestId(CapturedOutput output) throws Exception {
        mockMvc.perform(get("/test/request-log")
                .header(RequestLoggingFilter.REQUEST_ID_HEADER, "request-123")
                .header("User-Agent", "MockMvc"))
            .andExpect(status().isOk())
            .andExpect(header().string(RequestLoggingFilter.REQUEST_ID_HEADER, "request-123"));

        JsonNode log = Arrays.stream(output.getAll().split("\\R"))
            .filter(line -> line.contains("\"message\":\"http_request\""))
            .map(RequestLoggingFilterTest::readJson)
            .filter(node -> "request-123".equals(node.path("request_id").asText()))
            .findFirst()
            .orElseThrow();

        assertThat(log.path("message").asText()).isEqualTo("http_request");
        assertThat(log.path("event").asText()).isEqualTo("http_request");
        assertThat(log.path("service").asText()).isEqualTo("backend");
        assertThat(log.path("method").asText()).isEqualTo("GET");
        assertThat(log.path("path").asText()).isEqualTo("/test/request-log");
        assertThat(log.path("status").asInt()).isEqualTo(200);
        assertThat(log.path("duration_ms").isNumber()).isTrue();
    }

    private static JsonNode readJson(String line) {
        try {
            return OBJECT_MAPPER.readTree(line);
        } catch (Exception err) {
            throw new IllegalArgumentException("Expected JSON log line: " + line, err);
        }
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({RequestLoggingFilter.class, TestController.class})
    static class TestApplication {
    }

    @RestController
    public static class TestController {
        @GetMapping("/test/request-log")
        public ResponseEntity<String> ok() {
            return ResponseEntity.ok("ok");
        }
    }
}
