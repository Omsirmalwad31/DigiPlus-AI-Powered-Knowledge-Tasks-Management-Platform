package com.digiplus.knowledge;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class KnowledgeTaskManagementApplicationTests {

	private static final String VERCEL_ORIGIN = "https://digi-plus-ai-powered-knowledge-task-seven.vercel.app";

	@Autowired
	private MockMvc mockMvc;

	@Test
	void contextLoads() {
	}

	@Test
	void allowsPreflightRequestsFromTheDeployedFrontend() throws Exception {
		mockMvc.perform(options("/api/workspace")
						.header("Origin", VERCEL_ORIGIN)
						.header("Access-Control-Request-Method", "GET"))
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", VERCEL_ORIGIN));
	}

	@Test
	void rejectsPreflightRequestsFromUnlistedOrigins() throws Exception {
		mockMvc.perform(options("/api/workspace")
						.header("Origin", "https://example.com")
						.header("Access-Control-Request-Method", "GET"))
				.andExpect(status().isForbidden());
	}

}
