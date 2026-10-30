package com.digiplus.knowledge.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SpeechifyRequest(
		@NotBlank @Size(max = 2000) String text) {
}
