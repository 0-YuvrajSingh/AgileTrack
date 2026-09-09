package com.agiletrack.backend.auth.service;

import com.agiletrack.backend.auth.entity.RefreshToken;
import com.agiletrack.backend.auth.repository.RefreshTokenRepository;
import com.agiletrack.backend.common.exception.TokenRefreshException;
import com.agiletrack.backend.user.entity.Role;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenService — hashing invariants")
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UserRepository userRepository;

    // Use a real hasher — the tests verify the hashing property itself
    @Spy
    private RefreshTokenHasher refreshTokenHasher;

    @InjectMocks
    private RefreshTokenService refreshTokenService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .password("encoded-password")
                .role(Role.USER)
                .build();

        // Wire the @Value field that Spring would normally inject
        org.springframework.test.util.ReflectionTestUtils.setField(
                refreshTokenService, "refreshTokenDurationMs", 604800000L);
    }

    // ── createRefreshToken ────────────────────────────────────────────────────

    @Test
    @DisplayName("returns a raw UUID-format token — not the 64-char hash")
    void createRefreshToken_returnsRawToken() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        String rawToken = refreshTokenService.createRefreshToken(testUser.getId());

        // UUID string is 36 chars; hash is 64 hex chars
        assertThat(rawToken).hasSize(36);
        assertThat(rawToken).doesNotMatch("[0-9a-f]{64}");
    }

    @Test
    @DisplayName("stores a 64-char hex SHA-256 hash — never the raw token")
    void createRefreshToken_storesHashedToken() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        RefreshToken[] captured = new RefreshToken[1];
        when(refreshTokenRepository.save(any(RefreshToken.class))).thenAnswer(inv -> {
            captured[0] = inv.getArgument(0);
            return captured[0];
        });

        String rawToken = refreshTokenService.createRefreshToken(testUser.getId());

        assertThat(captured[0].getToken())
                .as("stored token must be a 64-char lowercase hex SHA-256 hash")
                .hasSize(64)
                .matches("[0-9a-f]{64}");

        assertThat(captured[0].getToken())
                .as("stored hash must differ from the returned raw token")
                .isNotEqualTo(rawToken);

        assertThat(captured[0].getToken())
                .as("stored hash must equal hash(rawToken)")
                .isEqualTo(refreshTokenHasher.hash(rawToken));
    }

    @Test
    @DisplayName("deletes previous tokens before creating a new one")
    void createRefreshToken_deletesExistingTokensFirst() {
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        refreshTokenService.createRefreshToken(testUser.getId());

        verify(refreshTokenRepository).deleteByUser(testUser);
    }

    // ── findByToken ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("hashes the raw token before querying the repository")
    void findByToken_hashesBeforeLookup() {
        String rawToken = "raw-lookup-token";
        String expectedHash = refreshTokenHasher.hash(rawToken);

        when(refreshTokenRepository.findByToken(expectedHash)).thenReturn(Optional.empty());

        refreshTokenService.findByToken(rawToken);

        verify(refreshTokenRepository).findByToken(expectedHash);
        verify(refreshTokenRepository, never()).findByToken(rawToken);
    }

    // ── verifyExpiration ──────────────────────────────────────────────────────

    @Test
    @DisplayName("returns the token unchanged when it is not expired")
    void verifyExpiration_returnsTokenWhenValid() {
        RefreshToken token = buildToken(Instant.now().plusSeconds(3600));

        RefreshToken result = refreshTokenService.verifyExpiration(token);

        assertThat(result).isSameAs(token);
        verify(refreshTokenRepository, never()).delete(any());
    }

    @Test
    @DisplayName("deletes and throws when token is expired")
    void verifyExpiration_deletesAndThrowsForExpiredToken() {
        RefreshToken expired = buildToken(Instant.now().minusSeconds(1));

        assertThatThrownBy(() -> refreshTokenService.verifyExpiration(expired))
                .isInstanceOf(TokenRefreshException.class)
                .hasMessageContaining("expired");

        verify(refreshTokenRepository).delete(expired);
    }

    // ── rotateRefreshToken ────────────────────────────────────────────────────

    @Test
    @DisplayName("returns a new raw UUID-format token")
    void rotateRefreshToken_returnsNewRawToken() {
        RefreshToken old = buildToken(Instant.now().plusSeconds(3600));
        old.setUser(testUser);
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String newRaw = refreshTokenService.rotateRefreshToken(old);

        assertThat(newRaw).hasSize(36);
    }

    @Test
    @DisplayName("deletes old token and stores hash of the new token")
    void rotateRefreshToken_deletesOldAndStoresNewHash() {
        RefreshToken old = buildToken(Instant.now().plusSeconds(3600));
        old.setUser(testUser);

        RefreshToken[] captured = new RefreshToken[1];
        when(refreshTokenRepository.save(any())).thenAnswer(inv -> {
            captured[0] = inv.getArgument(0);
            return captured[0];
        });

        String newRaw = refreshTokenService.rotateRefreshToken(old);

        verify(refreshTokenRepository).delete(old);
        assertThat(captured[0].getToken()).hasSize(64).matches("[0-9a-f]{64}");
        assertThat(captured[0].getToken()).isEqualTo(refreshTokenHasher.hash(newRaw));
        assertThat(captured[0].getToken()).isNotEqualTo(newRaw);
    }

    // ── deleteByToken ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("hashes the raw token before calling deleteByToken on the repository")
    void deleteByToken_hashesBeforeDelete() {
        String rawToken = "token-to-delete";
        String expectedHash = refreshTokenHasher.hash(rawToken);

        refreshTokenService.deleteByToken(rawToken);

        verify(refreshTokenRepository).deleteByToken(expectedHash);
        verify(refreshTokenRepository, never()).deleteByToken(rawToken);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private RefreshToken buildToken(Instant expiry) {
        return RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .token("some-stored-hash-value")
                .expiryDate(expiry)
                .build();
    }
}

