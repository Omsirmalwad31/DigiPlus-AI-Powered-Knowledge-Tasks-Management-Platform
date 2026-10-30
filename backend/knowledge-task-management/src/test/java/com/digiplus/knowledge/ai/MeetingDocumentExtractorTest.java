package com.digiplus.knowledge.ai;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class MeetingDocumentExtractorTest {
	private final MeetingDocumentExtractor extractor = new MeetingDocumentExtractor();

	@Test
	void extractsUtf8Text() {
		var text = extractor.extractText("txt", "Project decision: proceed.".getBytes(StandardCharsets.UTF_8));

		assertEquals("Project decision: proceed.", text);
	}

	@Test
	void extractsParagraphsFromDocxXml() throws Exception {
		var document = """
				<?xml version="1.0" encoding="UTF-8"?>
				<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
				  <w:body><w:p><w:r><w:t>Decision one.</w:t></w:r></w:p><w:p><w:r><w:t>Follow-up two.</w:t></w:r></w:p></w:body>
				</w:document>
				""";
		var output = new ByteArrayOutputStream();
		try (var zip = new ZipOutputStream(output)) {
			zip.putNextEntry(new ZipEntry("word/document.xml"));
			zip.write(document.getBytes(StandardCharsets.UTF_8));
			zip.closeEntry();
		}

		var text = extractor.extractText("docx", output.toByteArray());

		assertEquals("Decision one.\nFollow-up two.", text);
	}

	@Test
	void rejectsMalformedWordDocuments() {
		assertThrows(ResponseStatusException.class, () -> extractor.extractText("docx", new byte[] { 1, 2, 3 }));
	}
}
