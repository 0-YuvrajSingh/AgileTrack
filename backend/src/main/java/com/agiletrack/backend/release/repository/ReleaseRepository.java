package com.agiletrack.backend.release.repository;

import com.agiletrack.backend.release.entity.Release;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReleaseRepository extends JpaRepository<Release, UUID> {

    Page<Release> findByProjectId(UUID projectId, Pageable pageable);

    /**
     * Scoped lookup. Fetching by id alone would let a caller reach a release in another project
     * simply by knowing its UUID.
     */
    Optional<Release> findByIdAndProjectId(UUID id, UUID projectId);

    boolean existsByProjectIdAndName(UUID projectId, String name);
}
