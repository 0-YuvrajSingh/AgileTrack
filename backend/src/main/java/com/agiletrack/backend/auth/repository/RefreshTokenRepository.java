package com.agiletrack.backend.auth.repository;

import com.agiletrack.backend.auth.entity.RefreshToken;
import com.agiletrack.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByToken(String token);
    
    @Modifying
    int deleteByUser(User user);

    @Modifying
    int deleteByToken(String token);
}
