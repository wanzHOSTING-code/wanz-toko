/* ============================================================
   Fitur v5.0: voucher, notifikasi, review, compare, tracking modal
   ============================================================ */

let compareIds = load("rona5_compare", []);
let vouchers = load("rona5_vouchers", [
  { code: "RONA10", type: "percent", value: 10, min: 50000, maxDiscount: 25000, active: true, used: 0 },
  { code: "HEMAT5000", type: "fixed", value: 5000, min: 25000, maxDiscount: 5000, active: true, used: 0 }
]);
let notifications = load("rona5_notifications", []);
let reviews = load("rona5_reviews", []);
let appliedVoucher = null;

const saveV4 = save;
save = function () {
  saveV4();
  localStorage.setItem("rona5_compare", JSON.stringify(compareIds));
  localStorage.setItem("rona5_vouchers", JSON.stringify(vouchers));
  localStorage.setItem("rona5_notifications", JSON.stringify(notifications));
  localStorage.setItem("rona5_reviews", JSON.stringify(reviews));
};

function addNotification(title, message) {
  notifications.unshift({
    id: Date.now() + Math.random(),
    title,
    message,
    date: new Date().toLocaleString("id-ID"),
    read: false
  });
  notifications = notifications.slice(0, 60);
  renderNoticeCount?.();
}

function renderNoticeCount() {
  const el = $("noticeCount");
  if (el) el.textContent = notifications.filter(n => !n.read).length;
}

function validateVoucher(code, subtotal) {
  if (!code) return { valid: false, discount: 0, message: "" };
  const v = vouchers.find(x => x.code.toUpperCase() === code.toUpperCase() && x.active);
  if (!v) return { valid: false, discount: 0, message: "Kode voucher tidak ditemukan atau tidak aktif." };
  if (subtotal < Number(v.min || 0)) return { valid: false, discount: 0, message: `Minimal belanja ${rupiah(v.min)}.` };
  if (v.usageLimit && Number(v.used || 0) >= Number(v.usageLimit)) return { valid: false, discount: 0, message: "Kuota voucher sudah habis." };
  const discount = Math.min(
    v.type === "percent" ? subtotal * Number(v.value) / 100 : Number(v.value),
    Number(v.maxDiscount || Infinity),
    subtotal
  );
  return { valid: true, discount: Math.floor(discount), code: v.code, message: `Voucher ${v.code} berhasil dipakai.` };
}

function applyVoucherPreview() {
  const code = $("voucherInput").value.trim();
  const subtotal = cart.reduce((s, x) => s + (products.find(p => p.id === x.id)?.price || 0) * x.quantity, 0);
  const r = validateVoucher(code, subtotal);
  $("voucherMessage").textContent = r.message || "Masukkan kode voucher.";
  $("voucherMessage").style.color = r.valid ? "#16824e" : "#c54444";
  if (r.valid) {
    appliedVoucher = r.code;
    $("checkoutTotal").textContent = rupiah(subtotal - r.discount);
  } else {
    $("checkoutTotal").textContent = rupiah(subtotal);
    appliedVoucher = null;
  }
}

function openFeatureModal(title, body) {
  let m = $("featureModal");
  if (!m) {
    m = document.createElement("div");
    m.id = "featureModal";
    m.className = "modal-wrap";
    m.addEventListener("click", e => { if (e.target === m) m.classList.remove("show"); });
    m.innerHTML = '<div class="modal" style="width:760px"><div class="modal-head"><h3 id="featureTitle"></h3><button class="close" onclick="closeModal(\'featureModal\')">×</button></div><div id="featureBody"></div></div>';
    document.body.appendChild(m);
  }
  $("featureTitle").textContent = title;
  $("featureBody").innerHTML = body;
  m.classList.add("show");
}

function addCompare(id) {
  if (compareIds.includes(id)) {
    compareIds = compareIds.filter(x => x !== id);
    toast("Produk dihapus dari perbandingan.");
  } else if (compareIds.length >= 3) {
    toast("Maksimal 3 produk untuk dibandingkan.");
    return;
  } else {
    compareIds.push(id);
    toast("Produk ditambahkan ke perbandingan.");
  }
  save();
  renderProducts();
}

function openCompare() {
  const list = compareIds.map(id => products.find(p => p.id === id)).filter(Boolean);
  if (!list.length) return toast("Pilih produk melalui tombol Bandingkan terlebih dahulu.");
  const rows = [
    ["Harga", ...list.map(p => rupiah(p.price))],
    ["Jenis", ...list.map(p => p.type === "digital" ? "Digital" : "Fisik")],
    ["Kategori", ...list.map(p => p.category)],
    ["Stok/kuota", ...list.map(p => p.stock)],
    ["Rating", ...list.map(p => averageRating(p.id).toFixed(1) + " ★")],
    ["Deskripsi", ...list.map(p => esc(p.description || "-"))]
  ];
  openFeatureModal("Bandingkan produk", `<div class="table-scroll">
    <table class="admin-table">
      <thead><tr><th>Informasi</th>${list.map(p => `<th>${esc(p.name)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map((x, i) => `<td>${i === 0 ? "<b>" + x + "</b>" : x}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>
  <div style="display:flex;justify-content:flex-end;margin-top:14px">
    <button class="btn btn-light" onclick="compareIds=[];save();closeModal('featureModal');renderProducts()">Kosongkan perbandingan</button>
  </div>`);
}

function openNotifications() {
  notifications.forEach(n => n.read = true);
  save();
  renderNoticeCount();
  const body = notifications.length
    ? notifications.map(n => `<div style="padding:12px;border-bottom:1px solid var(--line)">
        <b>${esc(n.title)}</b>
        <p style="font-size:12px;margin:5px 0">${esc(n.message)}</p>
        <small style="color:var(--muted)">${esc(n.date)}</small>
      </div>`).join("")
    : `<div class="empty">Belum ada notifikasi.</div>`;
  openFeatureModal("Notifikasi", body);
}

function normalizePhone(s) {
  return String(s || "").replace(/\D/g, "").replace(/^0/, "62");
}

function orderLookupUI(mode) {
  const title = mode === "history" ? "Riwayat pesanan" : "Lacak pesanan";
  openFeatureModal(title, `<form id="lookupForm">
    <div class="field"><label>Nomor WhatsApp saat checkout</label><input name="phone" required inputmode="tel" placeholder="08xxxxxxxxxx"></div>
    ${mode === "track" ? '<div class="field"><label>Nomor pesanan</label><input name="orderId" required placeholder="Contoh: RN12345678"></div>' : ""}
    <button class="btn btn-primary">Cari pesanan</button>
  </form><div id="lookupResult" style="margin-top:14px"></div>`);

  $("lookupForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const phone = normalizePhone(f.get("phone"));
    const found = orders.filter(o =>
      normalizePhone(o.phone) === phone &&
      (mode !== "track" || o.id.toLowerCase() === String(f.get("orderId")).trim().toLowerCase())
    );
    $("lookupResult").innerHTML = found.length
      ? found.map(o => `<div style="border:1px solid var(--line);border-radius:10px;padding:13px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <b>${esc(o.id)}</b>
            <span class="status-pill ${o.status === "Selesai" ? "done" : o.status === "Dibatalkan" ? "cancel" : ""}">${esc(o.status)}</span>
          </div>
          <p style="font-size:11px;color:var(--muted);margin:6px 0">${esc(o.date)}</p>
          <b>${rupiah(o.total)}</b>
          <p style="font-size:11px;margin-top:8px">${(o.items || []).map(i => `${esc(products.find(p => p.id === i.id)?.name || "Produk")} × ${i.quantity}`).join("<br>")}</p>
          ${o.deliveryInfo ? `<div class="notice" style="margin-top:10px">Informasi pengiriman digital / resi:<br>${esc(o.deliveryInfo)}</div>` : ""}
        </div>`).join("")
      : `<div class="empty">Pesanan tidak ditemukan. Periksa nomor WhatsApp dan nomor pesanan.</div>`;
  });
}

function averageRating(id) {
  const list = reviews.filter(r => r.productId === id);
  if (!list.length) {
    const p = products.find(x => x.id === id);
    return Number(p?.rating) || 0;
  }
  return list.reduce((s, r) => s + r.stars, 0) / list.length;
}

function renderReviews(id) {
  const list = reviews.filter(r => r.productId === id);
  return `<div style="margin-top:18px;border-top:1px solid var(--line);padding-top:14px">
    <h3 style="font-size:14px">Ulasan pembeli (${list.length})</h3>
    ${list.length
      ? list.map(r => `<div style="padding:10px 0;border-bottom:1px solid var(--line)">
          <b style="font-size:11px">${esc(r.name)}</b>
          <span style="color:#edae35">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</span>
          <p style="font-size:11px;color:var(--muted);margin-top:5px">${esc(r.comment)}</p>
          <small style="color:var(--muted)">${esc(r.date)}</small>
        </div>`).join("")
      : '<p style="font-size:11px;color:var(--muted);margin:8px 0">Belum ada ulasan.</p>'}
    <form onsubmit="submitReview(event,${id})" style="margin-top:13px">
      <div class="notice">Ulasan hanya dapat dikirim jika pesanan produk ini sudah berstatus Selesai. Siapkan nomor pesanan dan nomor WhatsApp checkout.</div>
      <div class="form-grid">
        <div class="field"><label>Nomor pesanan</label><input name="orderId" required></div>
        <div class="field"><label>Nomor WhatsApp checkout</label><input name="phone" required inputmode="tel"></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Nama tampilan</label><input name="name" required maxlength="40"></div>
        <div class="field">
          <label>Rating</label>
          <select name="stars">
            <option value="5">5 - Sangat puas</option>
            <option value="4">4 - Puas</option>
            <option value="3">3 - Cukup</option>
            <option value="2">2 - Kurang</option>
            <option value="1">1 - Tidak puas</option>
          </select>
        </div>
      </div>
      <div class="field"><label>Ulasan</label><textarea name="comment" maxlength="300" required></textarea></div>
      <button class="btn btn-primary">Kirim ulasan</button>
    </form>
  </div>`;
}

function submitReview(e, id) {
  e.preventDefault();
  const f = new FormData(e.target);
  const order = orders.find(o =>
    o.id.toLowerCase() === String(f.get("orderId")).trim().toLowerCase() &&
    normalizePhone(o.phone) === normalizePhone(f.get("phone"))
  );
  if (!order || order.status !== "Selesai" || !order.items.some(x => x.id === id))
    return toast("Ulasan hanya tersedia untuk produk dari pesanan selesai.");
  order.reviewed = order.reviewed || [];
  if (order.reviewed.includes(id)) return toast("Produk ini sudah kamu ulas.");
  reviews.unshift({
    productId: id,
    orderId: order.id,
    name: String(f.get("name")).trim(),
    stars: Number(f.get("stars")),
    comment: String(f.get("comment")).trim(),
    date: new Date().toLocaleDateString("id-ID")
  });
  order.reviewed.push(id);
  save();
  showDetail(id);
  toast("Terima kasih, ulasan berhasil dikirim.");
}

/* Override showDetail & renderProducts dengan versi v5.0 yang mendukung review/compare */
function showDetail(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  $("detailContent").innerHTML = `<div class="modal-head"><h3>Detail produk</h3><button class="close" onclick="closeModal('detailModal')">×</button></div>
    <div class="detail-layout">
      <img src="${esc(p.image)}" alt="${esc(p.name)}">
      <div>
        <span class="muted">${p.type === "digital" ? "Produk digital" : "Produk fisik"} · ${esc(p.category)}</span>
        <h2>${esc(p.name)}</h2>
        <div class="stars"><i class="fa-solid fa-star"></i> ${averageRating(id) ? averageRating(id).toFixed(1) : "Belum ada rating"} (${reviews.filter(r => r.productId === id).length} ulasan)</div>
        <div class="price">${rupiah(p.price)}</div>
        <p>${esc(p.description || "Belum ada deskripsi.")}</p>
        <p><b>${p.type === "digital" ? "Kuota tersedia" : "Stok tersedia"}:</b> ${p.stock}</p>
        ${p.type === "digital" ? `<p><b>Data checkout:</b> ${esc(p.digitalRequirement || "Tidak ada data tambahan")}</p>` : ""}
        <button class="btn btn-primary" onclick="addCart(${p.id});closeModal('detailModal')">Tambah ke keranjang</button>
        <button class="btn btn-light" style="margin-top:8px" onclick="addCompare(${p.id})">⇄ Bandingkan</button>
      </div>
    </div>
    ${renderReviews(id)}`;
  openModal("detailModal");
}

function renderProducts() {
  const q = $("searchInput").value.toLowerCase().trim();
  let list = products.filter(p =>
    (activeType === "all" || p.type === activeType) &&
    (activeSub === "all" || p.category === activeSub) &&
    (`${p.name} ${p.category} ${p.description || ""}`.toLowerCase().includes(q)) &&
    (!showOnlyFavorites || favorites.includes(p.id))
  );
  const sort = $("sortSelect")?.value || "default";
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  if (sort === "high") list.sort((a, b) => b.price - a.price);
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "id"));
  if (sort === "stock") list.sort((a, b) => b.stock - a.stock);

  $("productSubtitle").textContent = `Menampilkan ${list.length} dari ${products.length} produk`;
  $("favoriteCount").textContent = favorites.length;
  $("favoritesToggle").classList.toggle("active", showOnlyFavorites);

  $("productList").innerHTML = list.length
    ? list.map(p => {
        const d = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
        const fav = favorites.includes(p.id);
        const rating = averageRating(p.id);
        return `<article class="product">
          <div class="product-photo" onclick="showDetail(${p.id})">
            ${d ? `<span class="discount">-${d}%</span>` : ""}
            <span class="type-pill">${p.type === "digital" ? "DIGITAL" : "FISIK"}</span>
            <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='https://placehold.co/600x450?text=Product'">
            <button class="favorite-btn ${fav ? "active" : ""}" aria-label="Favorit" onclick="event.stopPropagation();toggleFavorite(${p.id})">${fav ? "♥" : "♡"}</button>
          </div>
          <div class="product-info">
            <span class="muted">${esc(p.category)}</span>
            <h3 class="product-name" onclick="showDetail(${p.id})">${esc(p.name)}</h3>
            <div class="stars">★ ${rating ? rating.toFixed(1) : "Baru"} <span style="color:var(--muted)">(${reviews.filter(r => r.productId === p.id).length})</span></div>
            <div>
              <span class="price">${rupiah(p.price)}</span>
              ${p.oldPrice > p.price ? `<span class="old">${rupiah(p.oldPrice)}</span>` : ""}
            </div>
            <div class="stock ${p.stock <= 0 ? "out" : p.stock <= 5 ? "low" : ""}">
              ${p.stock > 0 ? (p.type === "digital" ? `Kuota tersedia: ${p.stock}` : `Stok tersedia: ${p.stock}`) : "Stok habis"}
            </div>
            <div class="product-actions">
              <button class="detail-btn" onclick="showDetail(${p.id})">Detail</button>
              <button class="add" onclick="addCart(${p.id})" ${p.stock <= 0 ? "disabled" : ""}>+ Keranjang</button>
              <button class="detail-btn" title="Bandingkan" onclick="addCompare(${p.id})">${compareIds.includes(p.id) ? "✓" : "⇄"}</button>
            </div>
          </div>
        </article>`;
      }).join("")
    : `<div class="empty"><p>${showOnlyFavorites ? "Belum ada produk favorit." : "Produk tidak ditemukan."}</p></div>`;
}

function setOrderStatus(id, s) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  const previous = o.status;
  o.status = s;

  if (s === "Dibatalkan" && o.stockDeducted) {
    (o.items || []).forEach(i => {
      const p = products.find(x => x.id === i.id);
      if (p) p.stock += i.quantity;
    });
    o.stockDeducted = false;
  }

  if (previous === "Dibatalkan" && s !== "Dibatalkan" && !o.stockDeducted) {
    let enough = (o.items || []).every(i => (products.find(p => p.id === i.id)?.stock || 0) >= i.quantity);
    if (!enough) {
      o.status = previous;
      return toast("Stok tidak cukup untuk mengaktifkan kembali pesanan.");
    }
    (o.items || []).forEach(i => {
      const p = products.find(x => x.id === i.id);
      if (p) p.stock -= i.quantity;
    });
    o.stockDeducted = true;
  }

  addNotification("Status pesanan berubah", `Pesanan ${id}: ${s}.`);
  save();
  renderProducts();
  renderAdmin("orders");
  toast("Status pesanan diperbarui.");
}

function orderDetail(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  const itemLines = (o.items || []).map(i => {
    const p = products.find(x => x.id === i.id);
    return `${p?.name || "Produk"} × ${i.quantity}`;
  }).join(", ");
  openFeatureModal("Kelola pesanan " + id, `<div class="notice">
      <b>${esc(o.customer)}</b> · ${esc(o.phone)}<br>
      ${esc(itemLines)}<br>
      Total: ${rupiah(o.total)}<br>
      Status: ${esc(o.status)}
    </div>
    <div class="field">
      <label>Info resi / pengiriman digital / kode pesanan</label>
      <textarea id="deliveryInfoInput" maxlength="1000" placeholder="Isi resi, kode voucher, instruksi aktivasi, atau informasi pengiriman digital">${esc(o.deliveryInfo || "")}</textarea>
    </div>
    <button class="btn btn-primary" onclick="saveDeliveryInfo('${o.id}')">Simpan informasi</button>
    <button class="btn btn-light" onclick="sendDeliveryWhatsApp('${o.id}')">Kirim via WhatsApp</button>`);
}

function saveDeliveryInfo(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  o.deliveryInfo = $("deliveryInfoInput").value.trim();
  addNotification("Informasi pengiriman diperbarui", `Pesanan ${id} memiliki informasi pengiriman baru.`);
  save();
  toast("Informasi pengiriman disimpan.");
}

function sendDeliveryWhatsApp(id) {
  const o = orders.find(x => x.id === id);
  if (!o || !o.deliveryInfo) return toast("Isi informasi pengiriman terlebih dahulu.");
  const phone = normalizePhone(o.phone);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent("Informasi pesanan " + o.id + ":\n" + o.deliveryInfo)}`, "_blank");
}

function ordersTableHtmlV5(rows) {
  return `<div class="table-scroll">
    <table class="admin-table">
      <thead><tr><th>Pesanan</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Detail</th></tr></thead>
      <tbody>${rows.map(o => `<tr>
        <td><b>${esc(o.id)}</b><br>${esc(o.date)}</td>
        <td>${esc(o.customer)}</td>
        <td>${rupiah(o.total)}</td>
        <td>
          <select onchange="setOrderStatus('${o.id}',this.value)">
            ${["Menunggu konfirmasi","Menunggu pembayaran","Diproses","Dikirim","Selesai","Dibatalkan"]
              .map(s => `<option ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </td>
        <td><button onclick="orderDetail('${o.id}')">Kelola</button></td>
      </tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function renderAdmin(tab) {
  const total = orders.filter(o => o.status !== "Dibatalkan").reduce((s, o) => s + Number(o.total || 0), 0);
  const pending = orders.filter(o => !["Selesai","Dibatalkan"].includes(o.status)).length;
  $("adminStats").innerHTML = `<div class="stat"><small>Total produk</small><strong>${products.length}</strong></div>
    <div class="stat"><small>Total pesanan</small><strong>${orders.length}</strong></div>
    <div class="stat"><small>Omzet pesanan aktif</small><strong style="font-size:13px">${rupiah(total)}</strong></div>
    <div class="stat"><small>Perlu ditangani</small><strong>${pending}</strong></div>`;

  const v = $("adminView");

  if (tab === "products") {
    v.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <b>Daftar produk</b>
      <button class="btn btn-primary" onclick="editProduct()">+ Tambah produk</button>
    </div>
    <div class="table-scroll">
      <table class="admin-table">
        <thead><tr><th>Produk</th><th>Jenis</th><th>Harga</th><th>Stok</th><th>Aksi</th></tr></thead>
        <tbody>${products.map(p => `<tr>
          <td>${esc(p.name)}</td>
          <td>${p.type}</td>
          <td>${rupiah(p.price)}</td>
          <td>${p.stock}</td>
          <td><button onclick="editProduct(${p.id})">Edit</button><button onclick="deleteProduct(${p.id})">Hapus</button></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`;
  } else if (tab === "orders") {
    v.innerHTML = `<div class="admin-toolbar">
      <b>Daftar pesanan (${orders.length})</b>
      <div>
        <input id="orderSearchV5" placeholder="Cari nomor / pelanggan..." oninput="filterOrdersV5()">
        <button class="btn btn-light" onclick="exportOrders()">Unduh CSV</button>
      </div>
    </div>
    <div id="ordersTableV5">${orders.length ? ordersTableHtmlV5(orders) : '<div class="empty">Belum ada pesanan.</div>'}</div>`;
  } else if (tab === "vouchers") {
    v.innerHTML = `<form id="voucherForm" class="notice">
      <b>Buat voucher baru</b>
      <div class="form-grid" style="margin-top:10px">
        <div class="field"><label>Kode</label><input name="code" required maxlength="20" placeholder="PROMO15"></div>
        <div class="field"><label>Jenis diskon</label><select name="type"><option value="percent">Persentase (%)</option><option value="fixed">Potongan nominal (Rp)</option></select></div>
        <div class="field"><label>Nilai diskon</label><input name="value" type="number" min="1" required></div>
        <div class="field"><label>Minimal belanja</label><input name="min" type="number" min="0" value="0"></div>
        <div class="field"><label>Maksimal diskon (Rp)</label><input name="maxDiscount" type="number" min="0" value="50000"></div>
        <div class="field"><label>Batas penggunaan (0 = tanpa batas)</label><input name="usageLimit" type="number" min="0" value="0"></div>
      </div>
      <button class="btn btn-primary">Simpan voucher</button>
    </form>
    <div class="table-scroll">
      <table class="admin-table">
        <thead><tr><th>Kode</th><th>Diskon</th><th>Min. belanja</th><th>Terpakai</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${vouchers.map(x => `<tr>
          <td><b>${esc(x.code)}</b></td>
          <td>${x.type === "percent" ? x.value + "%" : rupiah(x.value)}</td>
          <td>${rupiah(x.min)}</td>
          <td>${x.used || 0}${x.usageLimit ? "/" + x.usageLimit : ""}</td>
          <td>${x.active ? "Aktif" : "Nonaktif"}</td>
          <td><button onclick="toggleVoucher('${x.code}')">${x.active ? "Nonaktifkan" : "Aktifkan"}</button><button onclick="deleteVoucher('${x.code}')">Hapus</button></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`;
  } else if (tab === "analytics") {
    v.innerHTML = `<div class="stat-grid">
        <div class="stat"><small>Omzet selesai</small><strong>${rupiah(orders.filter(o => o.status === "Selesai").reduce((s, o) => s + o.total, 0))}</strong></div>
        <div class="stat"><small>Pesanan selesai</small><strong>${orders.filter(o => o.status === "Selesai").length}</strong></div>
        <div class="stat"><small>Stok menipis</small><strong>${products.filter(p => p.stock > 0 && p.stock <= 5).length}</strong></div>
      </div>
      <div class="stat">
        <b>Grafik pesanan 7 hari terakhir</b>
        <canvas id="salesChart" width="680" height="230" style="width:100%;height:230px;margin-top:12px"></canvas>
      </div>
      <div class="stat" style="margin-top:12px">
        <b>Produk terlaris</b>
        <ol style="padding:12px 20px;font-size:12px">${topProducts().map(x => `<li>${esc(x.name)} — ${x.qty} terjual</li>`).join("") || "<li>Belum ada data penjualan.</li>"}</ol>
      </div>`;
  } else if (tab === "appearance") {
    v.innerHTML = `<form id="appearanceForm">
      <div class="notice">Pengaturan ini mengubah tampilan toko di browser ini. Gunakan URL gambar HTTPS yang bisa diakses publik.</div>
      <div class="form-grid">
        <div class="field"><label>Nama toko</label><input name="shopName" value="${esc(settings.shopName)}" required></div>
        <div class="field"><label>Teks pengumuman</label><input name="announcement" value="${esc(settings.announcement)}"></div>
      </div>
      <div class="field"><label>Judul banner</label><input name="heroTitle" value="${esc(settings.heroTitle)}"></div>
      <div class="field"><label>Deskripsi banner</label><textarea name="heroDescription">${esc(settings.heroDescription)}</textarea></div>
      <div class="field"><label>URL gambar banner</label><input name="heroImage" type="url" value="${esc(settings.heroImage)}"></div>
      <div class="form-grid">
        <div class="field"><label>Warna utama</label><input name="primary" type="color" value="${esc(settings.primary)}"></div>
        <div class="field"><label>Warna aksen</label><input name="accent" type="color" value="${esc(settings.accent)}"></div>
      </div>
      <div class="field"><label>Tagline footer</label><input name="tagline" value="${esc(settings.tagline)}"></div>
      <div class="field"><label>Nomor WhatsApp toko (format 62...)</label><input name="whatsapp" value="${esc(settings.whatsapp)}" required></div>
      <button class="btn btn-primary">Simpan tampilan</button>
    </form>`;
  } else if (tab === "settings") {
    v.innerHTML = `<div class="notice">Login dan penyimpanan masih berjalan di browser. Untuk keamanan produksi diperlukan autentikasi server dan database.</div>
      <form id="securityForm">
        <div class="field"><label>Password admin baru</label><input name="newPassword" type="password" minlength="10" required></div>
        <div class="field"><label>Ulangi password baru</label><input name="confirmPassword" type="password" minlength="10" required></div>
        <button class="btn btn-primary">Ganti password</button>
      </form>`;
  }

  if (tab === "vouchers") {
    $("voucherForm").addEventListener("submit", e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const code = String(f.get("code")).trim().toUpperCase();
      if (vouchers.some(x => x.code === code)) return toast("Kode voucher sudah digunakan.");
      vouchers.unshift({
        code,
        type: f.get("type"),
        value: Number(f.get("value")),
        min: Number(f.get("min") || 0),
        maxDiscount: Number(f.get("maxDiscount") || Infinity),
        usageLimit: Number(f.get("usageLimit") || 0),
        used: 0,
        active: true
      });
      save();
      renderAdmin("vouchers");
      toast("Voucher berhasil dibuat.");
    });
  }

  if (tab === "appearance") $("appearanceForm").addEventListener("submit", saveAppearance);
  if (tab === "settings") $("securityForm").addEventListener("submit", changePassword);
  if (tab === "analytics") drawSalesChart();
}

function filterOrdersV5() {
  const q = $("orderSearchV5").value.toLowerCase();
  const rows = orders.filter(o => (o.id + " " + o.customer + " " + o.phone).toLowerCase().includes(q));
  $("ordersTableV5").innerHTML = rows.length ? ordersTableHtmlV5(rows) : '<div class="empty">Pesanan tidak ditemukan.</div>';
}

function topProducts() {
  const totals = {};
  orders.filter(o => o.status !== "Dibatalkan").forEach(o =>
    (o.items || []).forEach(i => totals[i.id] = (totals[i.id] || 0) + i.quantity)
  );
  return Object.entries(totals)
    .map(([id, qty]) => ({ name: products.find(p => p.id === Number(id))?.name || "Produk", qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
}

function drawSalesChart() {
  const c = $("salesChart");
  if (!c) return;
  const ctx = c.getContext("2d"), days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("id-ID");
    days.push({
      label: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      value: orders.filter(o => String(o.date || "").startsWith(key) && o.status !== "Dibatalkan")
        .reduce((s, o) => s + Number(o.total || 0), 0)
    });
  }
  const max = Math.max(1, ...days.map(x => x.value));
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = "11px sans-serif";
  ctx.strokeStyle = "#dce4ef";
  ctx.fillStyle = "#7b8493";
  ctx.beginPath();
  ctx.moveTo(38, 12);
  ctx.lineTo(38, 195);
  ctx.lineTo(665, 195);
  ctx.stroke();
  days.forEach((d, i) => {
    const x = 55 + i * 86, h = d.value / max * 145;
    ctx.fillStyle = "#2878f0";
    ctx.fillRect(x, 195 - h, 34, h);
    ctx.fillStyle = "#68758a";
    ctx.fillText(d.label, x - 7, 216);
    ctx.fillText(d.value ? Math.round(d.value / 1000) + "k" : "0", x - 3, Math.max(12, 185 - h));
  });
}

function toggleVoucher(code) {
  const v = vouchers.find(x => x.code === code);
  if (v) { v.active = !v.active; save(); renderAdmin("vouchers"); }
}

function deleteVoucher(code) {
  if (!confirm("Hapus voucher " + code + "?")) return;
  vouchers = vouchers.filter(x => x.code !== code);
  save();
  renderAdmin("vouchers");
}

function exportOrders() {
  if (!orders.length) return toast("Belum ada data pesanan.");
  const cols = ["Nomor","Tanggal","Pelanggan","WhatsApp","Alamat","Email digital","ID akun","Kurir","Subtotal","Diskon","Voucher","Total","Status","Info pengiriman"];
  const rows = orders.map(o => [o.id, o.date, o.customer, o.phone, o.address, o.digitalEmail, o.accountId, o.courier, o.subtotal, o.discount, o.voucher, o.total, o.status, o.deliveryInfo]);
  const csv = [cols, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "rona-market-pesanan.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function addQuickLinks() {
  const sec = $("productSection");
  if (!$("customerTools")) {
    const bar = document.createElement("div");
    bar.id = "customerTools";
    bar.className = "filters";
    bar.style.marginTop = "18px";
    bar.innerHTML = '<button class="filter" onclick="openCompare()">⇄ Bandingkan (<span id="compareCount">0</span>)</button><button class="filter" onclick="orderLookupUI(\'track\')">Lacak pesanan</button><button class="filter" onclick="orderLookupUI(\'history\')">Riwayat pesanan</button>';
    sec.insertBefore(bar, sec.querySelector(".products"));
  }
  $("compareCount").textContent = compareIds.length;
  renderNoticeCount();
}

const favBase = toggleFavorite;
toggleFavorite = function (id) { favBase(id); };

window.addEventListener("storage", () => { renderProducts(); renderCart(); });

addQuickLinks();
renderProducts();
renderNoticeCount();