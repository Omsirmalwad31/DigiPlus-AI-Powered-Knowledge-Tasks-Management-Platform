package com.digiplus.knowledge.ai;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class SpeechifyServiceTest {
	@Test
	void requiresAnApiKeyAndRejectsOversizedRequests() {
		var service = new SpeechifyService("", "geffen_32", "http://127.0.0.1/");

		var missingKey = assertThrows(ResponseStatusException.class, () -> service.synthesize("Meeting notes."));
		assertEquals(HttpStatus.SERVICE_UNAVAILABLE, missingKey.getStatusCode());

		var tooLong = assertThrows(ResponseStatusException.class,
				() -> new SpeechifyService("test-key", "geffen_32", "http://127.0.0.1/")
						.synthesize("x".repeat(2001)));
		assertEquals(HttpStatus.BAD_REQUEST, tooLong.getStatusCode());
	}

	@Test
	void authenticatesAndReturnsSynthesizedMp3Bytes() throws Exception {
		var authorization = new AtomicReference<String>();
		var receivedRequest = new AtomicReference<String>();
		var response = """
				{"audio_data":"AQIDBA==","audio_format":"mp3","billable_characters_count":5,"speech_marks":{}}
				""";
		var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/", exchange -> {
			authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
			receivedRequest.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
			var body = response.getBytes(StandardCharsets.UTF_8);
			exchange.getResponseHeaders().set("Content-Type", "application/json");
			exchange.sendResponseHeaders(200, body.length);
			try (var output = exchange.getResponseBody()) {
				output.write(body);
			}
		});
		server.start();
		try {
			var service = new SpeechifyService(
					"test-key-not-real",
					"geffen_32",
					"http://127.0.0.1:" + server.getAddress().getPort() + "/v1/");

			var audio = service.synthesize("Meeting summary.");

			assertTrue(service.isConfigured());
			assertEquals("Bearer test-key-not-real", authorization.get());
			assertTrue(receivedRequest.get().contains("\"model\":\"simba-3.5\""));
			assertTrue(receivedRequest.get().contains("\"audio_format\":\"mp3\""));
			assertArrayEquals(new byte[] { 1, 2, 3, 4 }, audio);
		} finally {
			server.stop(0);
		}
	}
}
