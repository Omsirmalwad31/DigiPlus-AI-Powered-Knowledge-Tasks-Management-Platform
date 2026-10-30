package com.digiplus.knowledge.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {
	@Bean
	OncePerRequestFilter requestIdFilter() {
		return new RequestIdFilter();
	}

	@Bean
	WebMvcConfigurer corsConfigurer(@Value("${digiplus.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174}") String allowedOrigins) {
		var origins = allowedOrigins.split(",");
		return new WebMvcConfigurer() {
			@Override
			public void addCorsMappings(CorsRegistry registry) {
				registry.addMapping("/api/**")
						.allowedOrigins(origins)
						.allowedMethods("GET", "POST", "PUT", "OPTIONS")
						.allowedHeaders("Content-Type", "X-Request-Id")
						.exposedHeaders("X-Request-Id")
						.maxAge(3600);
			}
		};
	}
}
