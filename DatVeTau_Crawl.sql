-- ============================================================
-- DATABASE: DatVeTau_Crawl (schema mới — toa/ghế gắn với trip)
-- ============================================================

-- ============================================================
-- PHẦN 1: USERS
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password        VARCHAR(255) NOT NULL,
    phone_number    VARCHAR(15),
    date_of_birth   DATE,
    gender          VARCHAR(10) CHECK (gender IN ('male','female','other')),
    avatar_url      TEXT,
    account_type    VARCHAR(20) NOT NULL CHECK (account_type IN ('customer','admin')),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','locked','pending')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PHẦN 2: NHÀ GA (4 ga cố định Bắc → Nam)
-- ============================================================
CREATE TABLE train_stations (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,   -- "Ga Hà Nội"
    code            VARCHAR(5)   NOT NULL UNIQUE,  -- "HN", "VI", "DN", "SG"
    vexere_code     VARCHAR(5)   NOT NULL UNIQUE,  -- "HNO","VIN","DNA","SGO" (để crawler map)
    city            VARCHAR(100) NOT NULL,
    address         TEXT,
    order_index     INT NOT NULL UNIQUE      -- 1=HN, 2=Vinh, 3=ĐN, 4=SG
);

-- ============================================================
-- PHẦN 3: CHẶNG CỐ ĐỊNH (thời gian chạy giữa 2 ga liên tiếp)
-- Dùng để tính arrival_datetime khi tạo trip
-- ============================================================
CREATE TABLE train_segments (
    id                  SERIAL PRIMARY KEY,
    from_station_id     INT NOT NULL REFERENCES train_stations(id),
    to_station_id       INT NOT NULL REFERENCES train_stations(id),
    duration_minutes    INT NOT NULL,
    distance_km         INT,
    UNIQUE (from_station_id, to_station_id),
    CHECK (from_station_id <> to_station_id)
);

-- ============================================================
-- PHẦN 4: ĐOÀN TÀU
-- Dữ liệu thật từ crawler (SE1, SE3, SE5, SE7... TN1...)
-- ============================================================
CREATE TABLE trains (
    id              SERIAL PRIMARY KEY,
    train_code      VARCHAR(10) UNIQUE NOT NULL,  -- "SE3", "SE11", "TN1"
    train_name      VARCHAR(150),                 -- "Tàu Thống Nhất SE3"
    company_code    VARCHAR(10) DEFAULT 'VNR',    -- từ Vexere: company.code
    company_name    VARCHAR(100) DEFAULT 'Vietnam Railways Corporation',
    status          VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN ('active','inactive'))
);

-- ============================================================
-- PHẦN 5: CHUYẾN TÀU
-- Mỗi chuyến = 1 tàu + ngày + ga đi + ga đến
-- Dữ liệu thật từ crawler
-- ============================================================
CREATE TABLE train_trips (
    id                  SERIAL PRIMARY KEY,
    train_id            INT NOT NULL REFERENCES trains(id),
    from_station_id     INT NOT NULL REFERENCES train_stations(id),
    to_station_id       INT NOT NULL REFERENCES train_stations(id),
    departure_datetime  TIMESTAMPTZ NOT NULL,
    arrival_datetime    TIMESTAMPTZ NOT NULL,
    duration_minutes    INT,                      -- từ Vexere: duration

    -- Giá tổng quan (để hiển thị nhanh trên SearchResultPage)
    min_price           BIGINT,                   -- giá thấp nhất toàn chuyến
    max_price           BIGINT,

    -- Số ghế tổng (để hiển thị nhanh, tính từ trip_carriages)
    total_seats         INT DEFAULT 0,
    available_seats     INT DEFAULT 0,

    -- Metadata từ Vexere (để đồng bộ lại sau này)
    vexere_id_index     VARCHAR(60) UNIQUE,       -- "VNR|SE3|2026-05-31|01:00|VIN|DNA"
    vexere_train_id     BIGINT,                   -- train_id nội bộ Vexere
    vexere_session      VARCHAR(20),

    status              VARCHAR(20) DEFAULT 'open'
                            CHECK (status IN ('open','cancelled','completed')),
    crawled_at          TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PHẦN 6: TOA XE CỦA CHUYẾN
-- Mỗi chuyến có danh sách toa riêng (từ list_toa_xe[] Vexere)
-- Thay thế carriages + train_carriage_assignments cũ
-- ============================================================
CREATE TABLE trip_carriages (
    id               SERIAL PRIMARY KEY,
    trip_id          INT NOT NULL REFERENCES train_trips(id) ON DELETE CASCADE,
    carriage_order   INT NOT NULL,           -- vị trí toa trong đoàn: 1, 2, 3...
    carriage_model   VARCHAR(20),            -- mã model thật: "A64LV", "Bn42LM", "An28LMV"
    carriage_name    VARCHAR(100),           -- "Ngồi mềm điều hòa", "Nằm mềm điều hòa"

    -- Map sang 3 loại của hệ thống
    -- seat      = NGM (ngồi mềm)
    -- sleeper_3 = NAC (nằm cứng, 3 tầng)
    -- sleeper_2 = NAM (nằm mềm, 2 tầng)
    carriage_type    VARCHAR(20) NOT NULL
                         CHECK (carriage_type IN ('seat','sleeper_3','sleeper_2')),

    seat_group       VARCHAR(10),            -- nhóm gốc Vexere: "NGM","NAC","NAM"
    total_seats      INT NOT NULL DEFAULT 0,
    available_seats  INT NOT NULL DEFAULT 0,
    min_price        BIGINT,                 -- giá thấp nhất loại toa này

    vexere_id        BIGINT,                 -- id nội bộ Vexere (để ref sau)

    UNIQUE (trip_id, carriage_order)
);

-- ============================================================
-- PHẦN 7: GHẾ TRONG TOA (của chuyến cụ thể)
-- Sinh tự động từ crawler dựa theo loại toa thật
-- Thay thế bảng seats cũ
-- ============================================================
CREATE TABLE trip_seats (
    id               SERIAL PRIMARY KEY,
    trip_carriage_id INT NOT NULL REFERENCES trip_carriages(id) ON DELETE CASCADE,
    seat_number      VARCHAR(5) NOT NULL,    -- "01", "02"... "32" (ngồi) / "42" (nằm)
    compartment_no   INT,                    -- số khoang (NULL nếu toa ngồi)
    berth_position   VARCHAR(10) NOT NULL
                         CHECK (berth_position IN ('seat','upper','middle','lower')),
    UNIQUE (trip_carriage_id, seat_number)
);

-- ============================================================
-- PHẦN 8: GIÁ VÉ THEO CHẶNG + LOẠI TOA
-- Từ seat_group_status[] và price_data[] của Vexere
-- ============================================================
CREATE TABLE trip_segment_prices (
    id               SERIAL PRIMARY KEY,
    trip_id          INT NOT NULL REFERENCES train_trips(id) ON DELETE CASCADE,
    from_station_id  INT NOT NULL REFERENCES train_stations(id),
    to_station_id    INT NOT NULL REFERENCES train_stations(id),
    carriage_type    VARCHAR(20) NOT NULL
                         CHECK (carriage_type IN ('seat','sleeper_3','sleeper_2')),
    berth_position   VARCHAR(10) NOT NULL
                         CHECK (berth_position IN ('seat','upper','middle','lower')),
    price            NUMERIC(12,0) NOT NULL,
    UNIQUE (trip_id, from_station_id, to_station_id, carriage_type, berth_position)
);

-- ============================================================
-- PHẦN 9: ĐẶT CHỖ
-- seat_id giờ reference trip_seats thay vì seats cũ
-- ============================================================
CREATE TABLE seat_bookings (
    id               SERIAL PRIMARY KEY,
    trip_seat_id     INT NOT NULL REFERENCES trip_seats(id),   -- ← đổi từ seat_id
    trip_id          INT NOT NULL REFERENCES train_trips(id),
    from_station_id  INT NOT NULL REFERENCES train_stations(id),
    to_station_id    INT NOT NULL REFERENCES train_stations(id),
    from_order_index INT NOT NULL,   -- order_index ga lên (để check overlap)
    to_order_index   INT NOT NULL,   -- order_index ga xuống
    ticket_price     NUMERIC(12,0) NOT NULL,
    status           VARCHAR(20) DEFAULT 'confirmed'
                         CHECK (status IN ('confirmed','cancelled')),
    created_at       TIMESTAMPTZ DEFAULT NOW(),

    -- Đảm bảo không 2 người cùng đặt 1 ghế trên cùng chặng
    UNIQUE (trip_seat_id, trip_id, from_order_index, to_order_index)
);

-- ============================================================
-- PHẦN 10: ĐƠN HÀNG & THANH TOÁN (giữ nguyên)
-- ============================================================
CREATE TABLE orders (
    id              SERIAL PRIMARY KEY,
    order_code      VARCHAR(20) UNIQUE NOT NULL,
    customer_id     INT NOT NULL REFERENCES users(id),
    subtotal        NUMERIC(14,0) NOT NULL,
    service_fee     NUMERIC(12,0) DEFAULT 15000,
    total_amount    NUMERIC(14,0) NOT NULL,
    status          VARCHAR(25) DEFAULT 'pending_payment'
                        CHECK (status IN (
                            'pending_payment','paid','cancelled','refunded','completed'
                        )),
    note            TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id               SERIAL PRIMARY KEY,
    order_id         INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seat_booking_id  INT NOT NULL REFERENCES seat_bookings(id),
    passenger_name   VARCHAR(100) NOT NULL,
    id_number        VARCHAR(20),
    phone_number     VARCHAR(15),
    date_of_birth    DATE,
    ticket_price     NUMERIC(12,0) NOT NULL,
    status           VARCHAR(20) DEFAULT 'confirmed'
                         CHECK (status IN ('confirmed','cancelled','used'))
);

CREATE TABLE payments (
    id               SERIAL PRIMARY KEY,
    order_id         INT NOT NULL REFERENCES orders(id),
    payment_method   VARCHAR(30) NOT NULL,
    amount           NUMERIC(14,0) NOT NULL,
    status           VARCHAR(20) DEFAULT 'pending'
                         CHECK (status IN ('pending','success','failed','refunded')),
    transaction_code VARCHAR(100),
    paid_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PHẦN 11: THÔNG BÁO & LOG ADMIN (giữ nguyên)
-- ============================================================
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    body        TEXT,
    noti_type   VARCHAR(30) NOT NULL
                    CHECK (noti_type IN ('booking','cancellation','refund','system','admin')),
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_logs (
    id          SERIAL PRIMARY KEY,
    admin_id    INT NOT NULL REFERENCES users(id),
    action      VARCHAR(50) NOT NULL,
    target_type VARCHAR(30),
    target_id   INT,
    detail      TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PHẦN 12: CRAWLER CONFIG (admin cấu hình tuyến cần crawl)
-- ============================================================
CREATE TABLE crawler_configs (
    id              SERIAL PRIMARY KEY,
    from_station_id INT NOT NULL REFERENCES train_stations(id),
    to_station_id   INT NOT NULL REFERENCES train_stations(id),
    is_active       BOOLEAN DEFAULT TRUE,   -- bật/tắt tuyến này
    days_ahead      INT DEFAULT 30,         -- crawl trước bao nhiêu ngày
    last_crawled_at TIMESTAMPTZ,
    UNIQUE (from_station_id, to_station_id)
);

CREATE TABLE crawler_logs (
    id              SERIAL PRIMARY KEY,
    from_code       VARCHAR(5),
    to_code         VARCHAR(5),
    crawl_date      DATE,
    trips_found     INT DEFAULT 0,
    trips_saved     INT DEFAULT 0,
    status          VARCHAR(20) CHECK (status IN ('success','failed','partial')),
    error_message   TEXT,
    duration_ms     INT,
    crawled_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email              ON users(email);
CREATE INDEX idx_train_trips_train        ON train_trips(train_id);
CREATE INDEX idx_train_trips_status       ON train_trips(status);
CREATE INDEX idx_train_trips_departure    ON train_trips(departure_datetime);
CREATE INDEX idx_train_trips_route        ON train_trips(from_station_id, to_station_id);
CREATE INDEX idx_train_trips_id_index     ON train_trips(vexere_id_index);
CREATE INDEX idx_trip_carriages_trip      ON trip_carriages(trip_id);
CREATE INDEX idx_trip_seats_carriage      ON trip_seats(trip_carriage_id);
CREATE INDEX idx_seat_bookings_seat       ON seat_bookings(trip_seat_id, trip_id);
CREATE INDEX idx_seat_bookings_trip       ON seat_bookings(trip_id);
CREATE INDEX idx_orders_customer          ON orders(customer_id);
CREATE INDEX idx_orders_status            ON orders(status);
CREATE INDEX idx_notifications_user       ON notifications(user_id);
CREATE INDEX idx_admin_logs_admin         ON admin_logs(admin_id);

-- ============================================================
-- SEED DATA CỐ ĐỊNH
-- ============================================================

-- 4 nhà ga (thêm cột vexere_code để crawler map)
INSERT INTO train_stations (id, name, code, vexere_code, city, address, order_index) VALUES
(1, 'Ga Hà Nội',  'HN', 'HNO', 'Hà Nội',          '120 Lê Duẩn, Hoàn Kiếm, Hà Nội',       1),
(2, 'Ga Vinh',    'VI', 'VIN', 'Nghệ An',           '1 Lệ Ninh, P. Quán Bầu, TP. Vinh',     2),
(3, 'Ga Đà Nẵng', 'DN', 'DNA', 'Đà Nẵng',           '202 Hải Phòng, Thanh Khê, Đà Nẵng',    3),
(4, 'Ga Sài Gòn', 'SG', 'SGO', 'TP. Hồ Chí Minh',  '1 Nguyễn Thông, P.9, Q.3, TP.HCM',    4);
SELECT setval('train_stations_id_seq', 4);

-- Chặng cố định (thời gian chạy thực tế)
INSERT INTO train_segments (from_station_id, to_station_id, duration_minutes, distance_km) VALUES
(1, 2,  240,  291),   -- HN  → Vinh  4h
(2, 3,  480,  363),   -- Vinh→ ĐN    8h
(3, 4,  720,  796),   -- ĐN  → SG   12h
(4, 3,  720,  796),   -- SG  → ĐN   12h
(3, 2,  480,  363),   -- ĐN  → Vinh  8h
(2, 1,  240,  291);   -- Vinh→ HN    4h

-- Crawler config: tất cả 12 tuyến của 4 ga
INSERT INTO crawler_configs (from_station_id, to_station_id, is_active, days_ahead) VALUES
(1, 2, true, 30), (1, 3, true, 30), (1, 4, true, 30),
(2, 1, true, 30), (2, 3, true, 30), (2, 4, true, 30),
(3, 1, true, 30), (3, 2, true, 30), (3, 4, true, 30),
(4, 1, true, 30), (4, 2, true, 30), (4, 3, true, 30);

-- ============================================================
-- KIỂM TRA
-- ============================================================
SELECT 'train_stations'    AS tbl, COUNT(*) FROM train_stations
UNION ALL SELECT 'train_segments',   COUNT(*) FROM train_segments
UNION ALL SELECT 'crawler_configs',  COUNT(*) FROM crawler_configs;