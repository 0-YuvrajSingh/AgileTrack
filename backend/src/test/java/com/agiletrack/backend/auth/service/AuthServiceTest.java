package com.agiletrack.backend.auth.service;

import com.agiletrack.backend.auth.dto.AuthResponse;
import com.agiletrack.backend.auth.dto.LoginRequest;
import com.agiletrack.backend.auth.dto.RegisterRequest;
import com.agiletrack.backend.auth.dto.TokenRefreshRequest;
import com.agiletrack.backend.auth.dto.TokenRefreshResponse;
import com.agiletrack.backend.auth.entity.RefreshToken;
import com.agiletrack.backend.common.exception.EmailAlreadyExistsException;
import com.agiletrack.backend.common.exception.TokenRefreshException;
import com.agiletrack.backend.security.CustomUserDetails;
import com.agiletrack.backend.security.JwtService;
import com.agiletrack.backend.user.entity.Role;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService — response contract")
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private RefreshTokenService refreshTokenService;

    @InjectMocks private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .password("encoded-pw")
                .role(Role.USER)
                .build();
    }

    // ── register ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("register: response carries accessToken, raw refreshToken, and user info")
    void register_returnsFullAuthResponse() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password")).thenReturn("encoded-pw");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateToken(any(CustomUserDetails.class))).thenReturn("access-token");
        // createRefreshToken now returns the raw string
        when(refreshTokenService.createRefreshToken(testUser.getId())).thenReturn("raw-refresh-token");

        AuthResponse response = authService.register(new RegisterRequest("user@example.com", "password"));

        assertThat(response.getToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("raw-refresh-token");
        assertThat(response.getUser().getEmail()).isEqualTo("user@example.com");
        assertThat(response.getUser().getRole()).isEqualTo("USER");
    }

    @Test
    @DisplayName("register: throws EmailAlreadyExistsException when email is taken")
    void register_throwsWhenEmailExists() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));

        assertThatThrownBy(() -> authService.register(new RegisterRequest("user@example.com", "pw")))
                .isInstanceOf(EmailAlreadyExistsException.class);

        verify(userRepository, never()).save(any());
    }

    // ── login ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("login: delegates to AuthenticationManager and returns tokens")
    void login_returnsAuthResponseOnValidCredentials() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(any(CustomUserDetails.class))).thenReturn("access-token");
        when(refreshTokenService.createRefreshToken(testUser.getId())).thenReturn("raw-refresh-token");

        AuthResponse response = authService.login(new LoginRequest("user@example.com", "password"));

        assertThat(response.getToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isEqualTo("raw-refresh-token");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    @DisplayName("login: propagates BadCredentialsException on wrong password")
    void login_propagatesBadCredentials() {
        doThrow(new BadCredentialsException("Bad credentials"))
                .when(authenticationManager).authenticate(any());

        assertThatThrownBy(() -> authService.login(new LoginRequest("user@example.com", "wrong")))
                .isInstanceOf(BadCredentialsException.class);
    }

    // ── refreshToken ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("refreshToken: returns new accessToken and rotated refreshToken")
    void refreshToken_returnsNewTokens() {
        RefreshToken storedToken = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .token("stored-hash")
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();

        when(refreshTokenService.findByToken("raw-old-refresh")).thenReturn(Optional.of(storedToken));
        when(refreshTokenService.verifyExpiration(storedToken)).thenReturn(storedToken);
        // rotateRefreshToken now returns the new raw string
        when(refreshTokenService.rotateRefreshToken(storedToken)).thenReturn("raw-new-refresh");
        when(jwtService.generateToken(any(CustomUserDetails.class))).thenReturn("new-access-token");

        TokenRefreshResponse response = authService.refreshToken(new TokenRefreshRequest("raw-old-refresh"));

        // The response DTO field is accessToken (not token)
        assertThat(response.getAccessToken()).isEqualTo("new-access-token");
        assertThat(response.getRefreshToken()).isEqualTo("raw-new-refresh");
    }

    @Test
    @DisplayName("refreshToken: throws TokenRefreshException when token is not found in DB")
    void refreshToken_throwsWhenTokenNotFound() {
        when(refreshTokenService.findByToken("unknown-token")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refreshToken(new TokenRefreshRequest("unknown-token")))
                .isInstanceOf(TokenRefreshException.class);
    }

    // ── logout ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("logout: passes raw token to RefreshTokenService.deleteByToken (hashing is its responsibility)")
    void logout_deletesRefreshToken() {
        authService.logout(new TokenRefreshRequest("raw-refresh-token"));

        verify(refreshTokenService).deleteByToken("raw-refresh-token");
    }
}

