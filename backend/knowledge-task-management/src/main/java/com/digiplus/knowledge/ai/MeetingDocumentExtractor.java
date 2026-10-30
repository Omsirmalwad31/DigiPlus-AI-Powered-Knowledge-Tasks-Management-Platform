package com.digiplus.knowledge.ai;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipInputStream;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class MeetingDocumentExtractor {
	private static final int MAX_TEXT_CHARACTERS = 100_000;
	private static final int MAX_DOCX_XML_BYTES = 2_000_000;

	public String extractText(String extension, byte[] content) {
		return switch (extension) {
			case "txt" -> extractPlainText(content);
			case "docx" -> extractDocxText(content);
			default -> throw new IllegalArgumentException("Only TXT and DOCX text extraction is supported.");
		};
	}

	private String extractPlainText(byte[] content) {
		try {
			var text = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(content)).toString();
			if (text.isBlank()) {
				throw invalidDocument("The text file is empty.");
			}
			if (text.length() > MAX_TEXT_CHARACTERS) {
				throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "The extracted text exceeds the 100,000 character limit.");
			}
			return text;
		} catch (CharacterCodingException exception) {
			throw invalidDocument("The text file must use UTF-8 encoding.");
		}
	}

	private String extractDocxText(byte[] content) {
		try (var zip = new ZipInputStream(new ByteArrayInputStream(content))) {
			java.util.zip.ZipEntry entry;
			while ((entry = zip.getNextEntry()) != null) {
				if (!entry.getName().equals("word/document.xml")) {
					continue;
				}
				var xml = zip.readNBytes(MAX_DOCX_XML_BYTES + 1);
				if (xml.length > MAX_DOCX_XML_BYTES) {
					throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "The Word document is too large to process.");
				}
				var text = readWordXml(xml);
				if (text.isBlank()) {
					throw invalidDocument("The Word document contains no readable text.");
				}
				if (text.length() > MAX_TEXT_CHARACTERS) {
					throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "The extracted text exceeds the 100,000 character limit.");
				}
				return text;
			}
		} catch (IOException | XMLStreamException exception) {
			throw invalidDocument("The Word document could not be read.");
		}
		throw invalidDocument("The uploaded file is not a valid DOCX document.");
	}

	private String readWordXml(byte[] xml) throws XMLStreamException {
		var factory = XMLInputFactory.newFactory();
		factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
		factory.setProperty("javax.xml.stream.isSupportingExternalEntities", false);
		var reader = factory.createXMLStreamReader(new ByteArrayInputStream(xml));
		var text = new StringBuilder();
		try {
			while (reader.hasNext()) {
				var event = reader.next();
				if (event == javax.xml.stream.XMLStreamConstants.START_ELEMENT && reader.getLocalName().equals("p")) {
					text.append('\n');
				} else if (event == javax.xml.stream.XMLStreamConstants.START_ELEMENT && reader.getLocalName().equals("t")) {
					text.append(reader.getElementText());
				}
				if (text.length() > MAX_TEXT_CHARACTERS) {
					throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "The extracted text exceeds the 100,000 character limit.");
				}
			}
		} finally {
			reader.close();
		}
		return text.toString().strip();
	}

	private ResponseStatusException invalidDocument(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}
}
