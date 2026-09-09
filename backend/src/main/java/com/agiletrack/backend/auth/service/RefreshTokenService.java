package com.agiletrack.backend.auth.service;

import com.agiletrack.backend.auth.entity.RefreshToken;
import com.agiletrack.backend.auth.repository.RefreshTokenRepository;
import com.agiletrack.backend.common.exception.TokenRefreshException;
import com.agiletrack.backend.common.exception.UserNotFoundException;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Manages the refresh-token lifecycle.
 *
 * Security invariant: tokens are stored as SHA-256 hashes (64 hex chars).
 * The raw UUID string is returned to callers once and never persisted.
 * A database dump therefore does not yield usable credentials.
 *
 * Token rotation is enforced: every successful refresh replaces the
 * stored hash, making the previously issued raw token permanently invalid.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    @Value("${jwt.refresh.expiration:604800000}")
    private Long refreshTokenDurationMs;

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final RefreshTokenHasher refreshTokenHasher;

    /**
     * Creates a new refresh token for the given user, invalidating any
     * previous token for that user (one-active-token-per-user policy).
     *
     * @return the raw token to be sent to the client — never stored in the DB
     */
    @Transactional
    public String createRefreshToken(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        refreshTokenRepository.deleteByUser(user);

        String rawToken = UUID.randomUUID().toString();

        RefreshToken entity = RefreshToken.builder()
                .user(user)
                .token(refreshTokenHasher.hash(rawToken))
                .expiryDate(Instant.now().plusMillis(refreshTokenDurationMs))
                .build();

        refreshTokenRepository.save(entity);

        return rawToken;
    }

    /**
     * Looks up a refresh token by its raw value.
     * Hashes before querying so the repository always sees only hashes.
     */
    public Optional<RefreshToken> findByToken(String rawToken) {
        return refreshTokenRepository.findByToken(refreshTokenHasher.hash(rawToken));
    }

    /**
     * Validates expiry. Deletes the token and throws if expired.
     */
    @Transactional
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(token);
            throw new TokenRefreshException("Refresh token was expired. Please make a new signin request");
        }
        return token;
    }

    /**
     * Rotates the token: deletes the old entity, creates a new one.
     *
     * @return the new raw token to be sent to the client
     */
    @Transactional
    public String rotateRefreshToken(RefreshToken oldToken) {
        User user = oldToken.getUser();
        refreshTokenRepository.delete(oldToken);

        String rawToken = UUID.randomUUID().toString();

        RefreshToken newEntity = RefreshToken.builder()
                .user(user)
                .token(refreshTokenHasher.hash(rawToken))
                .expiryDate(Instant.now().plusMillis(refreshTokenDurationMs))
                .build();

        refreshTokenRepository.save(newEntity);

        return rawToken;
    }

    /**
     * Deletes by raw token value (hashes before deletion).
     */
    @Transactional
    public void deleteByToken(String rawToken) {
        refreshTokenRepository.deleteByToken(refreshTokenHasher.hash(rawToken));
    }

    @Transactional
    public void deleteByUserId(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        refreshTokenRepository.deleteByUser(user);
    }
}
