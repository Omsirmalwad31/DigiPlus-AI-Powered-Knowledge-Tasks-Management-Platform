package com.digiplus.knowledge.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class LocalEnvLoaderTest {

	@Test
	void parsesStandardAndLabeledEnvEntries() {
		var values = LocalEnvLoader.parse("""
				# comment
				GEMINI_API_KEY=AIzaExample
				gemini API Key : AQ.ExampleAuthKey
				Speechify api : sk_example
				My Sql pass : secret
				""");

		assertEquals("AQ.ExampleAuthKey", values.get("GEMINI_API_KEY"));
		assertEquals("sk_example", values.get("SPEECHIFY_API_KEY"));
		assertEquals("secret", values.get("DB_PASSWORD"));
	}
}
