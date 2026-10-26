# Luồng thời gian thực

```
Phục vụ gửi đơn ──REST POST /api/ops/tables/{no}/orders──▶ OpsService lưu đơn ──▶ OpsEvent ORDER_SENT
  ──▶ NotificationBridge ──▶ /topic/kitchen ──▶ Màn hình pha chế tải lại bảng (GET /api/ops/kitchen)

Pha chế "Bắt đầu pha"  ──▶ LINE_MAKING  ──▶ /topic/service
Pha chế "Hoàn thành"   ──▶ LINE_DONE    ──▶ /topic/service + /topic/cashier  (toast "Bàn 3 xong, cần mang ra")
Phục vụ "Khách đã dùng xong" ──▶ TABLE_WAITING_PAY ──▶ /topic/service + /topic/cashier
Thu ngân thanh toán    ──▶ ORDER_PAID   ──▶ /topic/service + /topic/cashier
```

## Quy tắc

1. **Lưu trước, báo sau.** `NotificationBridge` dùng `@TransactionalEventListener` (sau commit): bản MySQL chỉ báo khi giao dịch đã ghi xong, rollback thì không báo gì; bản bộ nhớ (không có giao dịch) báo ngay. Có test `NotificationAfterCommitTest`.
2. **WebSocket chỉ báo "có thay đổi".** Client luôn lấy dữ liệu đúng từ REST (invalidate query `['ops']`). Mất tin không làm sai dữ liệu.
3. **Xác thực và phân quyền.** Bắt tay `/ws` cần phiên cookie hợp lệ. Khi đăng ký kênh, `WebSocketConfig` kiểm tra vai trò (bảng `TOPIC_ROLES`); sai quyền bị từ chối.
4. **Nối lại.** Client (`lib/websocket.ts`) tự nối lại sau 3 giây; mỗi lần nối lại thành công, các màn gọi lại REST để bù tin đã lỡ. Màn pha chế còn tự làm mới 20 giây/lần.
5. **Một máy chủ.** Dùng simple broker trong bộ nhớ nên chỉ chạy được một bản backend. Muốn nhiều bản: đổi sang broker ngoài (RabbitMQ/Redis) — chưa cần ở quy mô một quán.

## Đã kiểm chứng

- Test tự động: thứ tự `ORDER_SENT → LINE_MAKING → LINE_DONE` (`AccessAndRealtimeTest`), định tuyến kênh (`NotificationBridgeTest`).
- Chạy tay: Phục vụ đăng nhập trên trình duyệt, Pha chế bắt đầu/hoàn thành bằng API; trình duyệt Phục vụ nhận toast và bàn tự đổi sang "Đang phục vụ" mà không tải lại trang.
- **Chưa kiểm chứng:** việc từ chối đăng ký kênh sai vai trò qua kết nối STOMP thật (mới có mã, chưa có test).
