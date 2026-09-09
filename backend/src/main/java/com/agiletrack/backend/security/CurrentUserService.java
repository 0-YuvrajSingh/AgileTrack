package com.agiletrack.backend.security;

import com.agiletrack.backend.user.entity.User;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Single point of truth for resolving the authenticated {@link User}
 * from Spring Security's context.
 *
 * Previously, {@code WorkspaceService} and {@code TaskService} each
 * contained an identical private {@code getCurrentUser()} method.
 * Duplicating security-sensitive logic violates DRY and makes the
 * behaviour harder to test. This component is the canonical replacement.
 */
@Component
public class CurrentUserService {

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            throw new AccessDeniedException("Access denied");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getUser();
        }

        if (principal instanceof User user) {
            return user;
        }

        throw new AccessDeniedException("Access denied");
    }
}

