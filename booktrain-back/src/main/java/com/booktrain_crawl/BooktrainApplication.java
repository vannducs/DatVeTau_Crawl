package com.booktrain_crawl;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Đã bỏ @EnableScheduling: không còn auto-crawl. Crawl chỉ chạy thủ công qua CrawlerController.
@SpringBootApplication
public class BooktrainApplication {

	public static void main(String[] args) {
		SpringApplication.run(BooktrainApplication.class, args);
	}

}
