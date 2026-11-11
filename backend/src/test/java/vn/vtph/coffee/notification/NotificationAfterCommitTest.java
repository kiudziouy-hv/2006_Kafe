package vn.vtph.coffee.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import vn.vtph.coffee.ops.OpsEvent;

/** "Lưu trước, báo sau": thông báo thời gian thực chỉ gửi khi giao dịch ghi CSDL đã commit; rollback thì không gửi gì. */
@SpringJUnitConfig(NotificationAfterCommitTest.Config.class)
class NotificationAfterCommitTest {
    @Configuration
    @EnableTransactionManagement
    static class Config {
        @Bean Recorder broker() { return new Recorder(); }

        @Bean NotificationBridge bridge(Recorder broker) { return new NotificationBridge(broker); }

        @Bean PlatformTransactionManager tx() {
            return new AbstractPlatformTransactionManager() {
                @Override protected Object doGetTransaction() { return new Object(); }
                @Override protected void doBegin(Object t, TransactionDefinition d) {}
                @Override protected void doCommit(DefaultTransactionStatus s) {}
                @Override protected void doRollback(DefaultTransactionStatus s) {}
            };
        }
    }

    /** Bản ghi các tin gửi đi (không dùng Mockito vì Byte Buddy chưa hỗ trợ JDK mới nhất). */
    static class Recorder extends SimpMessagingTemplate {
        final List<String> sent = new ArrayList<>();

        Recorder() { super((message, timeout) -> true); }

        @Override
        public void convertAndSend(String destination, Object payload) { sent.add(destination); }
    }

    @Autowired ApplicationEventPublisher publisher;
    @Autowired Recorder broker;
    @Autowired PlatformTransactionManager tx;

    @BeforeEach
    void clean() { broker.sent.clear(); }

    @Test
    void messageIsSentOnlyAfterCommit() {
        new TransactionTemplate(tx).executeWithoutResult(s -> {
            publisher.publishEvent(new OpsEvent("ORDER_SENT", Map.of("label", "Bàn 5")));
            assertTrue(broker.sent.isEmpty()); // chưa commit thì chưa báo
        });
        assertEquals(List.of(NotificationBridge.KITCHEN), broker.sent);
    }

    @Test
    void rollbackSendsNothing() {
        new TransactionTemplate(tx).executeWithoutResult(s -> {
            publisher.publishEvent(new OpsEvent("ORDER_SENT", Map.of("label", "Bàn 5")));
            s.setRollbackOnly();
        });
        assertTrue(broker.sent.isEmpty());
    }

    @Test
    void withoutATransactionTheMessageIsSentImmediately() {
        publisher.publishEvent(new OpsEvent("LINE_DONE", Map.of("label", "Bàn 5")));
        assertEquals(List.of(NotificationBridge.SERVICE, NotificationBridge.CASHIER), broker.sent);
    }
}
