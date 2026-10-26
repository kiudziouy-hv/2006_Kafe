package vn.vtph.coffee.table;

/** area: INDOOR | OUTDOOR; status: EMPTY | SERVING | WAITING_PAYMENT (khớp ENUM trong dining_table). */
public record DiningTableView(long id, int number, String area, String status) {
}
