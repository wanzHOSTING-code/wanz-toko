/* ============================================================
   Logika inti toko: tampilan, produk, keranjang, checkout, admin
   (kode asli v5.1 — tidak diubah)
   ============================================================ */

function applyAppearance() {
  document.documentElement.style.setProperty("--blue", settings.primary || "#2878f0");
  document.documentElement.style.setProperty("--orange", settings.accent || "#ff914d");
  $("announcement").textContent = settings.announcement;
  $("heroTitle").textContent = settings.heroTitle;
  $("heroDescription").textContent = settings.heroDescription;
  $("heroImage").src = settings.heroImage;
  $("brandLogo").innerHTML = esc(settings.shopName.replace(/\s+Market$/i, "").toLowerCase()) + '<span>.</span>';
  $("footerLogo").innerHTML = $("brandLogo").innerHTML;
  $("footerTagline").textContent = settings.tagline;
  $("copyrightName").textContent = settings.shopName;
  document.title = settings.shopName + " — Belanja Lebih Mudah";
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
            <div class="stars"><i class="fa-solid fa-star"></i> ${esc(p.rating || "Baru")}</div>
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
            </div>
          </div>
        </article>`;
      }).join("")
    : `<div class="empty"><i class="fa-solid fa-box-open"></i><p style="margin-top:8px">${showOnlyFavorites ? "Belum ada produk favorit." : "Produk tidak ditemukan."}</p></div>`;
}

function toggleFavorite(id) {
  favorites = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id];
  save();
  renderProducts();
  toast(favorites.includes(id) ? "Ditambahkan ke favorit." : "Dihapus dari favorit.");
}

function toggleFavorites() {
  showOnlyFavorites = !showOnlyFavorites;
  renderProducts();
}

$("sortSelect").addEventListener("change", renderProducts);

function setCategory(t, b) {
  activeType = t;
  document.querySelectorAll("#categoryFilters .filter").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  renderProducts();
}

function setSubCategory(t, b) {
  activeSub = t;
  document.querySelectorAll("#typeFilters .filter").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  renderProducts();
}

$("searchInput").addEventListener("input", renderProducts);

function addCart(id) {
  const p = products.find(x => x.id === id);
  if (!p || p.stock < 1) return toast("Stok/kuota tidak tersedia.");
  const item = cart.find(x => x.id === id);
  if (item) {
    if (item.quantity >= p.stock) return toast("Jumlah melebihi stok.");
    item.quantity++;
  } else {
    cart.push({ id, quantity: 1 });
  }
  save();
  renderCart();
  toast("Produk ditambahkan.");
}

function renderCart() {
  cart = cart.filter(x => products.some(p => p.id === x.id));
  const count = cart.reduce((s, x) => s + x.quantity, 0);
  const total = cart.reduce((s, x) => s + (products.find(p => p.id === x.id)?.price || 0) * x.quantity, 0);
  $("cartCount").textContent = count;
  $("cartTotal").textContent = rupiah(total);
  $("cartItems").innerHTML = cart.length
    ? cart.map(x => {
        const p = products.find(y => y.id === x.id);
        return `<div class="cart-row">
          <img src="${esc(p.image)}" alt="">
          <div class="cart-row-main">
            <h4>${esc(p.name)} <small style="color:#7b8493">(${p.type === "digital" ? "Digital" : "Fisik"})</small></h4>
            <p>${rupiah(p.price)}</p>
            <div class="qty">
              <button onclick="changeQty(${p.id},-1)">−</button>
              <span>${x.quantity}</span>
              <button onclick="changeQty(${p.id},1)">+</button>
            </div>
          </div>
          <button class="close" style="font-size:17px" onclick="removeCart(${p.id})">×</button>
        </div>`;
      }).join("")
    : `<div class="empty"><i class="fa-solid fa-bag-shopping"></i><p style="margin-top:8px">Keranjang masih kosong.</p></div>`;
  save();
}

function changeQty(id, d) {
  const x = cart.find(y => y.id === id);
  const p = products.find(y => y.id === id);
  if (!x || !p) return;
  if (d > 0 && x.quantity >= p.stock) return toast("Jumlah melebihi stok.");
  x.quantity += d;
  if (x.quantity <= 0) cart = cart.filter(y => y.id !== id);
  save();
  renderCart();
}

function removeCart(id) {
  cart = cart.filter(x => x.id !== id);
  save();
  renderCart();
}

function openCart() {
  $("overlay").classList.add("show");
  $("cartDrawer").classList.add("show");
}

function closeCart() {
  $("overlay").classList.remove("show");
  $("cartDrawer").classList.remove("show");
}

function showDetail(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  $("detailContent").innerHTML = `<div class="modal-head"><h3>Detail produk</h3><button class="close" onclick="closeModal('detailModal')">×</button></div>
    <div class="detail-layout">
      <img src="${esc(p.image)}" alt="${esc(p.name)}">
      <div>
        <span class="muted">${p.type === "digital" ? "Produk digital" : "Produk fisik"} · ${esc(p.category)}</span>
        <h2>${esc(p.name)}</h2>
        <div class="stars"><i class="fa-solid fa-star"></i> ${esc(p.rating || "Baru")}</div>
        <div class="price">${rupiah(p.price)}</div>
        <p>${esc(p.description || "Belum ada deskripsi.")}</p>
        <p><b>${p.type === "digital" ? "Kuota tersedia" : "Stok tersedia"}:</b> ${p.stock}</p>
        ${p.type === "digital" ? `<p><b>Data checkout:</b> ${esc(p.digitalRequirement || "Tidak ada data tambahan")}</p>` : ""}
        <button class="btn btn-primary" onclick="addCart(${p.id});closeModal('detailModal')">Tambah ke keranjang</button>
      </div>
    </div>`;
  openModal("detailModal");
}

function openModal(id) { $(id).classList.add("show"); }
function closeModal(id) { $(id).classList.remove("show"); }

function openCheckout() {
  if (!cart.length) return toast("Keranjang masih kosong.");
  if (cart.some(x => { const p = products.find(y => y.id === x.id); return !p || x.quantity > p.stock; })) return toast("Periksa kembali stok/kuota.");
  const hasPhysical = cart.some(x => products.find(p => p.id === x.id).type === "fisik");
  const hasDigital = cart.some(x => products.find(p => p.id === x.id).type === "digital");
  $("physicalFields").hidden = !hasPhysical;
  $("digitalFields").hidden = !hasDigital;
  $("checkoutHeading").textContent = hasPhysical && hasDigital ? "Data pesanan campuran" : hasDigital ? "Data pesanan digital" : "Data pengiriman";
  $("checkoutForm").elements.address.required = hasPhysical;
  $("checkoutForm").elements.digitalEmail.required = false;
  $("checkoutForm").elements.accountId.required = false;
  $("checkoutTotal").textContent = rupiah(cart.reduce((s, x) => s + products.find(p => p.id === x.id).price * x.quantity, 0));
  closeCart();
  openModal("checkoutModal");
}

$("checkoutForm").addEventListener("submit", e => {
  e.preventDefault();
  if (!cart.length) return;

  const wa = String(settings.whatsapp || "").replace(/\D/g, "");
  if (!wa || wa === "6281234567890") return toast("Atur nomor WhatsApp toko di Admin > Tampilan toko.");

  const f = new FormData(e.target);
  const customer = String(f.get("customer") || "").trim();
  const phone = String(f.get("phone") || "").trim();
  const address = String(f.get("address") || "").trim();

  if (phone.replace(/\D/g, "").length < 9) return toast("Periksa kembali nomor WhatsApp pemesan.");

  const items = cart.map(x => ({ ...x }));
  const hasPhysical = items.some(x => products.find(p => p.id === x.id)?.type === "fisik");
  const hasDigital = items.some(x => products.find(p => p.id === x.id)?.type === "digital");

  if (hasPhysical && !address) return toast("Alamat pengiriman wajib diisi untuk produk fisik.");
  if (items.some(x => { const p = products.find(y => y.id === x.id); return !p || x.quantity > p.stock; })) return toast("Stok/kuota berubah. Periksa keranjang kembali.");

  const subtotal = items.reduce((s, x) => s + products.find(p => p.id === x.id).price * x.quantity, 0);
  const promo = validateVoucher(String(f.get("voucher") || "").trim(), subtotal);
  if (f.get("voucher") && !promo.valid) return toast(promo.message);

  const discount = promo.valid ? promo.discount : 0;
  const total = Math.max(0, subtotal - discount);
  const id = "RN" + Date.now().toString().slice(-8);

  const detail = items.map(x => {
    const p = products.find(y => y.id === x.id);
    return `- ${p.name} (${p.type === "digital" ? "DIGITAL" : "FISIK"}) x${x.quantity} = ${rupiah(p.price * x.quantity)}`;
  }).join("\n");

  let message = `Halo ${settings.shopName}, saya ingin membuat pesanan.\nNomor: ${id}\n\n${detail}\nSubtotal: ${rupiah(subtotal)}\nDiskon: ${rupiah(discount)}\nTotal: ${rupiah(total)}\nNama: ${customer}\nWhatsApp: ${phone}\n`;
  if (hasPhysical) message += `Alamat pengiriman: ${address}\nKurir: ${f.get("courier")}\n`;
  if (hasDigital) message += `Email penerima: ${f.get("digitalEmail") || "-"}\nID/Username: ${f.get("accountId") || "-"}\n`;
  message += `Catatan: ${f.get("note") || "-"}\n\nMohon konfirmasi pesanan dan pembayaran.`;

  const win = window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, "_blank");
  if (!win) return toast("Izinkan pop-up browser agar WhatsApp dapat dibuka.");

  // Reserve stock when the order is created; cancelled orders restore it.
  items.forEach(x => {
    const p = products.find(y => y.id === x.id);
    if (p) p.stock -= x.quantity;
  });

  const order = {
    id,
    date: new Date().toLocaleString("id-ID"),
    timestamp: Date.now(),
    customer,
    phone,
    address: hasPhysical ? address : "-",
    digitalEmail: f.get("digitalEmail"),
    accountId: f.get("accountId"),
    courier: hasPhysical ? f.get("courier") : "Tidak perlu pengiriman fisik",
    note: f.get("note"),
    subtotal,
    discount,
    voucher: promo.valid ? promo.code : "",
    total,
    items,
    status: "Menunggu konfirmasi",
    deliveryInfo: "",
    stockDeducted: true,
    reviewed: []
  };
  orders.unshift(order);

  if (promo.valid) {
    const v = vouchers.find(x => x.code === promo.code);
    if (v) { v.used = (v.used || 0) + 1; }
  }

  addNotification("Pesanan baru dibuat", `Pesanan ${id} menunggu konfirmasi.`);
  save();
  renderProducts();
  cart = [];
  renderCart();
  closeModal("checkoutModal");
  e.target.reset();
  $("voucherMessage").textContent = "";
  toast("Pesanan dibuat. Lanjutkan dengan menekan Kirim di WhatsApp.");
});

function openAdmin() {
  openModal("adminModal");
  $("adminLogin").hidden = adminLogged;
  $("adminDashboard").hidden = !adminLogged;
  if (adminLogged) renderAdmin("products");
}

$("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  if (Date.now() < lockUntil) return toast("Terlalu banyak percobaan. Coba lagi sebentar.");
  const pass = new FormData(e.target).get("password");
  if (pass !== settings.adminPassword) {
    loginAttempts++;
    if (loginAttempts >= 5) {
      lockUntil = Date.now() + 60000;
      loginAttempts = 0;
      toast("Login dikunci 60 detik.");
    } else toast("Password salah.");
    return;
  }
  loginAttempts = 0;
  adminLogged = true;
  $("adminLogin").hidden = true;
  $("adminDashboard").hidden = false;
  startIdleTimer();
  renderAdmin("products");
});

function startIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (adminLogged) {
      adminLogout();
      toast("Sesi admin berakhir karena tidak aktif.");
    }
  }, 5 * 60 * 1000);
}

["click", "keydown", "mousemove", "touchstart"].forEach(ev =>
  document.addEventListener(ev, () => { if (adminLogged) startIdleTimer(); }, { passive: true })
);

function adminLogout() {
  adminLogged = false;
  clearTimeout(idleTimer);
  $("adminLogin").hidden = false;
  $("adminDashboard").hidden = true;
  $("loginForm").reset();
  toast("Sesi admin berakhir.");
}

function adminTab(tab, b) {
  document.querySelectorAll(".admin-tabs button").forEach(x => x.classList.remove("active"));
  b.classList.add("active");
  renderAdmin(tab);
}

function renderAdmin(tab) {
  const value = orders.reduce((s, o) => s + o.total, 0);
  $("adminStats").innerHTML = `<div class="stat"><small>Total produk</small><strong>${products.length}</strong></div>
    <div class="stat"><small>Total pesanan</small><strong>${orders.length}</strong></div>
    <div class="stat"><small>Nilai pesanan</small><strong style="font-size:13px">${rupiah(value)}</strong></div>`;

  const v = $("adminView");

  if (tab === "products") {
    v.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <b style="font-size:13px">Daftar produk</b>
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
          <td>
            <button onclick="editProduct(${p.id})"><i class="fa-solid fa-pen"></i></button>
            <button onclick="deleteProduct(${p.id})" style="color:var(--red)"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`;
  }

  if (tab === "orders") {
    v.innerHTML = `<div class="admin-toolbar">
      <b style="font-size:13px">Daftar pesanan (${orders.length})</b>
      <div>
        <input id="orderSearch" placeholder="Cari nomor / pelanggan..." oninput="filterAdminOrders()">
        <button class="btn btn-light" onclick="exportOrders()">Unduh CSV</button>
      </div>
    </div>
    <div id="ordersTable">${orders.length ? ordersTableHtml(orders) : `<div class="empty">Belum ada pesanan.</div>`}</div>`;
  }

  function ordersTableHtml(rows) {
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
          <td><button onclick="orderDetail('${o.id}')">Buka</button></td>
        </tr>`).join("")}</tbody>
      </table>
    </div>`;
  }

  function filterAdminOrders() {
    const q = $("orderSearch").value.toLowerCase();
    const rows = orders.filter(o => (o.id + " " + o.customer + " " + o.phone).toLowerCase().includes(q));
    $("ordersTable").innerHTML = rows.length ? ordersTableHtml(rows) : `<div class="empty">Pesanan tidak ditemukan.</div>`;
  }

  function exportOrders() {
    if (!orders.length) return toast("Belum ada data pesanan.");
    const cols = ["Nomor","Tanggal","Pelanggan","WhatsApp","Alamat","Email digital","ID akun","Kurir","Total","Status","Catatan"];
    const rows = orders.map(o => [o.id, o.date, o.customer, o.phone, o.address, o.digitalEmail, o.accountId, o.courier, o.total, o.status, o.note]);
    const csv = [cols, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rona-market-pesanan.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Data pesanan berhasil diunduh.");
  }

  if (tab === "appearance") {
    v.innerHTML = `<form id="appearanceForm">
      <div class="notice">Pengaturan ini mengubah tampilan toko di browser ini. Gunakan URL gambar HTTPS yang bisa diakses publik.</div>
      <div class="form-grid">
        <div class="field"><label>Nama toko</label><input name="shopName" value="${esc(settings.shopName)}" required></div>
        <div class="field"><label>Teks pengumuman di bagian atas</label><input name="announcement" value="${esc(settings.announcement)}"></div>
      </div>
      <div class="field"><label>Judul banner utama</label><input name="heroTitle" value="${esc(settings.heroTitle)}"></div>
      <div class="field"><label>Deskripsi banner</label><textarea name="heroDescription">${esc(settings.heroDescription)}</textarea></div>
      <div class="field"><label>URL gambar banner</label><input name="heroImage" type="url" value="${esc(settings.heroImage)}"></div>
      <div class="form-grid">
        <div class="field"><label>Warna utama</label><input name="primary" type="color" value="${esc(settings.primary)}" style="height:42px;padding:4px"></div>
        <div class="field"><label>Warna aksen</label><input name="accent" type="color" value="${esc(settings.accent)}" style="height:42px;padding:4px"></div>
      </div>
      <div class="field"><label>Tagline footer</label><input name="tagline" value="${esc(settings.tagline)}"></div>
      <div class="field"><label>Nomor WhatsApp toko (format 62...)</label><input name="whatsapp" value="${esc(settings.whatsapp)}" placeholder="628xxxxxxxxxx" required></div>
      <button class="btn btn-primary">Simpan tampilan & kontak toko</button>
    </form>`;
  }

  if (tab === "settings") {
    v.innerHTML = `<div class="notice">Peringatan keamanan: karena ini website statis satu file, password admin dan data browser tidak dapat diamankan sepenuhnya. Fitur di bawah hanya pengamanan ringan untuk penggunaan lokal.</div>
      <form id="securityForm">
        <div class="field"><label>Password admin baru</label><input name="newPassword" type="password" minlength="10" autocomplete="new-password" placeholder="Minimal 10 karakter" required></div>
        <div class="field"><label>Ulangi password baru</label><input name="confirmPassword" type="password" minlength="10" autocomplete="new-password" required></div>
        <button class="btn btn-primary">Ganti password</button>
      </form>
      <p style="font-size:11px;color:var(--muted);margin-top:15px">Sesi admin otomatis keluar setelah 5 menit tidak aktif. Setelah ganti password, tetap ingat bahwa siapa pun yang bisa mengakses browser atau file HTML dapat memeriksa atau mengubah data lokal.</p>`;
  }

  if (tab === "security") $("securityForm").addEventListener("submit", changePassword);
  if (tab === "appearance") $("appearanceForm").addEventListener("submit", saveAppearance);
}

function editProduct(id) {
  const p = products.find(x => x.id === id), f = $("productForm");
  f.reset();
  f.elements.id.value = p?.id || "";
  f.elements.type.value = p?.type || "fisik";
  f.elements.name.value = p?.name || "";
  f.elements.category.value = p?.category || "fashion";
  f.elements.stock.value = p?.stock ?? 0;
  f.elements.price.value = p?.price || "";
  f.elements.oldPrice.value = p?.oldPrice || p?.price || "";
  f.elements.image.value = p?.image || "";
  f.elements.description.value = p?.description || "";
  f.elements.digitalRequirement.value = p?.digitalRequirement || "";
  $("productFormTitle").textContent = p ? "Edit produk" : "Tambah produk";
  toggleProductFields();
  openModal("productFormModal");
}

function toggleProductFields() {
  const digital = $("productType").value === "digital";
  $("productForm").elements.digitalRequirement.parentElement.hidden = !digital;
}

$("productForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target), id = f.get("id");
  const p = {
    id: id ? Number(id) : Date.now(),
    type: f.get("type"),
    name: f.get("name").trim(),
    category: f.get("category"),
    stock: Math.max(0, Number(f.get("stock"))),
    price: Math.max(0, Number(f.get("price"))),
    oldPrice: Math.max(0, Number(f.get("oldPrice"))),
    image: f.get("image").trim(),
    description: f.get("description").trim(),
    digitalRequirement: f.get("digitalRequirement").trim(),
    rating: "Baru"
  };
  if (id) products = products.map(x => x.id === Number(id) ? { ...x, ...p, rating: x.rating } : x);
  else products.unshift(p);
  save();
  renderProducts();
  renderAdmin("products");
  closeModal("productFormModal");
  toast("Produk disimpan.");
});

function deleteProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p || !confirm(`Hapus ${p.name}?`)) return;
  products = products.filter(x => x.id !== id);
  cart = cart.filter(x => x.id !== id);
  favorites = favorites.filter(x => x !== id);
  save();
  renderProducts();
  renderCart();
  renderAdmin("products");
  toast("Produk dihapus.");
}

function saveAppearance(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  ["shopName","announcement","heroTitle","heroDescription","heroImage","primary","accent","tagline","whatsapp"]
    .forEach(k => settings[k] = String(f.get(k) || "").trim());
  save();
  applyAppearance();
  toast("Tampilan toko diperbarui.");
}

function changePassword(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const a = f.get("newPassword"), b = f.get("confirmPassword");
  if (a.length < 10) return toast("Password minimal 10 karakter.");
  if (a !== b) return toast("Konfirmasi password tidak cocok.");
  settings.adminPassword = a;
  save();
  e.target.reset();
  toast("Password berhasil diganti.");
}

function setOrderStatus(id, s) {
  const o = orders.find(x => x.id === id);
  if (o) { o.status = s; save(); toast("Status pesanan diperbarui."); }
}

function orderDetail(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  const lines = o.items.map(x => {
    const p = products.find(y => y.id === x.id);
    return `• ${p?.name || "Produk"} × ${x.quantity} — ${rupiah((p?.price || 0) * x.quantity)}`;
  }).join("\n");
  alert(`PESANAN ${o.id}\nTanggal: ${o.date}\nPelanggan: ${o.customer}\nWhatsApp: ${o.phone}\n\n${lines}\n\nTotal: ${rupiah(o.total)}\nStatus: ${o.status}\n\nAlamat: ${o.address || "-"}\nKurir: ${o.courier || "-"}\nEmail digital: ${o.digitalEmail || "-"}\nID/Username: ${o.accountId || "-"}\nCatatan: ${o.note || "-"}\nInfo pengiriman: ${o.deliveryInfo || "-"}`);
}

applyAppearance();
renderProducts();
renderCart();