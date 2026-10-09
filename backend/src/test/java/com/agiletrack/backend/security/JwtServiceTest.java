package com.agiletrack.backend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;
import java.util.Collections;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Phase 7 — the stateless access-token lifetime is configuration, and the
 * configuration is honored: a minted token expires {@code expirationMs}
 * after minting, and validation treats it accordingly.
 */
@DisplayName("JwtService — configured access-token lifetime")
class JwtServiceTest {

    private static final long EXPIRATION_MS = 3_600_000L;

    private JwtService jwtService;

    private User user(String username) {
        return new User(username, "pw", Collections.emptyList());
    }

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey",
                Base64.getEncoder().encodeToString(new byte[32]));
        ReflectionTestUtils.setField(jwtService, "expirationMs", EXPIRATION_MS);
        jwtService.validateSecretKey();
    }

    @Test
    @DisplayName("Minted token expires expirationMs after issuance")
    void generatedTokenExpiresAfterConfiguredLifetime() {
        long before = System.currentTimeMillis();

        String token = jwtService.generateToken(user("lifetime@test.com"));
        Date expiration = jwtService.extractClaim(token, claims -> claims.getExpiration());

        // JWT NumericDate has second resolution, so allow up to 1s of truncation.
        long skew = expiration.getTime() - before;
        assertThat(skew).isGreaterThanOrEqualTo(EXPIRATION_MS - 1_000L);
        assertThat(skew).isLessThan(EXPIRATION_MS + 60_000L);
        assertThat(jwtService.isTokenValid(user("lifetime@test.com"), token)).isTrue();
    }

    @Test
    @DisplayName("Negative lifetime produces a token rejected as expired at parse time")
    void negativeLifetimeTokenIsInvalid() {
        ReflectionTestUtils.setField(jwtService, "expirationMs", -1_000L);

        String token = jwtService.generateToken(user("expired@test.com"));

        assertThatThrownBy(() -> jwtService.extractUsername(token))
                .isInstanceOf(io.jsonwebtoken.ExpiredJwtException.class);
    }
}
