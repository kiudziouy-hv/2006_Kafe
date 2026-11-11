package vn.vtph.coffee.menu;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import vn.vtph.coffee.ops.OpsException;

/** Ảnh món và topping lưu dạng tệp trong thư mục tải lên (không đổi lược đồ CSDL). Dùng chung cho trang Chủ quán và màn hình gọi món. */
@Component
@Profile("mysql")
public class MenuImageStore {
    private static final Map<String, String> TYPES = Map.of("image/jpeg", "jpg", "image/png", "png", "image/webp", "webp");
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    /** Loại đối tượng có ảnh; mỗi loại một thư mục con. */
    public enum Kind {
        ITEM("menu"), TOPPING("topping");
        final String folder;
        Kind(String folder) { this.folder = folder; }
    }

    private final Path root;

    public MenuImageStore(@Value("${vtph.uploads.dir:uploads}") String uploads) { this.root = Path.of(uploads); }

    private Path dir(Kind kind) { return root.resolve(kind.folder); }

    private Path file(Kind kind, int id) {
        Path dir = dir(kind);
        for (String ext : TYPES.values()) {
            Path p = dir.resolve(id + "." + ext);
            if (Files.isRegularFile(p)) return p;
        }
        return null;
    }

    /** Dấu thời gian sửa ảnh (để trình duyệt tải lại khi đổi ảnh); null nếu món chưa có ảnh. */
    public Long version(Kind kind, int id) {
        Path p = file(kind, id);
        if (p == null) return null;
        try { return Files.getLastModifiedTime(p).toMillis(); } catch (IOException e) { return null; }
    }

    /** Trả (loại nội dung, nội dung) của ảnh, hoặc null nếu chưa có. */
    public Map.Entry<String, byte[]> read(Kind kind, int id) {
        Path p = file(kind, id);
        if (p == null) return null;
        try {
            String ext = p.getFileName().toString().replaceAll(".*\\.", "");
            String type = TYPES.entrySet().stream().filter(e -> e.getValue().equals(ext)).map(Map.Entry::getKey).findFirst().orElse("image/jpeg");
            return Map.entry(type, Files.readAllBytes(p));
        } catch (IOException e) { throw new OpsException(500, "IMAGE_READ", "Không đọc được ảnh món."); }
    }

    /** Xóa ảnh của món hoặc topping (nếu có). */
    public void delete(Kind kind, int id) {
        try {
            for (String e : TYPES.values()) Files.deleteIfExists(dir(kind).resolve(id + "." + e));
        } catch (IOException e) { throw new OpsException(500, "IMAGE_WRITE", "Không xóa được ảnh món."); }
    }

    public void save(Kind kind, int id, String contentType, byte[] data) {
        Path dir = dir(kind);
        String ext = contentType == null ? null : TYPES.get(contentType.toLowerCase());
        if (ext == null) throw new OpsException(422, "IMAGE_TYPE", "Chỉ nhận ảnh JPG, PNG hoặc WebP.");
        if (data.length == 0 || data.length > MAX_BYTES) throw new OpsException(422, "IMAGE_SIZE", "Ảnh phải nhỏ hơn 5 MB.");
        try {
            Files.createDirectories(dir);
            for (String e : TYPES.values()) Files.deleteIfExists(dir.resolve(id + "." + e));
            Files.write(dir.resolve(id + "." + ext), data);
        } catch (IOException e) { throw new OpsException(500, "IMAGE_WRITE", "Không lưu được ảnh món."); }
    }
}
