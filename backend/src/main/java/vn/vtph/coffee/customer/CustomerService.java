package vn.vtph.coffee.customer;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.vtph.coffee.common.Db;
import vn.vtph.coffee.ops.OpsException;

/** UC-25 đăng ký thành viên, UC-26 tra cứu thành viên theo số điện thoại (BR-024, FR-M08). */
@Service
@Profile("mysql")
@Transactional
public class CustomerService {
    private final Db db;

    public CustomerService(Db db) { this.db = db; }

    private static final String SELECT = "SELECT customer_id AS id, full_name AS fullName, phone, points FROM customer";

    public static String normalizePhone(String phone) {
        String p = phone == null ? "" : phone.replaceAll("[\\s.\\-]", "");
        if (!p.matches("0\\d{9}")) throw new OpsException(422, "BAD_PHONE", "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.");
        return p;
    }

    public Map<String, Object> register(Map<String, Object> b) {
        String name = Db.req(b, "fullName", "Họ tên", 100);
        String phone = normalizePhone(Db.str(b, "phone"));
        if (!db.jdbc.queryForList("SELECT 1 FROM customer WHERE phone = ?", phone).isEmpty())
            throw new OpsException(409, "DUPLICATE_PHONE", "Số điện thoại này đã thuộc về một thành viên.");
        int id = db.insertId("INSERT INTO customer (full_name, phone) VALUES (?, ?)", name, phone);
        return db.row(SELECT + " WHERE customer_id = ?", id);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(String q) {
        if (q == null || q.isBlank()) return db.rows(SELECT + " ORDER BY full_name LIMIT 200");
        String like = "%" + q.trim() + "%";
        return db.rows(SELECT + " WHERE phone LIKE ? OR full_name LIKE ? ORDER BY full_name LIMIT 200", like, like);
    }

    /** Họ tên, điểm hiện tại, lịch sử điểm và lịch sử giao dịch của thành viên (FR-M08-003, 006). */
    @Transactional(readOnly = true)
    public Map<String, Object> lookup(String phone) {
        Map<String, Object> c = db.row(SELECT + " WHERE phone = ?", normalizePhone(phone));
        if (c == null) throw new OpsException(404, "NO_CUSTOMER", "Chưa có thành viên với số điện thoại này.");
        int id = ((Number) c.get("id")).intValue();
        Map<String, Object> m = new LinkedHashMap<>(c);
        m.put("pointHistory", db.rows("""
                SELECT t.tx_id AS id, t.type, t.points, t.shortfall, t.created_at AS createdAt, CONCAT('HD', LPAD(t.invoice_id, 4, '0')) AS invoiceNo
                FROM point_transaction t WHERE t.customer_id = ? ORDER BY t.tx_id DESC LIMIT 50""", id));
        m.put("invoices", db.rows("""
                SELECT i.invoice_id AS id, CONCAT('HD', LPAD(i.invoice_id, 4, '0')) AS invoiceNo, i.total, i.status, i.issued_at AS issuedAt,
                       i.points_used AS pointsUsed, i.points_earned AS pointsEarned
                FROM invoice i WHERE i.customer_id = ? ORDER BY i.invoice_id DESC LIMIT 50""", id));
        return m;
    }
}
