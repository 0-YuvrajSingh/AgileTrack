package com.agiletrack.backend.auth.service;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Deterministic, one-way hasher for refresh tokens.
 *
 * SHA-256 is used intentionally over BCrypt because refresh-token
 * lookup must be exact-match and constant-time from the database
 * perspective. BCrypt produces different hashes for the same input,
 * requiring a full table scan + BCrypt.matches() — unacceptable at scale.
 *
 * A raw refresh token is a UUID string (sufficient entropy). Its
 * SHA-256 hash is a 64-character lowercase hex string stored in the DB.
 * A database compromise therefore does not yield usable credentials.
 */
@Component
public class RefreshTokenHasher {

    public String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is mandated by the Java SE spec — this cannot happen.
            throw new IllegalStateException("SHA-256 is unavailable on this JVM", e);
        }
    }
}

