package com.digiplus.knowledge.workspace;

import com.digiplus.knowledge.workspace.WorkspaceDtos.Workspace;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspace")
public class WorkspaceController {
	private static final Logger log = LoggerFactory.getLogger(WorkspaceController.class);
	private final WorkspaceService workspaceService;

	public WorkspaceController(WorkspaceService workspaceService) {
		this.workspaceService = workspaceService;
	}

	@GetMapping
	public Workspace getWorkspace() {
		return workspaceService.getWorkspace();
	}

	@PutMapping
	public Workspace saveWorkspace(@Valid @RequestBody Workspace workspace) {
		log.info("Saving workspace to SQL; requestId={}", MDC.get("requestId"));
		return workspaceService.saveWorkspace(workspace);
	}
}
