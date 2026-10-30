CREATE TABLE IF NOT EXISTS users (
  user_id CHAR(36) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'MEMBER',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meetings (
  meeting_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  agenda TEXT NULL,
  meeting_notes LONGTEXT NULL,
  ai_summary LONGTEXT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  attendees_json JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
  starts_at DATETIME NULL,
  created_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_id),
  KEY ix_meetings_starts_at (starts_at),
  KEY ix_meetings_status (status),
  CONSTRAINT fk_meetings_created_by FOREIGN KEY (created_by)
    REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meeting_participants (
  meeting_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  attendance_status VARCHAR(32) NOT NULL DEFAULT 'INVITED',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_id, user_id),
  KEY ix_meeting_participants_user (user_id),
  CONSTRAINT fk_meeting_participants_meeting FOREIGN KEY (meeting_id)
    REFERENCES meetings (meeting_id) ON DELETE CASCADE,
  CONSTRAINT fk_meeting_participants_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS decisions (
  decision_id CHAR(36) NOT NULL,
  meeting_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  decided_at DATETIME NULL,
  recorded_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (decision_id),
  KEY ix_decisions_meeting (meeting_id),
  CONSTRAINT fk_decisions_meeting FOREIGN KEY (meeting_id)
    REFERENCES meetings (meeting_id),
  CONSTRAINT fk_decisions_recorded_by FOREIGN KEY (recorded_by)
    REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  task_id CHAR(36) NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT NULL,
  owner_id CHAR(36) NULL,
  created_by CHAR(36) NULL,
  due_date DATE NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'TODO',
  priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
  project VARCHAR(200) NOT NULL DEFAULT 'General',
  owner_name VARCHAR(160) NULL,
  outcome TEXT NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id),
  KEY ix_tasks_owner_status (owner_id, status),
  KEY ix_tasks_due_status (due_date, status),
  KEY ix_tasks_created_by (created_by),
  CONSTRAINT fk_tasks_owner FOREIGN KEY (owner_id)
    REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by)
    REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meeting_tasks (
  meeting_id CHAR(36) NOT NULL,
  task_id CHAR(36) NOT NULL,
  carried_forward BOOLEAN NOT NULL DEFAULT FALSE,
  linked_by CHAR(36) NULL,
  linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_id, task_id),
  KEY ix_meeting_tasks_task (task_id),
  CONSTRAINT fk_meeting_tasks_meeting FOREIGN KEY (meeting_id)
    REFERENCES meetings (meeting_id),
  CONSTRAINT fk_meeting_tasks_task FOREIGN KEY (task_id)
    REFERENCES tasks (task_id),
  CONSTRAINT fk_meeting_tasks_linked_by FOREIGN KEY (linked_by)
    REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS task_history (
  history_id CHAR(36) NOT NULL,
  task_id CHAR(36) NOT NULL,
  meeting_id CHAR(36) NULL,
  changed_by CHAR(36) NULL,
  change_type VARCHAR(40) NOT NULL,
  previous_value TEXT NULL,
  new_value TEXT NULL,
  note TEXT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (history_id),
  KEY ix_task_history_task_changed (task_id, changed_at),
  KEY ix_task_history_meeting (meeting_id),
  CONSTRAINT fk_task_history_task FOREIGN KEY (task_id)
    REFERENCES tasks (task_id),
  CONSTRAINT fk_task_history_meeting FOREIGN KEY (meeting_id)
    REFERENCES meetings (meeting_id) ON DELETE SET NULL,
  CONSTRAINT fk_task_history_changed_by FOREIGN KEY (changed_by)
    REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS knowledge_documents (
  document_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  content LONGTEXT NULL,
  document_type VARCHAR(80) NOT NULL DEFAULT 'NOTE',
  source_url VARCHAR(2048) NULL,
  metadata JSON NULL,
  uploaded_by CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id),
  KEY ix_knowledge_documents_type_created (document_type, created_at),
  FULLTEXT KEY ft_knowledge_documents_text (title, description, content),
  CONSTRAINT fk_knowledge_documents_uploaded_by FOREIGN KEY (uploaded_by)
    REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS knowledge_links (
  link_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  task_id CHAR(36) NULL,
  meeting_id CHAR(36) NULL,
  decision_id CHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (link_id),
  UNIQUE KEY uq_knowledge_link_task (document_id, task_id),
  UNIQUE KEY uq_knowledge_link_meeting (document_id, meeting_id),
  UNIQUE KEY uq_knowledge_link_decision (document_id, decision_id),
  CONSTRAINT fk_knowledge_links_document FOREIGN KEY (document_id)
    REFERENCES knowledge_documents (document_id) ON DELETE CASCADE,
  CONSTRAINT fk_knowledge_links_task FOREIGN KEY (task_id)
    REFERENCES tasks (task_id) ON DELETE CASCADE,
  CONSTRAINT fk_knowledge_links_meeting FOREIGN KEY (meeting_id)
    REFERENCES meetings (meeting_id) ON DELETE CASCADE,
  CONSTRAINT fk_knowledge_links_decision FOREIGN KEY (decision_id)
    REFERENCES decisions (decision_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS handover_records (
  handover_id CHAR(36) NOT NULL,
  title VARCHAR(200) NOT NULL,
  outgoing_owner_id CHAR(36) NULL,
  incoming_owner_id CHAR(36) NULL,
  created_by CHAR(36) NULL,
  brief LONGTEXT NULL,
  unresolved_questions TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  PRIMARY KEY (handover_id),
  KEY ix_handovers_incoming_status (incoming_owner_id, status),
  KEY ix_handovers_created_at (created_at),
  CONSTRAINT fk_handovers_outgoing_owner FOREIGN KEY (outgoing_owner_id)
    REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_handovers_incoming_owner FOREIGN KEY (incoming_owner_id)
    REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_handovers_created_by FOREIGN KEY (created_by)
    REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS handover_tasks (
  handover_id CHAR(36) NOT NULL,
  task_id CHAR(36) NOT NULL,
  included_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (handover_id, task_id),
  KEY ix_handover_tasks_task (task_id),
  CONSTRAINT fk_handover_tasks_handover FOREIGN KEY (handover_id)
    REFERENCES handover_records (handover_id) ON DELETE CASCADE,
  CONSTRAINT fk_handover_tasks_task FOREIGN KEY (task_id)
    REFERENCES tasks (task_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_logs (
  ai_log_id CHAR(36) NOT NULL,
  request_id VARCHAR(80) NULL,
  operation VARCHAR(48) NOT NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'GEMINI',
  model VARCHAR(80) NULL,
  outcome VARCHAR(24) NOT NULL,
  duration_ms BIGINT UNSIGNED NULL,
  input_tokens INT UNSIGNED NULL,
  output_tokens INT UNSIGNED NULL,
  error_code VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ai_log_id),
  KEY ix_ai_logs_request (request_id),
  KEY ix_ai_logs_operation_created (operation, created_at),
  KEY ix_ai_logs_outcome_created (outcome, created_at)
) ENGINE=InnoDB;
