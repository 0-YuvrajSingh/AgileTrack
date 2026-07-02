package com.agiletrack.backend.project.repository;

import com.agiletrack.backend.project.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    Page<Project> findByWorkspaceId(UUID workspaceId, Pageable pageable);

    @Query("SELECT p FROM Project p WHERE p.workspace.id = :workspaceId AND LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Project> findByWorkspaceIdAndSearch(@Param("workspaceId") UUID workspaceId, @Param("search") String search, Pageable pageable);

    Optional<Project> findByIdAndWorkspaceId(UUID id, UUID workspaceId);
}
