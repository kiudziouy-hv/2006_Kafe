package vn.vtph.coffee.config;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import vn.vtph.coffee.notification.NotificationBridge;

/** STOMP trên WebSocket tại /ws. Phiên đăng nhập (cookie) được dùng lại để xác thực và kiểm tra vai trò khi đăng ký kênh. */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    /** Kênh nào dành cho vai trò nào. Chủ quán/Quản lý được xem mọi kênh. */
    static final Map<String, List<String>> TOPIC_ROLES = Map.of(
            NotificationBridge.KITCHEN, List.of("ROLE_BARISTA", "ROLE_OWNER"),
            NotificationBridge.SERVICE, List.of("ROLE_WAITER", "ROLE_OWNER"),
            NotificationBridge.CASHIER, List.of("ROLE_CASHIER", "ROLE_OWNER"));

    private final String[] origins;

    public WebSocketConfig(@Value("${vtph.cors.allowed-origins}") String[] origins) {
        this.origins = origins;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(origins);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                if (acc == null || acc.getMessageType() != SimpMessageType.SUBSCRIBE) return message;
                var user = acc.getUser();
                String dest = acc.getDestination();
                if (!(user instanceof Authentication a) || !a.isAuthenticated()) throw new MessagingException("Chưa đăng nhập.");
                List<String> allowed = TOPIC_ROLES.get(dest);
                boolean ok = allowed != null && a.getAuthorities().stream().anyMatch(g -> allowed.contains(g.getAuthority()));
                if (!ok) throw new MessagingException("Không có quyền theo dõi kênh này.");
                return message;
            }
        });
    }
}
