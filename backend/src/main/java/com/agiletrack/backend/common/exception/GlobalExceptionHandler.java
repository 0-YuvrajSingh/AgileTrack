package com.agiletrack.backend.common.exception;

import com.agiletrack.backend.common.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import lombok.extern.slf4j.Slf4j;

import java.util.stream.Collectors;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

        // ── helpers ──────────────────────────────────────────────────────────────

        private ResponseEntity<ErrorResponse> buildErrorResponse(
                        HttpStatus status,
                        String message,
                        HttpServletRequest request) {
                return ResponseEntity
                                .status(status)
                                .body(new ErrorResponse(
                                                status.value(),
                                                message,
                                                System.currentTimeMillis()));
        }

        // ── 4xx handlers ─────────────────────────────────────────────────────────

        @ExceptionHandler(EmailAlreadyExistsException.class)
        public ResponseEntity<ErrorResponse> handleEmailAlreadyExists(
                        EmailAlreadyExistsException ex,
                        HttpServletRequest request) {
                return buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage(), request);
        }

        @ExceptionHandler(UserNotFoundException.class)
        public ResponseEntity<ErrorResponse> handleUserNotFound(
                        UserNotFoundException ex,
                        HttpServletRequest request) {
                return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
        }

        @ExceptionHandler(UsernameNotFoundException.class)
        public ResponseEntity<ErrorResponse> handleUsernameNotFound(
                        UsernameNotFoundException ex,
                        HttpServletRequest request) {
                return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
        }

        @ExceptionHandler(WorkspaceNotFoundException.class)
        public ResponseEntity<ErrorResponse> handleWorkspaceNotFound(
                        WorkspaceNotFoundException ex,
                        HttpServletRequest request) {
                return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
        }

        @ExceptionHandler(ProjectNotFoundException.class)
        public ResponseEntity<ErrorResponse> handleProjectNotFound(
                        ProjectNotFoundException ex,
                        HttpServletRequest request) {
                return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
        }

        @ExceptionHandler(TaskNotFoundException.class)
        public ResponseEntity<ErrorResponse> handleTaskNotFound(
                        TaskNotFoundException ex,
                        HttpServletRequest request) {
                return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
        }

        @ExceptionHandler(AccessDeniedException.class)
        public ResponseEntity<ErrorResponse> handleAccessDenied(
                        AccessDeniedException ex,
                        HttpServletRequest request) {
                return buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage(), request);
        }

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ErrorResponse> handleValidation(
                        MethodArgumentNotValidException ex,
                        HttpServletRequest request) {
                String message = ex.getBindingResult().getFieldErrors().stream()
                                .map(FieldError::getDefaultMessage)
                                .collect(Collectors.joining(", "));
                return buildErrorResponse(HttpStatus.BAD_REQUEST, message, request);
        }

        // ── 5xx handlers ─────────────────────────────────────────────────────────

        @ExceptionHandler(Exception.class)
        public ResponseEntity<ErrorResponse> handleGeneric(
                        Exception ex,
                        HttpServletRequest request) {
                log.error("Unhandled exception: ", ex);
                return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred", request);
        }
}
