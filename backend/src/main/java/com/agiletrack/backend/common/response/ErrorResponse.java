package com.agiletrack.backend.common.response;

public record ErrorResponse (
        int status,
        String message,
        long timestamp
) {}
