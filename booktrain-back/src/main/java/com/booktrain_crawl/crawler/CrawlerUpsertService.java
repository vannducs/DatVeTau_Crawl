package com.booktrain_crawl.crawler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.booktrain_crawl.repository.SeatBookingRepository;
import com.booktrain_crawl.repository.TripCarriageRepository;
import com.booktrain_crawl.repository.TripSeatRepository;
import com.booktrain_crawl.repository.TripSegmentPriceRepository;

/**
 * Service riêng (tách khỏi VexereCrawlerService) để thao tác xóa dữ liệu crawl
 * của 1 trip nằm trong 1 transaction — tránh self-invocation @Transactional.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerUpsertService {

    private final SeatBookingRepository    seatBookingRepo;
    private final TripSeatRepository       tripSeatRepo;
    private final TripCarriageRepository   carriageRepo;
    private final TripSegmentPriceRepository priceRepo;

    /**
     * Xóa toàn bộ dữ liệu CRAWL của 1 trip (mock booking + seats + carriages + segment prices)
     * để chuẩn bị insert lại data mới. GIỮ booking thật (ticket_price > 0).
     * Thứ tự xóa theo FK: seat_bookings → trip_seats → trip_carriages → trip_segment_prices.
     */
    @Transactional
    public void purgeCrawledData(Integer tripId) {
        seatBookingRepo.deleteMockByTripId(tripId);  // chỉ xóa mock (ticket_price <= 0)
        tripSeatRepo.deleteByTripIdBulk(tripId);
        carriageRepo.deleteByTripIdBulk(tripId);
        priceRepo.deleteByTripIdBulk(tripId);
        log.info("[Upsert] Purged crawled data for trip id={}", tripId);
    }
}
