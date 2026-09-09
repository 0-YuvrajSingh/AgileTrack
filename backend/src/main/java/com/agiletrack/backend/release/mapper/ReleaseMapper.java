package com.agiletrack.backend.release.mapper;

import com.agiletrack.backend.release.dto.ReleaseResponse;
import com.agiletrack.backend.release.entity.Release;
import org.springframework.stereotype.Component;

@Component
public class ReleaseMapper {

    public ReleaseResponse toResponse(Release release) {
        return new ReleaseResponse(
                release.getId(),
                release.getName(),
                release.getReleaseVersion(),
                release.getProject().getId(),
                release.getLifecycleState(),
                release.getTargetDate(),
                !release.getLifecycleState().allowsScopeChange(),
                release.getLifecycleState().allowsFieldEdit(),
                release.getCreatedAt(),
                release.getUpdatedAt(),
                release.getVersion()
        );
    }
}
