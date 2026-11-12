package vn.vtph.coffee.common;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Nguồn duy nhất để lấy "hôm nay" và đổi ranh giới ngày theo giờ nghiệp vụ (mặc định giờ Việt Nam, UTC+7).
 * Cơ sở dữ liệu lưu thời điểm theo UTC, còn ngày kinh doanh tính theo giờ Việt Nam, nên từ 00:00 đến 07:00 giờ Việt Nam
 * ngày UTC vẫn là hôm qua. Không dùng {@code LocalDate.now()} trần hay CURDATE() của MySQL để lấy ngày kinh doanh.
 */
public final class BusinessTime {
    public static final String DEFAULT_ZONE_ID = "Asia/Ho_Chi_Minh";
    public static final ZoneId DEFAULT_ZONE = ZoneId.of(DEFAULT_ZONE_ID);

    private BusinessTime() {}

    /** Ngày kinh doanh hiện tại theo múi giờ {@code zone} tại thời điểm của {@code clock} (truyền đồng hồ cố định khi test). */
    public static LocalDate today(ZoneId zone, Clock clock) { return LocalDate.now(clock.withZone(zone)); }

    public static LocalDate today(ZoneId zone) { return today(zone, Clock.systemUTC()); }

    public static LocalDate today() { return today(DEFAULT_ZONE); }

    /** 00:00 của {@code day} theo {@code zone}, đổi sang UTC để so với các cột DATETIME lưu UTC. */
    public static LocalDateTime startOfDayUtc(LocalDate day, ZoneId zone) {
        return day.atStartOfDay(zone).toInstant().atZone(ZoneOffset.UTC).toLocalDateTime();
    }
}
