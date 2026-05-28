package com.booktrain_crawl.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.booktrain_crawl.dto.AuthResponse;
import com.booktrain_crawl.dto.LoginRequest;
import com.booktrain_crawl.dto.RegisterRequest;
import com.booktrain_crawl.entity.User;
import com.booktrain_crawl.repository.UserRepository;
import com.booktrain_crawl.security.JwtUtils;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        User user = userRepository
                .findByEmailOrPhoneNumber(request.getIdentifier(), request.getIdentifier())
                .orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().message("Thông tin đăng nhập không đúng!").build());
        }

        if ("locked".equals(user.getStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AuthResponse.builder().message("Tài khoản đã bị khóa!").build());
        }

        if ("pending".equals(user.getStatus())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(AuthResponse.builder().message("Tài khoản chưa được kích hoạt!").build());
        }

        String token = jwtUtils.generateToken(user.getEmail());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth() != null
                        ? user.getDateOfBirth().toString() : null)
                .accountType(user.getAccountType())
                .status(user.getStatus())
                .avatarUrl(user.getAvatarUrl())
                .message("Đăng nhập thành công!")
                .build());
    }

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest()
                    .body(AuthResponse.builder().message("Email đã được sử dụng!").build());
        }

        if (request.getPhoneNumber() != null
                && userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            return ResponseEntity.badRequest()
                    .body(AuthResponse.builder().message("Số điện thoại đã được sử dụng!").build());
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .dateOfBirth(request.getDateOfBirth() != null
                        ? java.time.LocalDate.parse(request.getDateOfBirth()) : null)
                .gender(request.getGender())
                .accountType(request.getAccountType() != null
                        ? request.getAccountType() : "customer")
                .status("active")
                .build();

        userRepository.save(user);

        return ResponseEntity.ok(
                AuthResponse.builder().message("Đăng ký thành công!").build()
        );
    }

    // GET /api/auth/me
    @GetMapping("/me")
    public ResponseEntity<?> getMe(@RequestHeader("Authorization") String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().message("Token không hợp lệ!").build());
        }

        String token = authHeader.substring(7);

        if (!jwtUtils.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().message("Token đã hết hạn hoặc không hợp lệ!").build());
        }

        String email = jwtUtils.getEmailFromToken(token);

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(AuthResponse.builder().message("Không tìm thấy người dùng!").build());
        }

        return ResponseEntity.ok(AuthResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .accountType(user.getAccountType())
                .dateOfBirth(user.getDateOfBirth() != null
                        ? user.getDateOfBirth().toString() : null)
                .status(user.getStatus())
                .avatarUrl(user.getAvatarUrl())
                .build());
    }

    // PUT /api/auth/profile — Cập nhật thông tin cá nhân
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody java.util.Map<String, String> body) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().message("Token không hợp lệ!").build());
        }

        String token = authHeader.substring(7);
        if (!jwtUtils.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthResponse.builder().message("Token đã hết hạn!").build());
        }

        String email = jwtUtils.getEmailFromToken(token);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(AuthResponse.builder().message("Không tìm thấy người dùng!").build());
        }

        if (body.containsKey("fullName") && body.get("fullName") != null) {
            user.setFullName(body.get("fullName"));
        }
        if (body.containsKey("phoneNumber")) {
            user.setPhoneNumber(body.get("phoneNumber"));
        }
        if (body.containsKey("dateOfBirth") && body.get("dateOfBirth") != null
                && !body.get("dateOfBirth").isEmpty()) {
            user.setDateOfBirth(java.time.LocalDate.parse(body.get("dateOfBirth")));
        }
        if (body.containsKey("gender")) {
            user.setGender(body.get("gender"));
        }

        userRepository.save(user);

        return ResponseEntity.ok(AuthResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth() != null
                        ? user.getDateOfBirth().toString() : null)
                .accountType(user.getAccountType())
                .status(user.getStatus())
                .avatarUrl(user.getAvatarUrl())
                .message("Cập nhật thành công!")
                .build());
    }
}
