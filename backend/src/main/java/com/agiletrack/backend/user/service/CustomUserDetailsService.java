package com.agiletrack.backend.user.service;

import com.agiletrack.backend.security.CustomUserDetails;
import com.agiletrack.backend.user.repository.UserRepository;
import lombok.AllArgsConstructor;
import lombok.NonNull;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(@NonNull String username)
            throws UsernameNotFoundException {

        return userRepository.findByEmail(username)
                .map(CustomUserDetails::new)
                .orElseThrow(() ->
                    new UsernameNotFoundException("Invalid email or password")
                );
    }
}
