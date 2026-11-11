package vn.vtph.coffee.ops;

import java.util.Map;

/** Sự kiện nghiệp vụ của luồng gọi món - pha chế - thanh toán; lớp notification chuyển tiếp qua WebSocket. */
public record OpsEvent(String type, Map<String, Object> data) {}
