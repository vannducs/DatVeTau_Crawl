package com.booktrain_crawl.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.booktrain_crawl.entity.User;
import com.booktrain_crawl.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier)
        throws UsernameNotFoundException{

        User user = userRepository.findByEmailOrPhoneNumber(identifier, identifier).orElseThrow(
                ()-> new UsernameNotFoundException("Không tìm thấy tài khoản! "+ identifier));

        if ("locked".equals(user.getStatus()))
            throw new LockedException("Tài khoản đã bị khóa!");

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities("ROLE_"+user.getAccountType().toUpperCase())
                .build();


    }

}
