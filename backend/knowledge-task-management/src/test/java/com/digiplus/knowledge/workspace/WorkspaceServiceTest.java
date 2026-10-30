package com.digiplus.knowledge.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class WorkspaceServiceTest {
	@Autowired
	private WorkspaceService workspaceService;

	@Test
	void persistsMeetingsTasksAndKnowledgeDocuments() {
		var meeting = new WorkspaceDtos.Meeting(
				"11111111-1111-4111-8111-111111111111", "Planning", "2026-10-30", "10:00 AM", "Product",
				"Discussed the next release.", "", List.of("JM", "SC"));
		var task = new WorkspaceDtos.Task(
				"22222222-2222-4222-8222-222222222222", "Share the plan", "Release", "Omkumar Sirmalwad",
				"2026-11-05", "To do", "High", "11111111-1111-4111-8111-111111111111");
		var document = new WorkspaceDtos.Document(
				"33333333-3333-4333-8333-333333333333", "Release notes", "Planning", "Decisions from planning.",
				"2026-10-30");

		var saved = workspaceService.saveWorkspace(new WorkspaceDtos.Workspace(
				List.of(meeting), List.of(task), List.of(document)));

		assertEquals(1, saved.meetings().size());
		assertEquals("Planning", saved.meetings().getFirst().title());
		assertEquals(List.of("JM", "SC"), saved.meetings().getFirst().attendees());
		assertEquals(1, saved.tasks().size());
		assertEquals("11111111-1111-4111-8111-111111111111", saved.tasks().getFirst().meetingId());
		assertEquals("Omkumar Sirmalwad", saved.tasks().getFirst().owner());
		assertEquals(1, saved.documents().size());
		assertEquals("Decisions from planning.", saved.documents().getFirst().description());
	}
}
