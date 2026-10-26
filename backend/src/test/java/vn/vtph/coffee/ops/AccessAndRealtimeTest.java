package vn.vtph.coffee.ops;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;

/** Kiểm tra chặn truy cập theo phiên/vai trò (NFR-011) và việc phát sự kiện thời gian thực sau khi dữ liệu đã đổi. */
@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
class AccessAndRealtimeTest {
    @Autowired MockMvc mvc;
    @Autowired ApplicationEvents events;

    private MockHttpSession login(int accountId, String pin) throws Exception {
        MockHttpSession s = new MockHttpSession();
        mvc.perform(post("/api/auth/staff/login").session(s).contentType(MediaType.APPLICATION_JSON)
                .content("{\"accountId\":" + accountId + ",\"pin\":\"" + pin + "\"}")).andExpect(status().isOk());
        return s;
    }

    @Test
    void apiRejectsRequestsWithoutSession() throws Exception {
        mvc.perform(get("/api/ops/tables")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/health")).andExpect(status().isOk());
    }

    @Test
    void baristaCannotReadTableMapButWaiterCan() throws Exception {
        MockHttpSession barista = login(4, "345678");
        mvc.perform(get("/api/ops/tables").session(barista)).andExpect(status().isForbidden());
        MockHttpSession waiter = login(2, "123456");
        mvc.perform(get("/api/ops/tables").session(waiter)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(14));
    }

    @Test
    void sendingOrderThenMakingAndFinishingEmitsEventsInOrder() throws Exception {
        MockHttpSession waiter = login(2, "123456");
        MockHttpSession barista = login(4, "345678");
        mvc.perform(post("/api/ops/tables/5/orders").session(waiter).contentType(MediaType.APPLICATION_JSON)
                .content("{\"lines\":[{\"itemId\":3,\"qty\":1,\"size\":\"M\",\"temp\":\"COLD\",\"sugar\":\"50\",\"ice\":\"NORMAL\"}]}"))
                .andExpect(status().isOk());
        var kitchen = mvc.perform(get("/api/ops/kitchen").session(barista)).andExpect(status().isOk()).andReturn();
        String body = kitchen.getResponse().getContentAsString();
        int lineId = Integer.parseInt(body.replaceAll("(?s).*\"id\":(\\d+).*", "$1"));
        mvc.perform(post("/api/ops/kitchen/" + lineId + "/start").session(barista)).andExpect(status().isOk());
        mvc.perform(post("/api/ops/kitchen/" + lineId + "/done").session(barista)).andExpect(status().isOk());

        List<String> types = events.stream(OpsEvent.class).map(OpsEvent::type).toList();
        assertTrue(types.indexOf("ORDER_SENT") < types.indexOf("LINE_MAKING"), types.toString());
        assertTrue(types.indexOf("LINE_MAKING") < types.indexOf("LINE_DONE"), types.toString());
    }

    @Test
    void sessionEndsAfterLogout() throws Exception {
        MockHttpSession waiter = login(2, "123456");
        mvc.perform(post("/api/auth/logout").session(waiter)).andExpect(status().isOk());
        assertEquals(401, mvc.perform(get("/api/auth/me").session(waiter)).andReturn().getResponse().getStatus());
    }
}
