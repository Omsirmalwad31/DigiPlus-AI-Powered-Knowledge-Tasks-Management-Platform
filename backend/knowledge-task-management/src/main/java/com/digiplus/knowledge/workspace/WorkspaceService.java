package com.digiplus.knowledge.workspace;

import com.digiplus.knowledge.workspace.WorkspaceDtos.Document;
import com.digiplus.knowledge.workspace.WorkspaceDtos.Meeting;
import com.digiplus.knowledge.workspace.WorkspaceDtos.Task;
import com.digiplus.knowledge.workspace.WorkspaceDtos.Workspace;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Service
public class WorkspaceService {
	private static final DateTimeFormatter TWELVE_HOUR_TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.US);
	private static final DateTimeFormatter DISPLAY_TIME = DateTimeFormatter.ofPattern("hh:mm a", Locale.US);
	private final JdbcClient jdbc;
	private final ObjectMapper objectMapper;

	public WorkspaceService(JdbcClient jdbc, ObjectMapper objectMapper) {
		this.jdbc = jdbc;
		this.objectMapper = objectMapper;
	}

	@Transactional(readOnly = true)
	public Workspace getWorkspace() {
		return new Workspace(listMeetings(), listTasks(), listDocuments());
	}

	@Transactional
	public Workspace saveWorkspace(Workspace workspace) {
		if (workspace.meetings() == null || workspace.tasks() == null || workspace.documents() == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Meetings, tasks, and documents are required.");
		}
		for (var meeting : workspace.meetings()) {
			saveMeeting(meeting);
		}
		for (var task : workspace.tasks()) {
			saveTask(task);
		}
		for (var document : workspace.documents()) {
			saveDocument(document);
		}
		return getWorkspace();
	}

	private List<Meeting> listMeetings() {
		return jdbc.sql("""
				SELECT meeting_id, title, starts_at, category, meeting_notes, ai_summary, attendees_json
				FROM meetings ORDER BY starts_at DESC, created_at DESC
				""").query(this::mapMeeting).list();
	}

	private Meeting mapMeeting(ResultSet result, int row) throws SQLException {
		try {
			var attendees = result.getString("attendees_json");
			var people = attendees == null || attendees.isBlank()
					? List.<String>of()
					: objectMapper.readValue(attendees, new TypeReference<List<String>>() { });
			var startsAt = result.getTimestamp("starts_at").toLocalDateTime();
			return new Meeting(
					result.getString("meeting_id"),
					result.getString("title"),
					startsAt.toLocalDate().toString(),
					startsAt.toLocalTime().format(DISPLAY_TIME),
					result.getString("category"),
					result.getString("meeting_notes"),
					result.getString("ai_summary"),
					people);
		} catch (JacksonException exception) {
			throw new SQLException("Could not read saved meeting participants.", exception);
		}
	}

	private List<Task> listTasks() {
		return jdbc.sql("""
				SELECT t.task_id, t.title, t.project, t.owner_name, t.due_date, t.status, t.priority, mt.meeting_id
				FROM tasks t
				LEFT JOIN meeting_tasks mt ON mt.task_id = t.task_id
				ORDER BY t.created_at DESC
				""").query((result, row) -> new Task(
						result.getString("task_id"),
						result.getString("title"),
						result.getString("project"),
						result.getString("owner_name"),
						result.getDate("due_date") == null ? "" : result.getDate("due_date").toLocalDate().toString(),
						result.getString("status"),
						result.getString("priority"),
						result.getString("meeting_id"))).list();
	}

	private List<Document> listDocuments() {
		return jdbc.sql("""
				SELECT document_id, title, document_type, description, created_at
				FROM knowledge_documents ORDER BY created_at DESC
				""").query((result, row) -> new Document(
						result.getString("document_id"),
						result.getString("title"),
						result.getString("document_type"),
						result.getString("description"),
						result.getTimestamp("created_at").toLocalDateTime().toLocalDate().toString())).list();
	}

	private void saveMeeting(Meeting meeting) {
		var id = validId(meeting.id());
		var start = LocalDateTime.of(parseDate(meeting.date()), parseTime(meeting.time()));
		var attendees = serialize(meeting.attendees() == null ? List.of() : meeting.attendees());
		jdbc.sql("""
				INSERT INTO meetings (meeting_id, title, meeting_notes, ai_summary, category, attendees_json, starts_at)
				VALUES (:id, :title, :notes, :summary, :category, :attendees, :startsAt)
				ON DUPLICATE KEY UPDATE title=VALUES(title), meeting_notes=VALUES(meeting_notes),
				  ai_summary=VALUES(ai_summary), category=VALUES(category), attendees_json=VALUES(attendees_json),
				  starts_at=VALUES(starts_at), updated_at=CURRENT_TIMESTAMP
				""")
				.param("id", id)
				.param("title", meeting.title())
				.param("notes", meeting.notes())
				.param("summary", meeting.summary())
				.param("category", defaultValue(meeting.category(), "General"))
				.param("attendees", attendees)
				.param("startsAt", start)
				.update();
	}

	private void saveTask(Task task) {
		var id = validId(task.id());
		var meetingId = task.meetingId() == null || task.meetingId().isBlank() ? null : validId(task.meetingId());
		var before = jdbc.sql("SELECT status, owner_name FROM tasks WHERE task_id = :id")
				.param("id", id)
				.query((result, row) -> new String[] { result.getString("status"), result.getString("owner_name") })
				.optional()
				.orElse(null);
		jdbc.sql("""
				INSERT INTO tasks (task_id, title, project, owner_name, due_date, status, priority)
				VALUES (:id, :title, :project, :owner, :dueDate, :status, :priority)
				ON DUPLICATE KEY UPDATE title=VALUES(title), project=VALUES(project), owner_name=VALUES(owner_name),
				  due_date=VALUES(due_date), status=VALUES(status), priority=VALUES(priority), updated_at=CURRENT_TIMESTAMP
				""")
				.param("id", id)
				.param("title", task.title())
				.param("project", defaultValue(task.project(), "General"))
				.param("owner", task.owner())
				.param("dueDate", task.due() == null || task.due().isBlank() ? null : parseDate(task.due()))
				.param("status", task.status())
				.param("priority", task.priority())
				.update();
		if (meetingId != null) {
			var exists = jdbc.sql("SELECT COUNT(*) FROM meetings WHERE meeting_id = :id")
					.param("id", meetingId).query(Long.class).single();
			if (exists == 0) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Task references an unknown meeting.");
			}
		}
		jdbc.sql("DELETE FROM meeting_tasks WHERE task_id = :id").param("id", id).update();
		if (meetingId != null) {
			jdbc.sql("""
					INSERT INTO meeting_tasks (meeting_id, task_id)
					VALUES (:meetingId, :taskId)
					""").param("meetingId", meetingId).param("taskId", id).update();
		}
		if (before == null) {
			saveTaskHistory(id, "CREATED", null, task.status());
		} else {
			if (!before[0].equals(task.status())) saveTaskHistory(id, "STATUS", before[0], task.status());
			if (!java.util.Objects.equals(before[1], task.owner())) saveTaskHistory(id, "OWNER", before[1], task.owner());
		}
	}

	private void saveTaskHistory(String taskId, String type, String previous, String next) {
		jdbc.sql("""
				INSERT INTO task_history (history_id, task_id, change_type, previous_value, new_value, changed_at)
				VALUES (:historyId, :taskId, :changeType, :previousValue, :newValue, CURRENT_TIMESTAMP)
				""")
				.param("historyId", UUID.randomUUID().toString())
				.param("taskId", taskId)
				.param("changeType", type)
				.param("previousValue", previous)
				.param("newValue", next)
				.update();
	}

	private void saveDocument(Document document) {
		jdbc.sql("""
				INSERT INTO knowledge_documents (document_id, title, document_type, description)
				VALUES (:id, :title, :type, :description)
				ON DUPLICATE KEY UPDATE title=VALUES(title), document_type=VALUES(document_type),
				  description=VALUES(description), updated_at=CURRENT_TIMESTAMP
				""")
				.param("id", validId(document.id()))
				.param("title", document.title())
				.param("type", defaultValue(document.category(), "Team notes"))
				.param("description", document.description())
				.update();
	}

	private String validId(String value) {
		if (value == null || value.isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Record IDs cannot be empty.");
		}
		try {
			return UUID.fromString(value).toString();
		} catch (IllegalArgumentException exception) {
			return UUID.nameUUIDFromBytes(value.getBytes(StandardCharsets.UTF_8)).toString();
		}
	}

	private LocalDate parseDate(String value) {
		try {
			return LocalDate.parse(value);
		} catch (DateTimeParseException | NullPointerException exception) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dates must use the YYYY-MM-DD format.");
		}
	}

	private LocalTime parseTime(String value) {
		if (value == null || value.isBlank()) return LocalTime.of(9, 0);
		try {
			return LocalTime.parse(value);
		} catch (DateTimeParseException ignored) {
			try {
				return LocalTime.parse(value.toUpperCase(), TWELVE_HOUR_TIME);
			} catch (DateTimeParseException exception) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Meeting times must use HH:mm or h:mm AM/PM.");
			}
		}
	}

	private String serialize(Object value) {
		try {
			return objectMapper.writeValueAsString(value);
		} catch (JacksonException exception) {
			throw new IllegalStateException("Could not serialize workspace data.", exception);
		}
	}

	private String defaultValue(String value, String fallback) {
		return value == null || value.isBlank() ? fallback : value;
	}
}
