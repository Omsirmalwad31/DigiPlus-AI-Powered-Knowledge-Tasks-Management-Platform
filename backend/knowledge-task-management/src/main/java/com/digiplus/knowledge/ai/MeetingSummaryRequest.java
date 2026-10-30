package com.digiplus.knowledge.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MeetingSummaryRequest(
		@NotBlank @Size(max = 200) String title,
		@NotBlank @Size(max = 40000) String notes) {
}
