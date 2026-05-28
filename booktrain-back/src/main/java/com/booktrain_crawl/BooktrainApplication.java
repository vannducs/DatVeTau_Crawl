package com.booktrain_crawl;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BooktrainApplication {

	public static void main(String[] args) {
		SpringApplication.run(BooktrainApplication.class, args);
	}

}
