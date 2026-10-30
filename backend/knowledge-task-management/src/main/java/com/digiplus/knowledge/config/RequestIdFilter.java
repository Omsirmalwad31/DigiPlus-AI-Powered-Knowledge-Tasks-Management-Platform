package com.digiplus.knowledge.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

public class RequestIdFilter extends OncePerRequestFilter {
	private static final String REQUEST_ID_HEADER = "X-Request-Id";

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		var suppliedId = request.getHeader(REQUEST_ID_HEADER);
		var requestId = suppliedId != null && suppliedId.matches("[A-Za-z0-9._-]{1,80}")
				? suppliedId
				: UUID.randomUUID().toString();
		MDC.put("requestId", requestId);
		response.setHeader(REQUEST_ID_HEADER, requestId);
		try {
			filterChain.doFilter(request, response);
		} finally {
			MDC.remove("requestId");
		}
	}
}
