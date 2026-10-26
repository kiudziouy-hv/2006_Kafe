package vn.vtph.coffee.support;

import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MySQLContainer;

/** Một container MySQL 8.4 dùng chung cho mọi lớp test MySQL (khởi động lười, dọn bởi Ryuk khi JVM thoát). */
public final class MySqlContainerHolder {
    private MySqlContainerHolder() {}

    private static MySQLContainer<?> container;

    /** Điều kiện bật test: có Docker. Dùng với {@code @EnabledIf("vn.vtph.coffee.support.MySqlContainerHolder#dockerAvailable")}. */
    public static boolean dockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable e) {
            return false;
        }
    }

    public static synchronized MySQLContainer<?> get() {
        if (container == null) {
            container = new MySQLContainer<>("mysql:8.4")
                    .withDatabaseName("VTPH_Coffee")
                    .withCommand("--log-bin-trust-function-creators=1", "--character-set-server=utf8mb4");
            container.start();
        }
        return container;
    }
}
