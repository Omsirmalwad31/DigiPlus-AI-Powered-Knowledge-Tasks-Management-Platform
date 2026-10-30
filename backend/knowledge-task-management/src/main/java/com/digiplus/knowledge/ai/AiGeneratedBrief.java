package com.digiplus.knowledge.ai;

import java.util.List;
import java.util.Objects;

public record AiGeneratedBrief(
		String overview,
		List<String> discussionPoints,
		List<String> decisions,
		List<ActionItem> actionItems,
		List<String> openTasks,
		List<String> questions) {

	public AiGeneratedBrief {
		discussionPoints = cleanText(discussionPoints);
		decisions = cleanText(decisions);
		actionItems = actionItems == null ? List.of() : actionItems.stream().filter(Objects::nonNull).toList();
		openTasks = cleanText(openTasks);
		questions = cleanText(questions);
	}

	public record ActionItem(String description, String suggestedOwner, String dueDate) {
		public ActionItem {
			description = description == null ? "" : description;
			suggestedOwner = suggestedOwner == null ? "" : suggestedOwner;
			dueDate = dueDate == null ? "" : dueDate;
		}
	}

	private static List<String> cleanText(List<String> values) {
		return values == null ? List.of() : values.stream().filter(Objects::nonNull).toList();
	}
}
