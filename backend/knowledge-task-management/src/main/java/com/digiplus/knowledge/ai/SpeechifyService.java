package com.digiplus.knowledge.ai;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SpeechifyService {
	private static final Logger log = LoggerFactory.getLogger(SpeechifyService.class);
	private static final int MAX_REQUEST_CHARACTERS = 2000;

	private final RestClient restClient;
	private final String apiKey;
	private final String voiceId;

	@Autowired
	public SpeechifyService(
			@Value("${digiplus.speechify.api-key:}") String apiKey,
			@Value("${digiplus.speechify.voice-id:geffen_32}") String voiceId) {
		this(apiKey, voiceId, "https://api.speechify.ai/v1/");
	}

	SpeechifyService(String apiKey, String voiceId, String baseUrl) {
		var httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
		var requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(Duration.ofSeconds(60));
		this.restClient = RestClient.builder()
				.baseUrl(baseUrl)
				.requestFactory(requestFactory)
				.build();
		this.apiKey = apiKey;
		this.voiceId = voiceId;
	}

	public boolean isConfigured() {
		return !apiKey.isBlank();
	}

	public byte[] synthesize(String text) {
		if (!isConfigured()) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
					"Speechify is not configured. Set SPEECHIFY_API_KEY on the backend and restart it.");
		}
		if (text == null || text.isBlank() || text.length() > MAX_REQUEST_CHARACTERS) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Speechify requires text containing 1 to 2,000 characters.");
		}
		if (voiceId.isBlank()) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
					"Speechify has no voice configured. Set SPEECHIFY_VOICE_ID on the backend.");
		}

		try {
			var request = Map.of(
					"input", text,
					"voice_id", voiceId,
					"audio_format", "mp3",
					"model", "simba-3.5");
			var response = restClient.post()
					.uri("audio/speech")
					.header("Authorization", "Bearer " + apiKey)
					.contentType(MediaType.APPLICATION_JSON)
					.accept(MediaType.APPLICATION_JSON)
					.body(request)
					.retrieve()
					.body(new ParameterizedTypeReference<Map<String, Object>>() { });
			var encodedAudio = response == null ? null : response.get("audio_data");
			if (!(encodedAudio instanceof String audioData) || audioData.isBlank()) {
				throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
						"Speechify returned an empty audio response. Please try again.");
			}
			var audio = java.util.Base64.getDecoder().decode(audioData);
			if (audio.length == 0) {
				throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
						"Speechify returned an empty audio response. Please try again.");
			}
			return audio;
		} catch (RestClientResponseException exception) {
			log.warn("Speechify request failed with upstream HTTP status {}", exception.getStatusCode().value());
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
					"Speechify could not generate audio. Check the backend configuration or try again later.");
		} catch (RestClientException exception) {
			log.warn("Speechify request could not reach the upstream service: {}", exception.getMessage());
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
					"Speechify is temporarily unreachable. Please try again later.");
		} catch (IllegalArgumentException exception) {
			log.warn("Speechify returned an unreadable audio response.");
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
					"Speechify returned an unreadable audio response. Please try again.");
		}
	}

}
