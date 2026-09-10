package com.agiletrack.backend.approval.repository;

import com.agiletrack.backend.approval.entity.ChangeApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChangeApprovalRepository extends JpaRepository<ChangeApproval, UUID> {

    Optional<ChangeApproval> findFirstByWorkItemIdOrderByCreatedAtDescIdDesc(UUID workItemId);

    List<ChangeApproval> findByWorkItemIdInOrderByCreatedAtDescIdDesc(List<UUID> workItemIds);

    List<ChangeApproval> findByWorkItemIdOrderByCreatedAtDesc(UUID workItemId);
}

