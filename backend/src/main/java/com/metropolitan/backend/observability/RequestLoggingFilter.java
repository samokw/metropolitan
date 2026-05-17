package com.metropolitan.backend.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final Logger LOGGER = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final List<String> EXCLUDED_PATHS = List.of(
        "/api/actuator/health",
        "/api/actuator/prometheus"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return EXCLUDED_PATHS.stream().anyMatch(path::startsWith);
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        response.setHeader(REQUEST_ID_HEADER, requestId);

        long startNanos = System.nanoTime();
        Exception exception = null;

        try {
            filterChain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException err) {
            exception = err;
            throw err;
        } finally {
            long durationMs = Duration.ofNanos(System.nanoTime() - startNanos).toMillis();
            logRequest(request, response, requestId, durationMs, exception);
        }
    }

    private void logRequest(
        HttpServletRequest request,
        HttpServletResponse response,
        String requestId,
        long durationMs,
        Exception exception
    ) {
        var builder = LOGGER.atInfo()
            .addKeyValue("service", "backend")
            .addKeyValue("event", "http_request")
            .addKeyValue("request_id", requestId)
            .addKeyValue("method", request.getMethod())
            .addKeyValue("path", request.getRequestURI())
            .addKeyValue("query", request.getQueryString())
            .addKeyValue("status", responseStatus(response, exception))
            .addKeyValue("duration_ms", durationMs)
            .addKeyValue("remote_addr", request.getRemoteAddr())
            .addKeyValue("user_agent", request.getHeader("User-Agent"));

        if (exception != null) {
            builder.addKeyValue("exception", exception.getClass().getName());
        }

        builder.log("http_request");
    }

    private int responseStatus(HttpServletResponse response, Exception exception) {
        if (exception != null && response.getStatus() < HttpServletResponse.SC_BAD_REQUEST) {
            return HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
        }
        return response.getStatus();
    }
}
