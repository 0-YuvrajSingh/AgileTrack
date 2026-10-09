package com.agiletrack.backend.auth.service;

import com.agiletrack.backend.auth.dto.AuthResponse;
import com.agiletrack.backend.auth.dto.LoginRequest;
import com.agiletrack.backend.auth.dto.RegisterRequest;
import com.agiletrack.backend.common.exception.EmailAlreadyExistsException;
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
    @DisplayName("register: response carries accessToken and user info")
    void register_returnsFullAuthResponse() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password")).thenReturn("encoded-pw");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateToken(any(CustomUserDetails.class))).thenReturn("access-token");

        AuthResponse response = authService.register(new RegisterRequest("user@example.com", "password"));

        assertThat(response.getToken()).isEqualTo("access-token");
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
    @DisplayName("login: delegates to AuthenticationManager and returns an access token")
    void login_returnsAuthResponseOnValidCredentials() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(any(CustomUserDetails.class))).thenReturn("access-token");

        AuthResponse response = authService.login(new LoginRequest("user@example.com", "password"));

        assertThat(response.getToken()).isEqualTo("access-token");
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
}

