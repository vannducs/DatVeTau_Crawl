package com.booktrain_crawl.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.booktrain_crawl.entity.TrainTrip;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface TrainTripRepository extends JpaRepository<TrainTrip, Integer> {

    List<TrainTrip> findByTrainId(Integer trainId);

    List<TrainTrip> findByTrainIdAndStatus(Integer trainId, String status);

    boolean existsByTrainIdAndStatusAndArrivalDatetimeAfter(
            Integer trainId, String status, OffsetDateTime time);

    Optional<TrainTrip> findTopByTrainIdOrderByDepartureDatetimeDesc(Integer trainId);

    Optional<TrainTrip> findTopByTrainIdAndStatusNotOrderByDepartureDatetimeDesc(
            Integer trainId, String status);

    @Query("""
        SELECT t FROM TrainTrip t
        JOIN FETCH t.train
        JOIN FETCH t.fromStation
        JOIN FETCH t.toStation
        WHERE t.status = 'open'
          AND CAST(t.departureDatetime AS date) = :date
          AND (
            (t.fromStation.orderIndex <= :fromOrderIndex AND t.toStation.orderIndex >= :toOrderIndex)
            OR
            (t.fromStation.orderIndex >= :fromOrderIndex AND t.toStation.orderIndex <= :toOrderIndex)
          )
        ORDER BY t.departureDatetime ASC
    """)
    List<TrainTrip> findOpenTripsForSegment(
            @Param("fromOrderIndex") Integer fromOrderIndex,
            @Param("toOrderIndex")   Integer toOrderIndex,
            @Param("date")           LocalDate date
    );

    @Query("""
        SELECT t FROM TrainTrip t
        WHERE t.status IN :statuses
          AND t.departureDatetime >= :from
          AND t.departureDatetime <= :to
        ORDER BY t.departureDatetime ASC
    """)
    List<TrainTrip> findByStatusInAndDepartureBetween(
            @Param("statuses") List<String> statuses,
            @Param("from")     OffsetDateTime from,
            @Param("to")       OffsetDateTime to
    );

    // Dùng cho trang admin/trips với filter đa dạng
    @Query("""
        SELECT t FROM TrainTrip t
        JOIN FETCH t.train tr
        JOIN FETCH t.fromStation fs
        JOIN FETCH t.toStation ts
        WHERE (:status IS NULL OR t.status = :status)
          AND (:trainId IS NULL OR tr.id = :trainId)
          AND (:date IS NULL OR CAST(t.departureDatetime AS date) = :date)
        ORDER BY t.departureDatetime DESC
    """)
    List<TrainTrip> findWithFilters(
            @Param("status")  String status,
            @Param("trainId") Integer trainId,
            @Param("date")    LocalDate date
    );

    // Fetch tất cả trips với join (lọc bằng Java trong controller)
    @Query("""
        SELECT t FROM TrainTrip t
        JOIN FETCH t.train
        JOIN FETCH t.fromStation
        JOIN FETCH t.toStation
        ORDER BY t.departureDatetime DESC
    """)
    List<TrainTrip> findAllTripsWithJoins();

    // VĐ6: Kiểm tra trùng giờ (±2 giờ buffer)
    boolean existsByTrainIdAndDepartureDatetimeBetweenAndStatusNot(
            Integer trainId, OffsetDateTime from, OffsetDateTime to, String status);

    // VĐ6: Kiểm tra cùng ngày (timezone-aware)
    @Query("""
        SELECT COUNT(t) > 0 FROM TrainTrip t
        WHERE t.train.id = :trainId
          AND t.status <> 'cancelled'
          AND CAST(t.departureDatetime AS date) = :date
    """)
    boolean existsOnSameDateForTrain(
            @Param("trainId") Integer trainId,
            @Param("date") LocalDate date);

    boolean existsByVexereIdIndex(String vexereIdIndex);
    Optional<TrainTrip> findByVexereIdIndex(String vexereIdIndex);

    @Query("""
        SELECT t FROM TrainTrip t
        JOIN FETCH t.train
        JOIN FETCH t.fromStation
        JOIN FETCH t.toStation
        WHERE t.fromStation.code = :fromCode
          AND t.toStation.code   = :toCode
          AND CAST(t.departureDatetime AS date) = :date
    """)
    List<TrainTrip> findByFromStationCodeAndToStationCodeAndDepartureDate(
            @Param("fromCode") String fromCode,
            @Param("toCode")   String toCode,
            @Param("date")     LocalDate date
    );
}

