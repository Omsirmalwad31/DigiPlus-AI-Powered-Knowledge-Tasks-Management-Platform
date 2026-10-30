package com.digiplus.knowledge.workspace;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class WorkspaceDtos {
	private WorkspaceDtos() {
	}

	public record Workspace(
			@Valid List<Meeting> meetings,
			@Valid List<Task> tasks,
			@Valid List<Document> documents) {
	}

	public record Meeting(
			@NotBlank @Size(max = 36) String id,
			@NotBlank @Size(max = 200) String title,
			@NotBlank @Size(max = 10) String date,
			@Size(max = 20) String time,
			@Size(max = 100) String category,
			@Size(max = 200000) String notes,
			@Size(max = 200000) String summary,
			@Size(max = 50) List<@Size(max = 20) String> attendees) {
	}

	public record Task(
			@NotBlank @Size(max = 36) String id,
			@NotBlank @Size(max = 300) String title,
			@Size(max = 200) String project,
			@Size(max = 160) String owner,
			@Size(max = 10) String due,
			@NotBlank @Size(max = 32) String status,
			@NotBlank @Size(max = 16) String priority,
			@Size(max = 36) String meetingId) {
	}

	public record Document(
			@NotBlank @Size(max = 36) String id,
			@NotBlank @Size(max = 255) String title,
			@Size(max = 100) String category,
			@Size(max = 40000) String description,
			@NotNull @Size(max = 10) String date) {
	}
}
