package com.digiplus.knowledge.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/ai")
public class MeetingUploadController {
	private static final Logger log = LoggerFactory.getLogger(MeetingUploadController.class);
	private final MeetingUploadService meetingUploadService;

	public MeetingUploadController(MeetingUploadService meetingUploadService) {
		this.meetingUploadService = meetingUploadService;
	}

	@PostMapping("/meeting-assistant")
	public AiMeetingMinutes analyzeMeeting(
			@RequestParam("title") String title,
			@RequestParam("file") MultipartFile file) {
		log.info("Processing meeting upload; requestId={}", MDC.get("requestId"));
		return meetingUploadService.analyze(title, file);
	}
}
