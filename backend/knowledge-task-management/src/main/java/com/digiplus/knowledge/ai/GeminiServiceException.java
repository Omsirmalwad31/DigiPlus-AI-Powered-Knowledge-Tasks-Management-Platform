package com.digiplus.knowledge.ai;

import org.springframework.http.HttpStatus;

public class GeminiServiceException extends RuntimeException {
	private final HttpStatus status;

	public GeminiServiceException(HttpStatus status, String message) {
		super(message);
		this.status = status;
	}

	public HttpStatus getStatus() {
		return status;
	}
}
