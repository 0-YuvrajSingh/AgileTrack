package com.agiletrack.backend.auth.service;

import com.agiletrack.backend.auth.dto.AuthResponse;
import com.agiletrack.backend.auth.dto.LoginRequest;
import com.agiletrack.backend.auth.dto.RegisterRequest;
import com.agiletrack.backend.common.exception.EmailAlreadyExistsException;
import com.agiletrack.backend.common.exception.UserNotFoundException;
import com.agiletrack.backend.user.entity.Role;
import com.agiletrack.backend.user.entity.User;
import com.agiletrack.backend.user.repository.UserRepository;
import com.agiletrack.backend.security.JwtService;
import com.agiletrack.backend.auth.dto.TokenRefreshRequest;
import com.agiletrack.backend.auth.dto.TokenRefreshResponse;
import com.agiletrack.backend.auth.entity.RefreshToken;
import com.agiletrack.backend.common.exception.TokenRefreshException;
import com.agiletrack.backend.security.CustomUserDetails;

import lombok.RequiredArgsConstructor;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenService refreshTokenService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new EmailAlreadyExistsException("Email already exists");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .build();
        userRepository.save(user);
        String jwtToken = jwtService.generateToken(new CustomUserDetails(user));
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        return AuthResponse.builder()
                .token(jwtToken)
                .refreshToken(refreshToken.getToken())
                .user(AuthResponse.UserDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .role(user.getRole().name())
                        .build())
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        String jwtToken = jwtService.generateToken(new CustomUserDetails(user));
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        return AuthResponse.builder()
                .token(jwtToken)
                .refreshToken(refreshToken.getToken())
                .user(AuthResponse.UserDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .role(user.getRole().name())
                        .build())
                .build();
    }

    @Transactional
    public TokenRefreshResponse refreshToken(TokenRefreshRequest request) {
        String requestRefreshToken = request.getRefreshToken();

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(refreshToken -> {
                    User user = refreshToken.getUser();
                    String token = jwtService.generateToken(new CustomUserDetails(user));
                    RefreshToken rotatedRefreshToken = refreshTokenService.rotateRefreshToken(refreshToken);
                    return new TokenRefreshResponse(token, rotatedRefreshToken.getToken());
                })
                .orElseThrow(() -> new TokenRefreshException("Refresh token is not in database!"));
    }

    @Transactional
    public void logout(TokenRefreshRequest request) {
        refreshTokenService.deleteByToken(request.getRefreshToken());
    }
}
