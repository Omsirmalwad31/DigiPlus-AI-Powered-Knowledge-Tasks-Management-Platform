package com.digiplus.knowledge.ai;

import java.util.List;
import java.util.Objects;

public record AiMeetingMinutes(
		String transcript,
		String overview,
		List<String> discussionPoints,
		List<String> decisions,
		List<AiGeneratedBrief.ActionItem> actionItems,
		List<String> risks,
		List<String> openTasks,
		List<String> questions) {

	public AiMeetingMinutes {
		transcript = transcript == null ? "" : transcript;
		overview = overview == null ? "" : overview;
		discussionPoints = cleanText(discussionPoints);
		decisions = cleanText(decisions);
		actionItems = actionItems == null ? List.of() : actionItems.stream().filter(Objects::nonNull).toList();
		risks = cleanText(risks);
		openTasks = cleanText(openTasks);
		questions = cleanText(questions);
	}

	private static List<String> cleanText(List<String> values) {
		return values == null ? List.of() : values.stream().filter(Objects::nonNull).toList();
	}
}
