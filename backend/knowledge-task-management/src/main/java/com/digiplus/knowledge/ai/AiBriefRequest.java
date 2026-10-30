package com.digiplus.knowledge.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AiBriefRequest(
		@NotEmpty @Size(max = 25) List<@Valid MeetingContext> meetings,
		@Size(max = 100) List<@Valid TaskContext> tasks) {

	public record MeetingContext(
			@NotBlank @Size(max = 200) String title,
			@Size(max = 40) String date,
			@NotBlank @Size(max = 40000) String notes) {
	}

	public record TaskContext(
			@NotBlank @Size(max = 300) String title,
			@Size(max = 200) String owner,
			@Size(max = 40) String dueDate,
			@Size(max = 40) String status) {
	}
}
