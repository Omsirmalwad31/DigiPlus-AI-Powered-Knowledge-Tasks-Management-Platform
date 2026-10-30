package com.digiplus.knowledge.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Loads local secrets from gitignored env files so local runs work without
 * manually exporting PowerShell environment variables.
 */
public final class LocalEnvLoader {
	private static final Logger log = LoggerFactory.getLogger(LocalEnvLoader.class);

	private LocalEnvLoader() {
	}

	public static void load() {
		var candidates = List.of(
				Path.of("file.env"),
				Path.of(".env"),
				Path.of("..", "file.env"),
				Path.of("..", ".env"),
				Path.of("..", "..", "file.env"),
				Path.of("..", "..", ".env"));
		for (var candidate : candidates) {
			var absolute = candidate.toAbsolutePath().normalize();
			if (!Files.isRegularFile(absolute)) {
				continue;
			}
			try {
				var values = parse(Files.readString(absolute, StandardCharsets.UTF_8));
				int applied = 0;
				for (var entry : values.entrySet()) {
					if (applyIfUnset(entry.getKey(), entry.getValue())) {
						applied++;
					}
				}
				if (applied > 0) {
					log.info("Loaded {} local environment value(s) from {}", applied, absolute);
				}
				return;
			} catch (IOException exception) {
				log.warn("Could not read local env file {}: {}", absolute, exception.getMessage());
			}
		}
	}

	static Map<String, String> parse(String contents) {
		var values = new LinkedHashMap<String, String>();
		for (var rawLine : contents.split("\\R")) {
			var line = rawLine.trim();
			if (line.isEmpty() || line.startsWith("#")) {
				continue;
			}
			var separator = line.indexOf('=');
			var colon = line.indexOf(':');
			if (separator < 0 || (colon >= 0 && colon < separator)) {
				separator = colon;
			}
			if (separator <= 0) {
				continue;
			}
			var key = normalizeKey(line.substring(0, separator).trim());
			var value = stripQuotes(line.substring(separator + 1).trim());
			if (key.isEmpty() || value.isEmpty()) {
				continue;
			}
			values.put(key, value);
		}
		return values;
	}

	private static String normalizeKey(String rawKey) {
		var key = rawKey.replaceAll("\\s+", " ").trim();
		var lower = key.toLowerCase(Locale.ROOT);
		var compact = lower.replace(" ", "");
		if (compact.contains("gemini") && compact.contains("key")) {
			return "GEMINI_API_KEY";
		}
		if (compact.contains("speechify") && (compact.contains("key") || compact.contains("api"))) {
			return "SPEECHIFY_API_KEY";
		}
		if (compact.contains("speechify") && compact.contains("voice")) {
			return "SPEECHIFY_VOICE_ID";
		}
		if ((compact.contains("mysql") || compact.contains("db")) && compact.contains("pass")) {
			return "DB_PASSWORD";
		}
		if ((compact.contains("mysql") || compact.contains("db")) && compact.contains("user")) {
			return "DB_USERNAME";
		}
		if ((compact.contains("mysql") || compact.contains("db")) && (compact.contains("url") || compact.contains("jdbc"))) {
			return "DB_URL";
		}
		return key.replace(' ', '_').toUpperCase(Locale.ROOT);
	}

	private static String stripQuotes(String value) {
		if (value.length() >= 2) {
			var first = value.charAt(0);
			var last = value.charAt(value.length() - 1);
			if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
				return value.substring(1, value.length() - 1).trim();
			}
		}
		return value;
	}

	private static boolean applyIfUnset(String key, String value) {
		var existingEnv = System.getenv(key);
		if ((existingEnv != null && !existingEnv.isBlank()) || !System.getProperty(key, "").isBlank()) {
			return false;
		}
		System.setProperty(key, value);
		return true;
	}
}
