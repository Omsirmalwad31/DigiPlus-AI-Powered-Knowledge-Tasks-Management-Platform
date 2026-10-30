package com.digiplus.knowledge.ai;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AiExceptionHandler {
	private static final Logger log = LoggerFactory.getLogger(AiExceptionHandler.class);

	@ExceptionHandler(GeminiServiceException.class)
	public ResponseEntity<ApiError> handleGeminiError(GeminiServiceException exception, HttpServletRequest request) {
		var requestId = requestId();
		log.warn("AI request failed; requestId={}, status={}, message={}",
				requestId, exception.getStatus().value(), exception.getMessage());
		return ResponseEntity.status(exception.getStatus()).body(new ApiError(exception.getMessage(), requestId));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
		var requestId = requestId();
		var message = exception.getBindingResult().getFieldErrors().stream()
				.findFirst()
				.map(FieldError::getDefaultMessage)
				.orElse("The request contains invalid values.");
		return ResponseEntity.badRequest().body(new ApiError(message, requestId));
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ApiError> handleMalformedJson(HttpMessageNotReadableException exception, HttpServletRequest request) {
		return ResponseEntity.badRequest().body(new ApiError("The request body must be valid JSON.", requestId()));
	}

	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<ApiError> handleRequestError(ResponseStatusException exception, HttpServletRequest request) {
		var requestId = requestId();
		var message = exception.getReason() == null ? "The request could not be completed." : exception.getReason();
		return ResponseEntity.status(exception.getStatusCode()).body(new ApiError(message, requestId));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiError> handleUnexpectedError(Exception exception, HttpServletRequest request) {
		var requestId = requestId();
		log.error("Unexpected API error; requestId={}", requestId, exception);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(new ApiError("An unexpected server error occurred.", requestId));
	}

	private String requestId() {
		var current = MDC.get("requestId");
		return current == null ? UUID.randomUUID().toString() : current;
	}

	public record ApiError(String message, String requestId) {
	}
}
