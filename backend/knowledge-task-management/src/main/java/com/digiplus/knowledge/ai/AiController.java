package com.digiplus.knowledge.ai;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {
	private static final Logger log = LoggerFactory.getLogger(AiController.class);
	private final GeminiService geminiService;

	public AiController(GeminiService geminiService) {
		this.geminiService = geminiService;
	}

	@GetMapping("/status")
	public AiStatus status() {
		return new AiStatus(geminiService.isConfigured(), geminiService.getActiveModel());
	}

	@PostMapping("/meeting-summary")
	public AiGeneratedBrief summarizeMeeting(@Valid @RequestBody MeetingSummaryRequest request) {
		log.info("Generating Gemini meeting summary; requestId={}", MDC.get("requestId"));
		return geminiService.summarizeMeeting(request);
	}

	@PostMapping("/catch-up-brief")
	public AiGeneratedBrief createCatchUpBrief(@Valid @RequestBody AiBriefRequest request) {
		log.info("Generating Gemini catch-up brief; requestId={}", MDC.get("requestId"));
		return geminiService.createCatchUpBrief(request);
	}

	@PostMapping("/handover-brief")
	public AiGeneratedBrief createHandoverBrief(@Valid @RequestBody AiBriefRequest request) {
		log.info("Generating Gemini handover brief; requestId={}", MDC.get("requestId"));
		return geminiService.createHandoverBrief(request);
	}

	public record AiStatus(boolean configured, String model) {
	}
}
