package com.digiplus.knowledge.ai;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MeetingUploadService {
	private static final long MAX_FILE_BYTES = 14L * 1024 * 1024;
	private static final Map<String, String> SUPPORTED_TYPES = Map.ofEntries(
			Map.entry("txt", "text/plain"),
			Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
			Map.entry("pdf", "application/pdf"),
			Map.entry("mp3", "audio/mpeg"),
			Map.entry("wav", "audio/wav"),
			Map.entry("m4a", "audio/mp4"),
			Map.entry("aac", "audio/aac"),
			Map.entry("ogg", "audio/ogg"),
			Map.entry("flac", "audio/flac"));

	private final GeminiService geminiService;
	private final MeetingDocumentExtractor documentExtractor;

	public MeetingUploadService(GeminiService geminiService, MeetingDocumentExtractor documentExtractor) {
		this.geminiService = geminiService;
		this.documentExtractor = documentExtractor;
	}

	public AiMeetingMinutes analyze(String title, MultipartFile file) {
		if (title == null || title.isBlank() || title.length() > 200) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A meeting title of 1 to 200 characters is required.");
		}
		if (file == null || file.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a non-empty meeting file to upload.");
		}
		if (file.getSize() > MAX_FILE_BYTES) {
			throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Meeting uploads are limited to 14 MB.");
		}

		var fileName = file.getOriginalFilename();
		var extension = extensionOf(fileName);
		var mimeType = SUPPORTED_TYPES.get(extension);
		if (mimeType == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
					"Supported uploads are TXT, DOCX, PDF, MP3, WAV, M4A, AAC, OGG, and FLAC.");
		}

		try {
			var content = file.getBytes();
			if (extension.equals("txt") || extension.equals("docx")) {
				var text = documentExtractor.extractText(extension, content);
				return geminiService.createMeetingMinutesFromText(title.trim(), text);
			}
			return geminiService.createMeetingMinutesFromFile(title.trim(), content, mimeType);
		} catch (IOException exception) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The uploaded file could not be read.");
		}
	}

	private String extensionOf(String fileName) {
		if (fileName == null) {
			return "";
		}
		var separator = Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\'));
		var dot = fileName.lastIndexOf('.');
		if (dot <= separator || dot == fileName.length() - 1) {
			return "";
		}
		return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
	}
}
