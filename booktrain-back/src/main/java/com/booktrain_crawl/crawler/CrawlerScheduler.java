package com.booktrain_crawl.crawler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.booktrain_crawl.entity.CrawlerConfig;
import com.booktrain_crawl.repository.CrawlerConfigRepository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CrawlerScheduler {

    private final VexereCrawlerService  crawlerService;
    private final CrawlerConfigRepository configRepo;

    /** Chạy lúc 2h sáng mỗi ngày — crawl 30 ngày tiếp theo */
    @Scheduled(cron = "0 0 2 * * *")
    public void scheduledCrawl() {
        log.info("[Scheduler] Starting scheduled crawl...");
        crawlAllActive();
        log.info("[Scheduler] Scheduled crawl finished.");
    }

    /** Crawl ngay khi app khởi động (chạy async trong thread riêng) */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        Thread t = new Thread(() -> {
            log.info("[Startup] Starting initial crawl...");
            try { Thread.sleep(5_000); } catch (InterruptedException e) { Thread.currentThread().interrupt(); return; }
            crawlAllActive();
            log.info("[Startup] Initial crawl finished.");
        }, "crawler-startup");
        t.setDaemon(true);
        t.start();
    }

    /** Crawl tất cả tuyến active, từ hôm nay + daysAhead ngày */
    public void crawlAllActive() {
        List<CrawlerConfig> configs = configRepo.findAllActive();
        LocalDate today = LocalDate.now();

        for (CrawlerConfig cfg : configs) {
            String fromCode = cfg.getFromStation().getVexereCode();
            String toCode   = cfg.getToStation().getVexereCode();
            int days = cfg.getDaysAhead() != null ? cfg.getDaysAhead() : 30;

            for (int d = 0; d < days; d++) {
                LocalDate date = today.plusDays(d);
                try {
                    crawlerService.crawlAndSave(fromCode, toCode, date, null);
                } catch (Exception e) {
                    log.error("[Scheduler] Error crawling {}->{} {}: {}", fromCode, toCode, date, e.getMessage());
                }
            }

            // Update last_crawled_at
            cfg.setLastCrawledAt(OffsetDateTime.now());
            configRepo.save(cfg);
        }
    }
}
