package com.digiplus.knowledge.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;

class GeminiServiceTest {
	private final ObjectMapper objectMapper = new ObjectMapper();

	@Test
	void reportsMissingApiKeyWithoutCallingGemini() {
		var service = new GeminiService(objectMapper, "", "gemini-2.5-flash");

		var exception = assertThrows(GeminiServiceException.class,
				() -> service.summarizeMeeting(new MeetingSummaryRequest("Planning", "The team agreed to review the plan.")));

		assertEquals(HttpStatus.SERVICE_UNAVAILABLE, exception.getStatus());
		assertEquals("Gemini is not configured. Set GEMINI_API_KEY on the backend and restart it.", exception.getMessage());
	}

	@Test
	void sendsTheApiKeyInAHeaderAndParsesStructuredGeminiOutput() throws Exception {
		var receivedApiKey = new AtomicReference<String>();
		var receivedPath = new AtomicReference<String>();
		var responseText = """
				{"overview":"The team agreed on the release plan.","discussionPoints":["Release timing"],"decisions":["Prioritize onboarding"],"actionItems":[{"description":"Share designs","suggestedOwner":"Sophie","dueDate":"2026-11-04"}],"openTasks":[],"questions":[]}
				""";
		var upstreamResponse = objectMapper.writeValueAsString(java.util.Map.of(
				"candidates", java.util.List.of(java.util.Map.of(
						"content", java.util.Map.of("parts", java.util.List.of(java.util.Map.of("text", responseText)))))));
		var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/", exchange -> {
			receivedApiKey.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
			receivedPath.set(exchange.getRequestURI().getPath());
			var body = upstreamResponse.getBytes(StandardCharsets.UTF_8);
			exchange.getResponseHeaders().set("Content-Type", "application/json");
			exchange.sendResponseHeaders(200, body.length);
			try (var output = exchange.getResponseBody()) {
				output.write(body);
			}
		});
		server.start();
		try {
			var service = new GeminiService(
					objectMapper,
					"test-key-not-real",
					"gemini-2.5-flash",
					"http://127.0.0.1:" + server.getAddress().getPort() + "/v1beta/");

			var result = service.summarizeMeeting(new MeetingSummaryRequest("Planning", "The team agreed to review the plan."));

			assertEquals("test-key-not-real", receivedApiKey.get());
			assertEquals("/v1beta/models/gemini-2.5-flash:generateContent", receivedPath.get());
			assertEquals("The team agreed on the release plan.", result.overview());
			assertEquals("Share designs", result.actionItems().getFirst().description());
		} finally {
			server.stop(0);
		}
	}

	@Test
	void sendsUploadedAudioAsInlineDataAndParsesMeetingMinutes() throws Exception {
		var receivedApiKey = new AtomicReference<String>();
		var receivedRequest = new AtomicReference<String>();
		var responseText = """
					{"transcript":"Speaker 1: We will review the launch plan.","overview":"The team reviewed the launch plan.","discussionPoints":["Launch plan"],"decisions":["Review before launch"],"actionItems":[],"risks":[],"openTasks":[],"questions":[]}
					""";
		var upstreamResponse = objectMapper.writeValueAsString(java.util.Map.of(
					"candidates", java.util.List.of(java.util.Map.of(
							"content", java.util.Map.of("parts", java.util.List.of(java.util.Map.of("text", responseText)))))));
		var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
			server.createContext("/", exchange -> {
			receivedApiKey.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
			receivedRequest.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
			var body = upstreamResponse.getBytes(StandardCharsets.UTF_8);
			exchange.getResponseHeaders().set("Content-Type", "application/json");
			exchange.sendResponseHeaders(200, body.length);
			try (var output = exchange.getResponseBody()) {
				output.write(body);
			}
		});
		server.start();
		try {
			var service = new GeminiService(
					objectMapper,
					"test-key-not-real",
					"gemini-2.5-flash",
					"http://127.0.0.1:" + server.getAddress().getPort() + "/v1beta/");

			var result = service.createMeetingMinutesFromFile("Planning", new byte[] { 1, 2 }, "audio/wav");

			assertEquals("test-key-not-real", receivedApiKey.get());
			assertTrue(receivedRequest.get().contains("\"inline_data\""));
			assertTrue(receivedRequest.get().contains("\"mime_type\":\"audio/wav\""));
			assertTrue(receivedRequest.get().contains("\"data\":\"AQI=\""));
			assertEquals("Speaker 1: We will review the launch plan.", result.transcript());
		} finally {
			server.stop(0);
		}
	}
}
