package vn.vtph.coffee.common;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Ngày kinh doanh theo giờ Việt Nam; khung 00:00-07:00 là lúc ngày UTC còn là hôm qua. */
class BusinessTimeTest {
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");

    private static LocalDate at(String utcInstant) {
        return BusinessTime.today(VN, Clock.fixed(Instant.parse(utcInstant), ZoneOffset.UTC));
    }

    @ParameterizedTest(name = "{0} UTC -> ngày {1}")
    @CsvSource({
            "2026-11-12T16:59:59Z, 2026-11-12",  // 23:59:59 VN, 12/11
            "2026-11-12T17:00:00Z, 2026-11-13",  // 00:00:00 VN, đầu khung: sang ngày 13/11 dù UTC còn 12/11
            "2026-11-12T18:56:00Z, 2026-11-13",  // 01:56 VN (đúng giờ lúc phát hiện lỗi)
            "2026-11-12T20:30:00Z, 2026-11-13",  // 03:30 VN
            "2026-11-12T23:59:59Z, 2026-11-13",  // 06:59:59 VN, cuối khung
            "2026-11-13T00:00:00Z, 2026-11-13",  // 07:00:00 VN: UTC đã sang 13/11
            "2026-11-13T09:00:00Z, 2026-11-13"   // 16:00 VN, ngoài khung
    })
    void todayFollowsVietnamTimeAroundMidnight(String utc, String expected) {
        assertEquals(LocalDate.parse(expected), at(utc));
    }

    @Test
    void utcDateIsYesterdayBetweenMidnightAndSevenInVietnam() {
        Instant t = Instant.parse("2026-11-12T18:00:00Z"); // 01:00 ngày 13/11 giờ Việt Nam
        assertEquals(LocalDate.parse("2026-11-12"), LocalDate.ofInstant(t, ZoneOffset.UTC));
        assertEquals(LocalDate.parse("2026-11-13"), BusinessTime.today(VN, Clock.fixed(t, ZoneOffset.UTC)));
    }

    @Test
    void todayIgnoresTheClockOwnZone() {
        Instant t = Instant.parse("2026-11-12T18:00:00Z");
        for (ZoneId clockZone : new ZoneId[] {ZoneOffset.UTC, ZoneId.of("America/Los_Angeles"), VN})
            assertEquals(LocalDate.parse("2026-11-13"), BusinessTime.today(VN, Clock.fixed(t, clockZone)));
    }

    @Test
    void startOfDayUtcIs17hPreviousDayForVietnam() {
        assertEquals(LocalDateTime.parse("2026-11-12T17:00:00"), BusinessTime.startOfDayUtc(LocalDate.parse("2026-11-13"), VN));
        assertEquals(LocalDateTime.parse("2026-11-13T17:00:00"), BusinessTime.startOfDayUtc(LocalDate.parse("2026-11-13").plusDays(1), VN));
    }
}
