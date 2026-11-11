package vn.vtph.coffee.menu;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import vn.vtph.coffee.support.AbstractMySqlIT;

/** Ảnh món và topping: tải lên (chỉ Chủ quán), đọc lại, hiện trong danh sách quản trị và thực đơn của nhân viên. */
@TestPropertySource(properties = "vtph.uploads.dir=target/test-uploads")
class MenuImageIntegrationTest extends AbstractMySqlIT {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 1, 2, 3, 4};
    @Autowired MockMvc mvc;

    MockHttpSession owner, waiter, cashier;

    @BeforeEach
    void login() throws Exception {
        owner = session("/api/auth/owner/login", "{\"username\":\"owner\",\"password\":\"admin123\"}");
        waiter = session("/api/auth/staff/login", "{\"accountId\":4,\"pin\":\"123456\"}");
        cashier = session("/api/auth/staff/login", "{\"accountId\":2,\"pin\":\"234567\"}");
    }

    @AfterAll
    static void cleanFiles() throws Exception {
        Path dir = Path.of("target/test-uploads");
        if (Files.exists(dir)) try (var w = Files.walk(dir)) { w.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete()); }
    }

    private MockHttpSession session(String url, String body) throws Exception {
        MockHttpSession s = new MockHttpSession();
        mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(body).session(s)).andExpect(status().isOk());
        return s;
    }

    private JsonNode json(String body) throws Exception { return JSON.readTree(body); }

    private MockMultipartFile file(String type, byte[] data) { return new MockMultipartFile("file", "x", type, data); }

    @Test
    void toppingImageIsUploadedByTheOwnerAndVisibleToStaffAndInTheAdminList() throws Exception {

        mvc.perform(multipart("/api/admin/toppings/3/image").file(file("image/png", PNG)).session(waiter)).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/admin/toppings/3/image").file(file("image/gif", PNG)).session(owner)).andExpect(status().isUnprocessableEntity());
        mvc.perform(multipart("/api/admin/toppings/999/image").file(file("image/png", PNG)).session(owner)).andExpect(status().isNotFound());

        JsonNode t = json(mvc.perform(multipart("/api/admin/toppings/3/image").file(file("image/png", PNG)).session(owner))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
        assertEquals(3, t.get("id").asInt());
        assertEquals(true, t.get("imageUrl").asText().startsWith("/api/admin/toppings/3/image?v="));

        byte[] back = mvc.perform(get("/api/admin/toppings/3/image").session(owner)).andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().contentType("image/png")).andReturn().getResponse().getContentAsByteArray();
        assertArrayEquals(PNG, back);

        // nhân viên thấy ảnh trong thực đơn gọi món và tải được qua đường dẫn của họ
        JsonNode menu = json(mvc.perform(get("/api/ops/menu").session(waiter)).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
        String url = null;
        for (JsonNode x : menu.get("toppings")) if (x.get("id").asInt() == 3) url = x.get("imageUrl").asText();
        assertEquals(true, url != null && url.startsWith("/api/ops/menu/toppings/3/image?v="));
        mvc.perform(get("/api/ops/menu/toppings/3/image").session(cashier)).andExpect(status().isOk());
        mvc.perform(get("/api/ops/menu/toppings/1/image").session(waiter)).andExpect(status().isNotFound()); // topping chưa có ảnh
        mvc.perform(get("/api/ops/menu/toppings/3/image")).andExpect(status().isUnauthorized());
    }

    @Test
    void itemAndToppingImagesDoNotCollideWhenIdsMatch() throws Exception {
        byte[] other = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 9, 9, 9};
        mvc.perform(multipart("/api/admin/items/3/image").file(file("image/jpeg", other)).session(owner)).andExpect(status().isOk());
        mvc.perform(multipart("/api/admin/toppings/3/image").file(file("image/png", PNG)).session(owner)).andExpect(status().isOk());
        assertArrayEquals(other, mvc.perform(get("/api/admin/items/3/image").session(owner)).andReturn().getResponse().getContentAsByteArray());
        assertArrayEquals(PNG, mvc.perform(get("/api/admin/toppings/3/image").session(owner)).andReturn().getResponse().getContentAsByteArray());
    }
}
