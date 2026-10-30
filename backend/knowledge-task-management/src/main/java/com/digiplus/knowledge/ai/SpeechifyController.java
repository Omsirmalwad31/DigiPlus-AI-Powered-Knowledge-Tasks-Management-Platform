package com.digiplus.knowledge.ai;

import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/speechify")
public class SpeechifyController {
	private final SpeechifyService speechifyService;

	public SpeechifyController(SpeechifyService speechifyService) {
		this.speechifyService = speechifyService;
	}

	@GetMapping("/status")
	public SpeechifyStatus status() {
		return new SpeechifyStatus(speechifyService.isConfigured());
	}

	@PostMapping("/speech")
	public ResponseEntity<byte[]> synthesize(@Valid @RequestBody SpeechifyRequest request) {
		return ResponseEntity.ok()
				.contentType(MediaType.valueOf("audio/mpeg"))
				.cacheControl(CacheControl.noStore())
				.header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"meeting-minutes.mp3\"")
				.body(speechifyService.synthesize(request.text()));
	}

	public record SpeechifyStatus(boolean configured) {
	}
}
