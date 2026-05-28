package com.booktrain_crawl.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.DefaultUriBuilderFactory;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient vexereWebClient() {
        // EncodingMode.NONE prevents WebClient from double-encoding
        // percent signs already present in the URI string (%5B → %255B).
        DefaultUriBuilderFactory factory =
                new DefaultUriBuilderFactory("https://internal-vroute-cmc.vexere.com");
        factory.setEncodingMode(DefaultUriBuilderFactory.EncodingMode.NONE);

        return WebClient.builder()
                .uriBuilderFactory(factory)
                .baseUrl("https://internal-vroute-cmc.vexere.com")
                .defaultHeader("User-Agent",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                        "(KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36")
                .defaultHeader("Accept", "application/json, text/plain, */*")
                .defaultHeader("Accept-Language", "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7")
                .defaultHeader("Origin", "https://vexere.com")
                .defaultHeader("Referer", "https://vexere.com/")
                .build();
    }
}
