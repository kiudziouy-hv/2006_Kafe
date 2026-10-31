package vn.vtph.coffee.ops;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import vn.vtph.coffee.ops.Model.Shift;

/** Gom các ca thu ngân theo ngày kinh doanh để màn Ca thu ngân hiện đủ ca sáng và ca tối của từng ngày. */
final class ShiftDays {
    private ShiftDays() {}

    /**
     * @param shifts các ca (đã có số liệu doanh thu), mới nhất trước theo ngày
     * @param today  ngày hôm nay (yyyy-MM-dd); luôn có mặt đầu danh sách dù chưa mở ca nào
     */
    static List<Map<String, Object>> group(List<Shift> shifts, String today) {
        Map<String, List<Shift>> byDay = new LinkedHashMap<>();
        byDay.put(today, new ArrayList<>());
        for (Shift s : shifts) byDay.computeIfAbsent(s.businessDate, k -> new ArrayList<>()).add(s);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Map.Entry<String, List<Shift>> e : byDay.entrySet()) {
            List<Shift> day = e.getValue();
            day.sort(Comparator.comparingInt(s -> "MORNING".equals(s.type) ? 0 : 1));
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", e.getKey());
            m.put("shifts", day);
            m.put("cashTotal", day.stream().mapToInt(s -> s.cashSales == null ? 0 : s.cashSales).sum());
            m.put("transferTotal", day.stream().mapToInt(s -> s.transferSales == null ? 0 : s.transferSales).sum());
            m.put("invoiceCount", day.stream().mapToInt(s -> s.invoiceCount == null ? 0 : s.invoiceCount).sum());
            out.add(m);
        }
        return out;
    }
}
