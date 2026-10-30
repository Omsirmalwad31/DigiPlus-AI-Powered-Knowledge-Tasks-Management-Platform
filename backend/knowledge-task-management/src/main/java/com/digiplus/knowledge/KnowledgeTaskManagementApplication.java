package com.digiplus.knowledge;

import com.digiplus.knowledge.config.LocalEnvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class KnowledgeTaskManagementApplication {

	public static void main(String[] args) {
		LocalEnvLoader.load();
		SpringApplication.run(KnowledgeTaskManagementApplication.class, args);
	}

}
