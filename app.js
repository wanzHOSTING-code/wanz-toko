/* ============================================================
   Rona Market — app.js (semua logika JS, termasuk v5.4)
   ============================================================ */

/* ---------- DATA & STATE ---------- */
const initialProducts = [
  {id:1,type:"fisik",name:"Nike Sport Sneakers",category:"fashion",price:350000,oldPrice:450000,stock:12,rating:"4.9",image:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",description:"Sneakers bergaya sporty untuk aktivitas sehari-hari."},
  {id:2,type:"fisik",name:"Casual T-Shirt",category:"fashion",price:89000,oldPrice:120000,stock:20,rating:"4.8",image:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600",description:"Kaos kasual dengan desain simpel dan mudah dipadukan."},
  {id:3,type:"fisik",name:"Wireless Headphone",category:"elektronik",price:275000,oldPrice:350000,stock:8,rating:"4.9",image:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",description:"Headphone wireless untuk menemani musik dan aktivitasmu."},
  {id:4,type:"fisik",name:"Classic Wrist Watch",category:"aksesoris",price:180000,oldPrice:230000,stock:10,rating:"4.7",image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",description:"Jam tangan bergaya klasik untuk tampilan sehari-hari."},
  {id:5,type:"digital",name:"Voucher Game Rp50.000",category:"voucher",price:50000,oldPrice:55000,stock:50,rating:"4.9",image:"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600",description:"Voucher digital game. Detail nominal dan proses aktivasi dikonfirmasi admin.",digitalRequirement:"ID akun / User ID dan server bila diminta"},
  {id:6,type:"digital",name:"Top Up Game",category:"voucher",price:25000,oldPrice:30000,stock:100,rating:"4.8",image:"https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600",description:"Layanan top up game digital. Pilih nominal dan berikan ID pemain yang sesuai.",digitalRequirement:"User ID dan server ID"},
  {id:7,type:"digital",name:"Lisensi Software 1 Tahun",category:"akun",price:99000,oldPrice:129000,stock:15,rating:"4.7",image:"https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600",description:"Produk lisensi digital. Pastikan kompatibilitas perangkat sebelum memesan.",digitalRequirement:"Email penerima"},
  {id:8,type:"fisik",name:"Modern Backpack",category:"fashion",price:145000,oldPrice:190000,stock:15,rating:"4.8",image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",description:"Tas praktis untuk sekolah, kerja, dan bepergian."}
];

const load = (k,d) => { try { const x = localStorage.getItem(k); return x ? JSON.parse(x) : d; } catch { return d; } };

let products = load("rona3_products", initialProducts);
let cart = load("rona3_cart", []);
let orders = load("rona3_orders", []);

let settings = load("rona3_settings", {
  whatsapp:"6281234567890",
  adminPassword:"admin123",
  shopName:"Rona Market",
  announcement:"✨ Pilihan menarik setiap hari · Belanja nyaman di Rona Market",
  heroTitle:"Temukan yang kamu suka, harga bersahabat.",
  heroDescription:"Produk pilihan untuk menemani aktivitasmu. Cari, pilih, dan pesan dengan lebih mudah.",
  heroImage:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
  primary:"#2878f0",
  accent:"#ff914d",
  tagline:"Belanja nyaman, pilihan lebih menyenangkan."
});

let activeType="all", activeSub="all", showOnlyFavorites=false,
    favorites=load("rona3_favorites",[]), adminLogged=false,
    loginAttempts=0, lockUntil=0, idleTimer=null, toastTimer;

let compareIds = load("rona5_compare", []);
let vouchers = load("rona5_vouchers", [
  {code:"RONA10",type:"percent",value:10,min:50000,maxDiscount:25000,active:true,used:0},
  {code:"HEMAT5000",type:"fixed",value:5000,min:25000,maxDiscount:5000,active:true,used:0}
]);
let notifications = load("rona5_notifications", []);
let reviews = load("rona5_reviews", []);
let appliedVoucher = null;
let ronaCurrentPage = 'shop', ronaTrackMode = 'track';
let lastOrderForWA = null;

const $ = id => document.getElementById(id);
const rupiah = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function save(){
  localStorage.setItem("rona3_products", JSON.stringify(products));
  localStorage.setItem("rona3_cart", JSON.stringify(cart));
  localStorage.setItem("rona3_orders", JSON.stringify(orders));
  localStorage.setItem("rona3_settings", JSON.stringify(settings));
  localStorage.setItem("rona3_favorites", JSON.stringify(favorites));
  localStorage.setItem("rona5_compare", JSON.stringify(compareIds));
  localStorage.setItem("rona5_vouchers", JSON.stringify(vouchers));
  localStorage.setItem("rona5_notifications", JSON.stringify(notifications));
  localStorage.setItem("rona5_reviews", JSON.stringify(reviews));
}

function toast(s){
  $("toast").textContent = s;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>$("toast").classList.remove("show"), 2500);
}

/* ---------- APPEARANCE ---------- */
function applyAppearance(){
  document.documentElement.style.setProperty("--blue", settings.primary||"#2878f0");
  document.documentElement.style.setProperty("--orange", settings.accent||"#ff914d");
  $("announcement").textContent = settings.announcement;
  $("heroTitle").textContent = settings.heroTitle;
  $("heroDescription").textContent = settings.heroDescription;
  $("heroImage").src = settings.heroImage;
  $("brandLogo").innerHTML = esc(settings.shopName.replace(/\s+Market$/i,"").toLowerCase()) + '<span>.</span>';
  $("footerLogo").innerHTML = $("brandLogo").innerHTML;
  $("footerTagline").textContent = settings.tagline;
  $("copyrightName").textContent = settings.shopName;
  document.title = settings.shopName + " — Belanja Lebih Mudah";
}

/* ---------- PRODUCTS ---------- */
function renderProducts(){
  const q = $("searchInput").value.toLowerCase().trim();
  let list = products.filter(p =>
    (activeType==="all"||p.type===activeType) &&
    (activeSub==="all"||p.category===activeSub) &&
    (`${p.name} ${p.category} ${p.description||""}`.toLowerCase().includes(q)) &&
    (!showOnlyFavorites||favorites.includes(p.id))
  );
  const sort = $("sortSelect")?.value||"default";
  if(sort==="low")list.sort((a,b)=>a.price-b.price);
  if(sort==="high")list.sort((a,b)=>b.price-a.price);
  if(sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name,"id"));
  if(sort==="stock")list.sort((a,b)=>b.stock-a.stock);

  $("productSubtitle").textContent = `Menampilkan ${list.length} dari ${products.length} produk`;
  $("favoriteCount").textContent = favorites.length;
  $("favoritesToggle").classList.toggle("active", showOnlyFavorites);

  $("productList").innerHTML = list.length ? list.map(p=>{
    const d = p.oldPrice>p.price ? Math.round((1-p.price/p.oldPrice)*100) : 0;
    const fav = favorites.includes(p.id);
    const rating = averageRating(p.id);
    return `<article class="product">
      <div class="product-photo" onclick="showDetail(${p.id})">
        ${d?`<span class="discount">-${d}%</span>`:""}
        <span class="type-pill">${p.type==="digital"?"DIGITAL":"FISIK"}</span>
        <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='https://placehold.co/600x450?text=Product'">
        <button class="favorite-btn ${fav?"active":""}" aria-label="Favorit" onclick="event.stopPropagation();toggleFavorite(${p.id})">${fav?"♥":"♡"}</button>
      </div>
      <div class="product-info">
        <span class="muted">${esc(p.category)}</span>
        <h3 class="product-name" onclick="showDetail(${p.id})">${esc(p.name)}</h3>
        <div class="stars">★ ${rating?rating.toFixed(1):"Baru"} <span style="color:var(--muted)">(${reviews.filter(r=>r.productId===p.id).length})</span></div>
        <div>
          <span class="price">${rupiah(p.price)}</span>
          ${p.oldPrice>p.price?`<span class="old">${rupiah(p.oldPrice)}</span>`:""}
        </div>
        <div class="stock ${p.stock<=0?"out":p.stock<=5?"low":""}">
          ${p.stock>0?(p.type==="digital"?`Kuota tersedia: ${p.stock}`:`Stok tersedia: ${p.stock}`):"Stok habis"}
        </div>
        <div class="product-actions">
          <button class="detail-btn" onclick="showDetail(${p.id})">Detail</button>
          <button class="add" onclick="addCart(${p.id})" ${p.stock<=0?"disabled":""}>+ Keranjang</button>
          <button class="detail-btn" title="Bandingkan" onclick="addCompare(${p.id})">${compareIds.includes(p.id)?"✓":"⇄"}</button>
        </div>
      </div>
    </article>`;
  }).join("") : `<div class="empty"><p>${showOnlyFavorites?"Belum ada produk favorit.":"Produk tidak ditemukan."}</p></div>`;
}

function toggleFavorite(id){
  favorites = favorites.includes(id) ? favorites.filter(x=>x!==id) : [...favorites, id];
  save(); renderProducts();
  toast(favorites.includes(id) ? "Ditambahkan ke favorit." : "Dihapus dari favorit.");
}
function toggleFavorites(){ showOnlyFavorites = !showOnlyFavorites; renderProducts(); }
$("sortSelect").addEventListener("change", renderProducts);
function setCategory(t,b){ activeType=t; document.querySelectorAll("#categoryFilters .filter").forEach(x=>x.classList.remove("active")); b.classList.add("active"); renderProducts(); }
function setSubCategory(t,b){ activeSub=t; document.querySelectorAll("#typeFilters .filter").forEach(x=>x.classList.remove("active")); b.classList.add("active"); renderProducts(); }
$("searchInput").addEventListener("input", renderProducts);

/* ---------- CART ---------- */
function addCart(id){
  const p = products.find(x=>x.id===id);
  if(!p||p.stock<1) return toast("Stok/kuota tidak tersedia.");
  const item = cart.find(x=>x.id===id);
  if(item){ if(item.quantity>=p.stock) return toast("Jumlah melebihi stok."); item.quantity++; }
  else cart.push({id, quantity:1});
  save(); renderCart(); toast("Produk ditambahkan.");
}

function renderCart(){
  cart = cart.filter(x=>products.some(p=>p.id===x.id));
  const count = cart.reduce((s,x)=>s+x.quantity,0);
  const total = cart.reduce((s,x)=>s+(products.find(p=>p.id===x.id)?.price||0)*x.quantity,0);
  $("cartCount").textContent = count;
  $("cartTotal").textContent = rupiah(total);
  $("cartItems").innerHTML = cart.length ? cart.map(x=>{
    const p = products.find(y=>y.id===x.id);
    return `<div class="cart-row">
      <img src="${esc(p.image)}" alt="">
      <div class="cart-row-main">
        <h4>${esc(p.name)} <small style="color:#7b8493">(${p.type==="digital"?"Digital":"Fisik"})</small></h4>
        <p>${rupiah(p.price)}</p>
        <div class="qty">
          <button onclick="changeQty(${p.id},-1)">−</button>
          <span>${x.quantity}</span>
          <button onclick="changeQty(${p.id},1)">+</button>
        </div>
      </div>
      <button class="close" style="font-size:17px" onclick="removeCart(${p.id})">×</button>
    </div>`;
  }).join("") : `<div class="empty"><i class="fa-solid fa-bag-shopping"></i><p style="margin-top:8px">Keranjang masih kosong.</p></div>`;
  save();
}

function changeQty(id,d){
  const x = cart.find(y=>y.id===id), p = products.find(y=>y.id===id);
  if(!x||!p) return;
  if(d>0 && x.quantity>=p.stock) return toast("Jumlah melebihi stok.");
  x.quantity += d;
  if(x.quantity<=0) cart = cart.filter(y=>y.id!==id);
  save(); renderCart();
}
function removeCart(id){ cart = cart.filter(x=>x.id!==id); save(); renderCart(); }

/* ---------- MODAL HELPERS ---------- */
function openModal(id){ $(id).classList.add("show"); }
function closeModal(id){ $(id).classList.remove("show"); }

/* ---------- DETAIL ---------- */
function averageRating(id){
  const list = reviews.filter(r=>r.productId===id);
  if(!list.length){ const p = products.find(x=>x.id===id); return Number(p?.rating)||0; }
  return list.reduce((s,r)=>s+r.stars,0)/list.length;
}

function renderReviews(id){
  const list = reviews.filter(r=>r.productId===id);
  return `<div style="margin-top:18px;border-top:1px solid var(--line);padding-top:14px">
    <h3 style="font-size:14px">Ulasan pembeli (${list.length})</h3>
    ${list.length ? list.map(r=>`<div style="padding:10px 0;border-bottom:1px solid var(--line)">
        <b style="font-size:11px">${esc(r.name)}</b>
        <span style="color:#edae35">${"★".repeat(r.stars)}${"☆".repeat(5-r.stars)}</span>
        <p style="font-size:11px;color:var(--muted);margin-top:5px">${esc(r.comment)}</p>
        <small style="color:var(--muted)">${esc(r.date)}</small>
      </div>`).join("") : '<p style="font-size:11px;color:var(--muted);margin:8px 0">Belum ada ulasan.</p>'}
    <form onsubmit="submitReview(event,${id})" style="margin-top:13px">
      <div class="notice">Ulasan hanya dapat dikirim jika pesanan produk ini sudah berstatus Selesai. Siapkan nomor pesanan dan nomor WhatsApp checkout.</div>
      <div class="form-grid">
        <div class="field"><label>Nomor pesanan</label><input name="orderId" required></div>
        <div class="field"><label>Nomor WhatsApp checkout</label><input name="phone" required inputmode="tel"></div>
      </div>
      <div class="form-grid">
        <div class="field"><label>Nama tampilan</label><input name="name" required maxlength="40"></div>
        <div class="field"><label>Rating</label><select name="stars">
          <option value="5">5 - Sangat puas</option><option value="4">4 - Puas</option>
          <option value="3">3 - Cukup</option><option value="2">2 - Kurang</option>
          <option value="1">1 - Tidak puas</option>
        </select></div>
      </div>
      <div class="field"><label>Ulasan</label><textarea name="comment" maxlength="300" required></textarea></div>
      <button class="btn btn-primary">Kirim ulasan</button>
    </form>
  </div>`;
}

function showDetail(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  $("detailContent").innerHTML = `<div class="modal-head"><h3>Detail produk</h3><button class="close" onclick="closeModal('detailModal')">×</button></div>
    <div class="detail-layout">
      <img src="${esc(p.image)}" alt="${esc(p.name)}">
      <div>
        <span class="muted">${p.type==="digital"?"Produk digital":"Produk fisik"} · ${esc(p.category)}</span>
        <h2>${esc(p.name)}</h2>
        <div class="stars"><i class="fa-solid fa-star"></i> ${averageRating(id)?averageRating(id).toFixed(1):"Belum ada rating"} (${reviews.filter(r=>r.productId===id).length} ulasan)</div>
        <div class="price">${rupiah(p.price)}</div>
        <p>${esc(p.description||"Belum ada deskripsi.")}</p>
        <p><b>${p.type==="digital"?"Kuota tersedia":"Stok tersedia"}:</b> ${p.stock}</p>
        ${p.type==="digital"?`<p><b>Data checkout:</b> ${esc(p.digitalRequirement||"Tidak ada data tambahan")}</p>`:""}
        <button class="btn btn-primary" onclick="addCart(${p.id});closeModal('detailModal')">Tambah ke keranjang</button>
        <button class="btn btn-light" style="margin-top:8px" onclick="addCompare(${p.id})">⇄ Bandingkan</button>
      </div>
    </div>${renderReviews(id)}`;
  openModal("detailModal");
}

/* ---------- REVIEWS ---------- */
function submitReview(e, id){
  e.preventDefault();
  const f = new FormData(e.target);
  const order = orders.find(o =>
    o.id.toLowerCase()===String(f.get("orderId")).trim().toLowerCase() &&
    normalizePhone(o.phone)===normalizePhone(f.get("phone"))
  );
  if(!order || order.status!=="Selesai" || !order.items.some(x=>x.id===id))
    return toast("Ulasan hanya tersedia untuk produk dari pesanan selesai.");
  order.reviewed = order.reviewed || [];
  if(order.reviewed.includes(id)) return toast("Produk ini sudah kamu ulas.");
  reviews.unshift({
    productId:id, orderId:order.id, name:String(f.get("name")).trim(),
    stars:Number(f.get("stars")), comment:String(f.get("comment")).trim(),
    date:new Date().toLocaleDateString("id-ID")
  });
  order.reviewed.push(id);
  save(); showDetail(id); toast("Terima kasih, ulasan berhasil dikirim.");
}

/* ---------- NOTIFIKASI ---------- */
function addNotification(title, message){
  notifications.unshift({ id: Date.now()+Math.random(), title, message, date: new Date().toLocaleString("id-ID"), read:false });
  notifications = notifications.slice(0, 60);
  renderNoticeCount?.();
}
function renderNoticeCount(){
  const el = $("noticeCount");
  if(!el) return;
  const unread = notifications.filter(n=>!n.read).length;
  el.textContent = unread > 99 ? "99+" : unread;
  el.style.display = unread ? "inline-block" : "none";
}
function openNotifications(){
  const unread = notifications.filter(n=>!n.read).length;
  notifications.forEach(n=>n.read=true);
  save(); renderNoticeCount();
  const body = notifications.length ? notifications.map(n=>`<div style="display:flex;gap:12px;padding:14px 2px;border-bottom:1px solid var(--line)">
      <span style="width:36px;height:36px;flex:none;border-radius:11px;background:#edf5ff;color:var(--blue);display:grid;place-items:center"><i class="fa-regular fa-bell"></i></span>
      <div><b style="font-size:12px">${esc(n.title)}</b><p style="font-size:11px;margin:5px 0;color:#667085">${esc(n.message)}</p><small style="color:var(--muted)">${esc(n.date)}</small></div>
    </div>`).join("") : `<div class="tracking-empty"><i class="fa-regular fa-bell-slash"></i><p>Belum ada notifikasi.</p></div>`;
  openFeatureModal("Notifikasi", `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <small style="color:var(--muted)">${unread} notifikasi belum dibaca</small>
    <button class="filter" onclick="notifications=[];save();openNotifications()">Hapus semua</button>
  </div>${body}`);
}

/* ---------- FEATURE MODAL ---------- */
function openFeatureModal(title, body){
  let m = $("featureModal");
  if(!m){
    m = document.createElement("div");
    m.id = "featureModal"; m.className = "modal-wrap";
    m.addEventListener("click", e => { if(e.target===m) m.classList.remove("show"); });
    m.innerHTML = '<div class="modal" style="width:760px"><div class="modal-head"><h3 id="featureTitle"></h3><button class="close" onclick="closeModal(\'featureModal\')">×</button></div><div id="featureBody"></div></div>';
    document.body.appendChild(m);
  }
  $("featureTitle").textContent = title;
  $("featureBody").innerHTML = body;
  m.classList.add("show");
}

/* ---------- COMPARE ---------- */
function addCompare(id){
  if(compareIds.includes(id)){ compareIds = compareIds.filter(x=>x!==id); toast("Produk dihapus dari perbandingan."); }
  else if(compareIds.length>=3){ toast("Maksimal 3 produk untuk dibandingkan."); return; }
  else { compareIds.push(id); toast("Produk ditambahkan ke perbandingan."); }
  save(); renderProducts();
}
function openCompare(){
  const list = compareIds.map(id=>products.find(p=>p.id===id)).filter(Boolean);
  if(!list.length) return toast("Pilih produk melalui tombol Bandingkan terlebih dahulu.");
  const rows = [
    ["Harga", ...list.map(p=>rupiah(p.price))],
    ["Jenis", ...list.map(p=>p.type==="digital"?"Digital":"Fisik")],
    ["Kategori", ...list.map(p=>p.category)],
    ["Stok/kuota", ...list.map(p=>p.stock)],
    ["Rating", ...list.map(p=>averageRating(p.id).toFixed(1)+" ★")],
    ["Deskripsi", ...list.map(p=>esc(p.description||"-"))]
  ];
  openFeatureModal("Bandingkan produk", `<div class="table-scroll"><table class="admin-table">
    <thead><tr><th>Informasi</th>${list.map(p=>`<th>${esc(p.name)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map((x,i)=>`<td>${i===0?"<b>"+x+"</b>":x}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>
  <div style="display:flex;justify-content:flex-end;margin-top:14px">
    <button class="btn btn-light" onclick="compareIds=[];save();closeModal('featureModal');renderProducts()">Kosongkan perbandingan</button>
  </div>`);
}

/* ---------- VOUCHER ---------- */
function validateVoucher(code, subtotal){
  if(!code) return {valid:false,discount:0,message:""};
  const v = vouchers.find(x=>x.code.toUpperCase()===code.toUpperCase()&&x.active);
  if(!v) return {valid:false,discount:0,message:"Kode voucher tidak ditemukan atau tidak aktif."};
  if(subtotal<Number(v.min||0)) return {valid:false,discount:0,message:`Minimal belanja ${rupiah(v.min)}.`};
  if(v.usageLimit&&Number(v.used||0)>=Number(v.usageLimit)) return {valid:false,discount:0,message:"Kuota voucher sudah habis."};
  const discount = Math.min(
    v.type==="percent"?subtotal*Number(v.value)/100:Number(v.value),
    Number(v.maxDiscount||Infinity), subtotal
  );
  return {valid:true,discount:Math.floor(discount),code:v.code,message:`Voucher ${v.code} berhasil dipakai.`};
}
function applyVoucherPreview(){
  const code = $("voucherInput").value.trim();
  const subtotal = cart.reduce((s,x)=>s+(products.find(p=>p.id===x.id)?.price||0)*x.quantity,0);
  const r = validateVoucher(code, subtotal);
  $("voucherMessage").textContent = r.message||"Masukkan kode voucher.";
  $("voucherMessage").style.color = r.valid ? "#16824e" : "#c54444";
  if(r.valid){ appliedVoucher = r.code; $("checkoutTotal").textContent = rupiah(subtotal-r.discount); }
  else { $("checkoutTotal").textContent = rupiah(subtotal); appliedVoucher = null; }
}

/* ---------- PAGE NAVIGATION ---------- */
function navigatePage(page){
  ronaCurrentPage = page;
  document.body.dataset.page = page;
  document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active', b.dataset.nav===page));
  const drawer = $('cartDrawer');
  if(drawer){ drawer.classList.remove('show'); if(page!=='cart') drawer.classList.remove('page-view'); }
  $('overlay')?.classList.remove('show');
  ['checkoutModal','adminModal'].forEach(id=>$(id)?.classList.remove('page-mode','show'));
  if(page==='shop'){ window.scrollTo({top:0,behavior:'smooth'}); return; }
  if(page==='track'){
    window.scrollTo({top:0,behavior:'smooth'});
    $('trackingPageForm')?.reset();
    $('trackingPageResult').innerHTML='';
    const idField = $('trackingPageForm')?.elements.orderId;
    if(idField){ idField.closest('.field').hidden = ronaTrackMode==='history'; idField.required = ronaTrackMode!=='history'; }
    const h = $('trackingPage').querySelector('.page-heading h1');
    const desc = $('trackingPage').querySelector('.page-heading p');
    if(h) h.textContent = ronaTrackMode==='history'?'Riwayat pesanan':'Lacak pesanan';
    if(desc) desc.textContent = ronaTrackMode==='history' ? 'Lihat daftar pesanan yang pernah dibuat menggunakan nomor WhatsApp-mu.' : 'Pantau status pesanan Rona Market dengan nomor pesanan dan WhatsApp yang digunakan saat checkout.';
    return;
  }
  if(page==='cart'){ drawer.classList.add('page-view'); renderCart(); window.scrollTo({top:0,behavior:'smooth'}); return; }
}

function openCart(){ navigatePage('cart'); $('cartDrawer').classList.add('page-view'); }
function closeCart(){ if(ronaCurrentPage==='cart'){ navigatePage('shop'); } else { $('overlay')?.classList.remove('show'); $('cartDrawer')?.classList.remove('show'); } }

/* ---------- CHECKOUT ---------- */
function openCheckout(){
  if(!cart.length) return toast('Keranjang masih kosong.');
  if(cart.some(x=>{ const p=products.find(y=>y.id===x.id); return !p||x.quantity>p.stock; })) return toast('Periksa kembali stok/kuota.');
  const hasPhysical = cart.some(x=>products.find(p=>p.id===x.id).type==='fisik');
  const hasDigital = cart.some(x=>products.find(p=>p.id===x.id).type==='digital');
  $('physicalFields').hidden = !hasPhysical;
  $('digitalFields').hidden = !hasDigital;
  $('checkoutHeading').textContent = hasPhysical&&hasDigital?'Data pesanan campuran':hasDigital?'Data pesanan digital':'Data pengiriman';
  $('checkoutForm').elements.address.required = hasPhysical;
  $('checkoutForm').elements.digitalEmail.required = false;
  $('checkoutForm').elements.accountId.required = false;
  $('checkoutTotal').textContent = rupiah(cart.reduce((s,x)=>s+products.find(p=>p.id===x.id).price*x.quantity,0));
  navigatePage('checkout');
  $('checkoutModal').classList.add('show','page-mode');
}

/* ---------- ADMIN ---------- */
function openAdmin(){
  navigatePage('admin');
  $('adminModal').classList.add('show','page-mode');
  $('adminLogin').hidden = adminLogged;
  $('adminDashboard').hidden = !adminLogged;
  if(adminLogged) renderAdmin('products');
}

$("loginForm").addEventListener("submit", e=>{
  e.preventDefault();
  if(Date.now()<lockUntil) return toast("Terlalu banyak percobaan. Coba lagi sebentar.");
  const pass = new FormData(e.target).get("password");
  if(pass!==settings.adminPassword){
    loginAttempts++;
    if(loginAttempts>=5){ lockUntil = Date.now()+60000; loginAttempts=0; toast("Login dikunci 60 detik."); }
    else toast("Password salah.");
    return;
  }
  loginAttempts=0; adminLogged=true;
  $("adminLogin").hidden=true; $("adminDashboard").hidden=false;
  startIdleTimer(); renderAdmin("products");
});

function startIdleTimer(){
  clearTimeout(idleTimer);
  idleTimer = setTimeout(()=>{ if(adminLogged){ adminLogout(); toast("Sesi admin berakhir karena tidak aktif."); } }, 5*60*1000);
}
["click","keydown","mousemove","touchstart"].forEach(ev=>document.addEventListener(ev,()=>{ if(adminLogged) startIdleTimer(); },{passive:true}));

function adminLogout(){
  adminLogged=false; clearTimeout(idleTimer);
  $("adminLogin").hidden=false; $("adminDashboard").hidden=true;
  $("loginForm").reset(); toast("Sesi admin berakhir.");
}
function adminTab(tab,b){
  document.querySelectorAll(".admin-tabs button").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); renderAdmin(tab);
}

function renderAdmin(tab){
  const total = orders.filter(o=>o.status!=="Dibatalkan").reduce((s,o)=>s+Number(o.total||0),0);
  const pending = orders.filter(o=>!["Selesai","Dibatalkan"].includes(o.status)).length;
  $("adminStats").innerHTML = `<div class="stat"><small>Total produk</small><strong>${products.length}</strong></div>
    <div class="stat"><small>Total pesanan</small><strong>${orders.length}</strong></div>
    <div class="stat"><small>Omzet pesanan aktif</small><strong style="font-size:13px">${rupiah(total)}</strong></div>
    <div class="stat"><small>Perlu ditangani</small><strong>${pending}</strong></div>`;
  const v = $("adminView");

  if(tab==="products"){
    v.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <b>Daftar produk</b><button class="btn btn-primary" onclick="editProduct()">+ Tambah produk</button></div>
      <div class="table-scroll"><table class="admin-table">
      <thead><tr><th>Produk</th><th>Jenis</th><th>Harga</th><th>Stok</th><th>Aksi</th></tr></thead>
      <tbody>${products.map(p=>`<tr>
        <td>${esc(p.name)}</td><td>${p.type}</td><td>${rupiah(p.price)}</td><td>${p.stock}</td>
        <td><button onclick="editProduct(${p.id})">Edit</button><button onclick="deleteProduct(${p.id})">Hapus</button></td>
      </tr>`).join("")}</tbody></table></div>`;
  }
  else if(tab==="orders"){
    v.innerHTML = `<div class="admin-toolbar"><b>Daftar pesanan (${orders.length})</b>
      <div><input id="orderSearchV5" placeholder="Cari nomor / pelanggan..." oninput="filterOrdersV5()">
      <button class="btn btn-light" onclick="exportOrders()">Unduh CSV</button></div></div>
      <div id="ordersTableV5">${orders.length?ordersTableHtmlV5(orders):'<div class="empty">Belum ada pesanan.</div>'}</div>`;
  }
  else if(tab==="vouchers"){
    v.innerHTML = `<form id="voucherForm" class="notice"><b>Buat voucher baru</b>
      <div class="form-grid" style="margin-top:10px">
        <div class="field"><label>Kode</label><input name="code" required maxlength="20" placeholder="PROMO15"></div>
        <div class="field"><label>Jenis diskon</label><select name="type"><option value="percent">Persentase (%)</option><option value="fixed">Potongan nominal (Rp)</option></select></div>
        <div class="field"><label>Nilai diskon</label><input name="value" type="number" min="1" required></div>
        <div class="field"><label>Minimal belanja</label><input name="min" type="number" min="0" value="0"></div>
        <div class="field"><label>Maksimal diskon (Rp)</label><input name="maxDiscount" type="number" min="0" value="50000"></div>
        <div class="field"><label>Batas penggunaan (0 = tanpa batas)</label><input name="usageLimit" type="number" min="0" value="0"></div>
      </div><button class="btn btn-primary">Simpan voucher</button></form>
      <div class="table-scroll"><table class="admin-table">
      <thead><tr><th>Kode</th><th>Diskon</th><th>Min. belanja</th><th>Terpakai</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${vouchers.map(x=>`<tr>
        <td><b>${esc(x.code)}</b></td>
        <td>${x.type==="percent"?x.value+"%":rupiah(x.value)}</td>
        <td>${rupiah(x.min)}</td>
        <td>${x.used||0}${x.usageLimit?"/"+x.usageLimit:""}</td>
        <td>${x.active?"Aktif":"Nonaktif"}</td>
        <td><button onclick="toggleVoucher('${x.code}')">${x.active?"Nonaktifkan":"Aktifkan"}</button>
        <button onclick="deleteVoucher('${x.code}')">Hapus</button></td>
      </tr>`).join("")}</tbody></table></div>`;
  }
  else if(tab==="analytics"){
    v.innerHTML = `<div class="stat-grid">
      <div class="stat"><small>Omzet selesai</small><strong>${rupiah(orders.filter(o=>o.status==="Selesai").reduce((s,o)=>s+o.total,0))}</strong></div>
      <div class="stat"><small>Pesanan selesai</small><strong>${orders.filter(o=>o.status==="Selesai").length}</strong></div>
      <div class="stat"><small>Stok menipis</small><strong>${products.filter(p=>p.stock>0&&p.stock<=5).length}</strong></div>
    </div>
    <div class="stat"><b>Grafik pesanan 7 hari terakhir</b>
      <canvas id="salesChart" width="680" height="230" style="width:100%;height:230px;margin-top:12px"></canvas></div>
    <div class="stat" style="margin-top:12px"><b>Produk terlaris</b>
      <ol style="padding:12px 20px;font-size:12px">${topProducts().map(x=>`<li>${esc(x.name)} — ${x.qty} terjual</li>`).join("")||"<li>Belum ada data penjualan.</li>"}</ol></div>`;
  }
  else if(tab==="appearance"){
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
      <button class="btn btn-primary">Simpan tampilan</button></form>`;
  }
  else if(tab==="settings"){
    v.innerHTML = `<div class="notice">Login dan penyimpanan masih berjalan di browser. Untuk keamanan produksi diperlukan autentikasi server dan database.</div>
      <form id="securityForm">
        <div class="field"><label>Password admin baru</label><input name="newPassword" type="password" minlength="10" required></div>
        <div class="field"><label>Ulangi password baru</label><input name="confirmPassword" type="password" minlength="10" required></div>
        <button class="btn btn-primary">Ganti password</button></form>`;
  }

  if(tab==="vouchers"){
    $("voucherForm").addEventListener("submit", e=>{
      e.preventDefault();
      const f = new FormData(e.target);
      const code = String(f.get("code")).trim().toUpperCase();
      if(vouchers.some(x=>x.code===code)) return toast("Kode voucher sudah digunakan.");
      vouchers.unshift({
        code, type:f.get("type"), value:Number(f.get("value")),
        min:Number(f.get("min")||0), maxDiscount:Number(f.get("maxDiscount")||Infinity),
        usageLimit:Number(f.get("usageLimit")||0), used:0, active:true
      });
      save(); renderAdmin("vouchers"); toast("Voucher berhasil dibuat.");
    });
  }
  if(tab==="appearance") $("appearanceForm").addEventListener("submit", saveAppearance);
  if(tab==="settings") $("securityForm").addEventListener("submit", changePassword);
  if(tab==="analytics") drawSalesChart();
}

function filterOrdersV5(){
  const q = $("orderSearchV5").value.toLowerCase();
  const rows = orders.filter(o=>(o.id+" "+o.customer+" "+o.phone).toLowerCase().includes(q));
  $("ordersTableV5").innerHTML = rows.length ? ordersTableHtmlV5(rows) : '<div class="empty">Pesanan tidak ditemukan.</div>';
}

function ordersTableHtmlV5(rows){
  return `<div class="table-scroll"><table class="admin-table">
    <thead><tr><th>Pesanan</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Detail</th></tr></thead>
    <tbody>${rows.map(o=>`<tr>
      <td><b>${esc(o.id)}</b><br>${esc(o.date)}</td>
      <td>${esc(o.customer)}</td>
      <td>${rupiah(o.total)}</td>
      <td><select onchange="setOrderStatus('${o.id}',this.value)">
        ${["Menunggu pembayaran","Menunggu konfirmasi","Diproses","Dikirim","Selesai","Dibatalkan"]
          .map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}
      </select></td>
      <td><button onclick="orderDetail('${o.id}')">Kelola</button></td>
    </tr>`).join("")}</tbody></table></div>`;
}

function topProducts(){
  const totals = {};
  orders.filter(o=>o.status!=="Dibatalkan").forEach(o=>(o.items||[]).forEach(i=>totals[i.id]=(totals[i.id]||0)+i.quantity));
  return Object.entries(totals).map(([id,qty])=>({name:products.find(p=>p.id===Number(id))?.name||"Produk", qty}))
    .sort((a,b)=>b.qty-a.qty).slice(0,5);
}

function drawSalesChart(){
  const c = $("salesChart"); if(!c) return;
  const ctx = c.getContext("2d"), days = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const key = d.toLocaleDateString("id-ID");
    days.push({
      label: d.toLocaleDateString("id-ID",{day:"2-digit",month:"short"}),
      value: orders.filter(o=>String(o.date||"").startsWith(key)&&o.status!=="Dibatalkan").reduce((s,o)=>s+Number(o.total||0),0)
    });
  }
  const max = Math.max(1,...days.map(x=>x.value));
  ctx.clearRect(0,0,c.width,c.height);
  ctx.font = "11px sans-serif"; ctx.strokeStyle="#dce4ef"; ctx.fillStyle="#7b8493";
  ctx.beginPath(); ctx.moveTo(38,12); ctx.lineTo(38,195); ctx.lineTo(665,195); ctx.stroke();
  days.forEach((d,i)=>{
    const x = 55+i*86, h = d.value/max*145;
    ctx.fillStyle = "#2878f0"; ctx.fillRect(x,195-h,34,h);
    ctx.fillStyle = "#68758a"; ctx.fillText(d.label,x-7,216);
    ctx.fillText(d.value?Math.round(d.value/1000)+"k":"0",x-3,Math.max(12,185-h));
  });
}

function editProduct(id){
  const p = products.find(x=>x.id===id), f = $("productForm");
  f.reset();
  f.elements.id.value = p?.id||"";
  f.elements.type.value = p?.type||"fisik";
  f.elements.name.value = p?.name||"";
  f.elements.category.value = p?.category||"fashion";
  f.elements.stock.value = p?.stock??0;
  f.elements.price.value = p?.price||"";
  f.elements.oldPrice.value = p?.oldPrice||p?.price||"";
  f.elements.image.value = p?.image||"";
  f.elements.description.value = p?.description||"";
  f.elements.digitalRequirement.value = p?.digitalRequirement||"";
  $("productFormTitle").textContent = p?"Edit produk":"Tambah produk";
  toggleProductFields();
  openModal("productFormModal");
}

function toggleProductFields(){
  const digital = $("productType").value==="digital";
  $("productForm").elements.digitalRequirement.parentElement.hidden = !digital;
}

$("productForm").addEventListener("submit", e=>{
  e.preventDefault();
  const f = new FormData(e.target), id = f.get("id");
  const p = {
    id: id?Number(id):Date.now(),
    type: f.get("type"), name: f.get("name").trim(),
    category: f.get("category"),
    stock: Math.max(0,Number(f.get("stock"))),
    price: Math.max(0,Number(f.get("price"))),
    oldPrice: Math.max(0,Number(f.get("oldPrice"))),
    image: f.get("image").trim(),
    description: f.get("description").trim(),
    digitalRequirement: f.get("digitalRequirement").trim(),
    rating:"Baru"
  };
  if(id) products = products.map(x=>x.id===Number(id)?{...x,...p,rating:x.rating}:x);
  else products.unshift(p);
  save(); renderProducts(); renderAdmin("products");
  closeModal("productFormModal"); toast("Produk disimpan.");
});

function deleteProduct(id){
  const p = products.find(x=>x.id===id);
  if(!p||!confirm(`Hapus ${p.name}?`)) return;
  products = products.filter(x=>x.id!==id);
  cart = cart.filter(x=>x.id!==id);
  favorites = favorites.filter(x=>x!==id);
  save(); renderProducts(); renderCart(); renderAdmin("products");
  toast("Produk dihapus.");
}

function saveAppearance(e){
  e.preventDefault();
  const f = new FormData(e.target);
  ["shopName","announcement","heroTitle","heroDescription","heroImage","primary","accent","tagline","whatsapp"]
    .forEach(k=>settings[k]=String(f.get(k)||"").trim());
  save(); applyAppearance(); toast("Tampilan toko diperbarui.");
}

function changePassword(e){
  e.preventDefault();
  const f = new FormData(e.target), a = f.get("newPassword"), b = f.get("confirmPassword");
  if(a.length<10) return toast("Password minimal 10 karakter.");
  if(a!==b) return toast("Konfirmasi password tidak cocok.");
  settings.adminPassword = a;
  save(); e.target.reset(); toast("Password berhasil diganti.");
}

function setOrderStatus(id, s){
  const o = orders.find(x=>x.id===id); if(!o) return;
  const previous = o.status;
  o.status = s;
  if(s==="Dibatalkan" && o.stockDeducted){
    (o.items||[]).forEach(i=>{ const p = products.find(x=>x.id===i.id); if(p) p.stock+=i.quantity; });
    o.stockDeducted = false;
  }
  if(previous==="Dibatalkan" && s!=="Dibatalkan" && !o.stockDeducted){
    let enough = (o.items||[]).every(i=>(products.find(p=>p.id===i.id)?.stock||0)>=i.quantity);
    if(!enough){ o.status = previous; return toast("Stok tidak cukup untuk mengaktifkan kembali pesanan."); }
    (o.items||[]).forEach(i=>{ const p = products.find(x=>x.id===i.id); if(p) p.stock-=i.quantity; });
    o.stockDeducted = true;
  }
  addNotification("Status pesanan berubah", `Pesanan ${id}: ${s}.`);
  save(); renderProducts(); renderAdmin("orders");
  toast("Status pesanan diperbarui.");
}

function orderDetail(id){
  const o = orders.find(x=>x.id===id); if(!o) return;
  const itemLines = (o.items||[]).map(i=>{
    const p = products.find(x=>x.id===i.id);
    return `${p?.name||"Produk"} × ${i.quantity}`;
  }).join(", ");
  openFeatureModal("Kelola pesanan "+id, `<div class="notice">
    <b>${esc(o.customer)}</b> · ${esc(o.phone)}<br>
    ${esc(itemLines)}<br>Total: ${rupiah(o.total)}<br>Status: ${esc(o.status)}
  </div>
  <div class="field"><label>Info resi / pengiriman digital / kode pesanan</label>
    <textarea id="deliveryInfoInput" maxlength="1000" placeholder="Isi resi, kode voucher, instruksi aktivasi, atau informasi pengiriman digital">${esc(o.deliveryInfo||"")}</textarea></div>
  <button class="btn btn-primary" onclick="saveDeliveryInfo('${o.id}')">Simpan informasi</button>
  <button class="btn btn-light" onclick="sendDeliveryWhatsApp('${o.id}')">Kirim via WhatsApp</button>`);
}
function saveDeliveryInfo(id){
  const o = orders.find(x=>x.id===id); if(!o) return;
  o.deliveryInfo = $("deliveryInfoInput").value.trim();
  addNotification("Informasi pengiriman diperbarui", `Pesanan ${id} memiliki informasi pengiriman baru.`);
  save(); toast("Informasi pengiriman disimpan.");
}
function sendDeliveryWhatsApp(id){
  const o = orders.find(x=>x.id===id); if(!o||!o.deliveryInfo) return toast("Isi informasi pengiriman terlebih dahulu.");
  const phone = normalizePhone(o.phone);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent("Informasi pesanan "+o.id+":\n"+o.deliveryInfo)}`,"_blank");
}

function toggleVoucher(code){
  const v = vouchers.find(x=>x.code===code);
  if(v){ v.active = !v.active; save(); renderAdmin("vouchers"); }
}
function deleteVoucher(code){
  if(!confirm("Hapus voucher "+code+"?")) return;
  vouchers = vouchers.filter(x=>x.code!==code); save(); renderAdmin("vouchers");
}

function exportOrders(){
  if(!orders.length) return toast("Belum ada data pesanan.");
  const cols = ["Nomor","Tanggal","Pelanggan","WhatsApp","Alamat","Email digital","ID akun","Kurir","Subtotal","Diskon","Voucher","Total","Status","Info pengiriman"];
  const rows = orders.map(o=>[o.id,o.date,o.customer,o.phone,o.address,o.digitalEmail,o.accountId,o.courier,o.subtotal,o.discount,o.voucher,o.total,o.status,o.deliveryInfo]);
  const csv = [cols,...rows].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "rona-market-pesanan.csv"; a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- TRACKING ---------- */
function normalizePhone(s){ return String(s||"").replace(/\D/g,"").replace(/^0/,"62"); }

function orderLookupUI(mode){
  ronaTrackMode = mode==="history"?"history":"track";
  navigatePage("track");
}

function renderTrackingOrder(o){
  const stages = ["Menunggu konfirmasi","Diproses","Dikirim","Selesai"];
  let status = o.status||"Menunggu konfirmasi";
  let active = status==="Dibatalkan"?-1:stages.indexOf(status);
  if(active<0 && status!=="Dibatalkan"){
    active = status.toLowerCase().includes("kirim")?2:status.toLowerCase().includes("proses")?1:0;
  }
  const stageHtml = stages.map((st,i)=>`<div class="tracking-stage ${i<active?"done":i===active?"current":""}">${st}</div>`).join("");
  return `<article class="tracking-order-card">
    <div class="tracking-order-top">
      <div><small>NOMOR PESANAN</small><h3>${esc(o.id)}</h3><small>${esc(o.date||"")}</small></div>
      <div class="tracking-total">
        <span class="status-pill ${status==="Selesai"?"done":status==="Dibatalkan"?"cancel":""}">${esc(status)}</span>
        <div style="margin-top:9px">${rupiah(o.total)}</div>
      </div>
    </div>
    ${status==="Dibatalkan"?'<div class="notice" style="margin-top:15px">Pesanan ini dibatalkan. Hubungi admin toko jika membutuhkan bantuan.</div>':`<div class="tracking-timeline">${stageHtml}</div>`}
    <div class="tracking-meta">
      <div>Nama pemesan<b>${esc(o.customer||"-")}</b></div>
      <div>Kurir<b>${esc(o.courier||"Belum ditentukan")}</b></div>
      <div>Alamat pengiriman<b>${esc(o.address||"-")}</b></div>
      <div>Voucher<b>${esc(o.voucher||"Tidak digunakan")}</b></div>
    </div>
    <div class="tracking-items"><b>Detail pesanan</b><br>${(o.items||[]).map(i=>`${esc(products.find(p=>p.id===i.id)?.name||"Produk")} × ${i.quantity}`).join("<br>")}</div>
    ${o.deliveryInfo?`<div class="notice" style="margin-top:13px"><b>Informasi pengiriman / digital</b><br>${esc(o.deliveryInfo)}</div>`:""}
  </article>`;
}

$("trackingPageForm")?.addEventListener("submit", e=>{
  e.preventDefault();
  const f = new FormData(e.target);
  const id = String(f.get("orderId")||"").trim().toLowerCase();
  const phone = normalizePhone(f.get("phone"));
  const found = orders.filter(o=>normalizePhone(o.phone)===phone && (ronaTrackMode==="history"||String(o.id).toLowerCase()===id));
  $("trackingPageResult").innerHTML = found.length
    ? found.map(renderTrackingOrder).join("")
    : `<div class="tracking-empty"><i class="fa-solid fa-box-open"></i>
        <div><b>${ronaTrackMode==="history"?"Belum ada riwayat pesanan":"Pesanan belum ditemukan"}</b></div>
        <p style="margin-top:6px">${ronaTrackMode==="history"?"Belum ada pesanan dengan nomor WhatsApp tersebut.":"Pastikan nomor pesanan dan WhatsApp sama seperti saat checkout."}</p></div>`;
});

/* ---------- v5.4: DANA CONFIG & CHECKOUT ---------- */
const DANA_CONFIG = {
  number: "081234567890",        // ← GANTI nomor DANA toko
  name: "Nama Pemilik Toko",     // ← GANTI nama pemilik
  format: "0812-3456-7890"       // ← GANTI format tampilan
};

const originalCheckoutHandler = $("checkoutForm").onsubmit;
$("checkoutForm").onsubmit = null;
$("checkoutForm").addEventListener("submit", handleCheckoutV54);

function handleCheckoutV54(e){
  e.preventDefault();
  if(!cart.length) return;
  const f = new FormData(e.target);
  const customer = String(f.get("customer")||"").trim();
  const phone = String(f.get("phone")||"").trim();
  const address = String(f.get("address")||"").trim();
  if(phone.replace(/\D/g,"").length<9) return toast("Periksa kembali nomor WhatsApp pemesan.");
  const items = cart.map(x=>({...x}));
  const hasPhysical = items.some(x=>products.find(p=>p.id===x.id)?.type==="fisik");
  const hasDigital = items.some(x=>products.find(p=>p.id===x.id)?.type==="digital");
  if(hasPhysical && !address) return toast("Alamat pengiriman wajib diisi untuk produk fisik.");
  if(items.some(x=>{ const p=products.find(y=>y.id===x.id); return !p||x.quantity>p.stock; }))
    return toast("Stok/kuota berubah. Periksa keranjang kembali.");
  const subtotal = items.reduce((s,x)=>s+products.find(p=>p.id===x.id).price*x.quantity,0);
  const promo = validateVoucher(String(f.get("voucher")||"").trim(), subtotal);
  if(f.get("voucher") && !promo.valid) return toast(promo.message);
  const discount = promo.valid ? promo.discount : 0;
  const total = Math.max(0, subtotal-discount);
  const id = "RN"+Date.now().toString().slice(-8);

  items.forEach(x=>{ const p = products.find(y=>y.id===x.id); if(p) p.stock -= x.quantity; });

  const order = {
    id, date:new Date().toLocaleString("id-ID"), timestamp:Date.now(),
    customer, phone, address:hasPhysical?address:"-",
    digitalEmail:f.get("digitalEmail"), accountId:f.get("accountId"),
    courier:hasPhysical?f.get("courier"):"Tidak perlu pengiriman fisik",
    note:f.get("note"), subtotal, discount,
    voucher:promo.valid?promo.code:"", total, items,
    status:"Menunggu pembayaran",
    deliveryInfo:"", stockDeducted:true, reviewed:[]
  };
  orders.unshift(order);
  if(promo.valid){ const v = vouchers.find(x=>x.code===promo.code); if(v) v.used = (v.used||0)+1; }
  addNotification("Pesanan baru dibuat", `Pesanan ${id} menunggu pembayaran & konfirmasi.`);
  save(); renderProducts();

  lastOrderForWA = { order, items, hasPhysical, hasDigital };
  $("successOrderId").textContent = id;
  $("successTotal").textContent = rupiah(total);
  $("danaNumber").textContent = DANA_CONFIG.format;
  $("danaName").textContent = "a.n. " + DANA_CONFIG.name;

  cart = []; renderCart();
  e.target.reset(); $("voucherMessage").textContent = "";
  closeModal("checkoutModal");
  setTimeout(()=>openModal("successModal"), 180);
}

function sendOrderToWhatsApp(){
  if(!lastOrderForWA) return toast("Data pesanan tidak ditemukan.");
  const { order, items, hasPhysical, hasDigital } = lastOrderForWA;
  const wa = String(settings.whatsapp||"").replace(/\D/g,"");
  if(!wa||wa==="6281234567890") return toast("Nomor WhatsApp toko belum diatur di admin.");
  const detail = items.map(x=>{
    const p = products.find(y=>y.id===x.id);
    return `- ${p.name} (${p.type==="digital"?"DIGITAL":"FISIK"}) x${x.quantity} = ${rupiah(p.price*x.quantity)}`;
  }).join("\n");
  let msg = `Halo ${settings.shopName}, saya sudah transfer.\n\n`;
  msg += `*FORMAT PESANAN*\nNomor: ${order.id}\n\n${detail}\n\n`;
  msg += `Subtotal: ${rupiah(order.subtotal)}\n`;
  if(order.discount>0) msg += `Diskon: ${rupiah(order.discount)}\n`;
  msg += `*Total Transfer: ${rupiah(order.total)}*\n\n`;
  msg += `*DATA PEMESAN*\nNama: ${order.customer}\nWhatsApp: ${order.phone}\n`;
  if(hasPhysical){ msg += `Alamat: ${order.address}\nKurir: ${order.courier}\n`; }
  if(hasDigital){ msg += `Email: ${order.digitalEmail||"-"}\nID/Username: ${order.accountId||"-"}\n`; }
  if(order.note) msg += `Catatan: ${order.note}\n`;
  msg += `\n*Metode: Transfer DANA ke ${DANA_CONFIG.format} (a.n. ${DANA_CONFIG.name})*\n`;
  msg += `\n📎 Saya lampirkan bukti transfer di chat ini.\n\nMohon konfirmasi pesanan saya. Terima kasih.`;
  const win = window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
  if(!win) return toast("Izinkan pop-up browser agar WhatsApp dapat dibuka.");
  closeModal("successModal");
  toast("Lanjutkan kirim bukti transfer di WhatsApp.");
}

function copyDanaNumber(){
  const num = DANA_CONFIG.number;
  if(navigator.clipboard){ navigator.clipboard.writeText(num).then(()=>toast("Nomor DANA disalin.")); }
  else {
    const ta = document.createElement("textarea"); ta.value = num;
    document.body.appendChild(ta); ta.select(); document.execCommand("copy");
    document.body.removeChild(ta); toast("Nomor DANA disalin.");
  }
}

/* ---------- KEBIJAKAN ---------- */
const POLICY_PAGES = {
  about:{ title:"Tentang Kami", body:`<div class="policy-content">
    <h2>Tentang Rona Market</h2><div class="policy-date">Terakhir diperbarui: Januari 2026</div>
    <p>Rona Market adalah toko online yang menyediakan produk pilihan untuk menemani aktivitasmu — mulai dari fashion, elektronik, aksesoris, hingga produk digital seperti voucher dan lisensi.</p>
    <p>Kami percaya bahwa belanja online seharusnya mudah, aman, dan menyenangkan.</p>
    <h3>Visi</h3><p>Menjadi toko online pilihan utama yang mudah diakses dan dipercaya.</p>
    <h3>Misi</h3><ul><li>Menyediakan produk berkualitas dengan harga bersaing.</li><li>Memberikan pelayanan cepat dan ramah.</li><li>Menjaga kepercayaan pelanggan.</li></ul>
    <div class="placeholder-box">✏️ <b>Isi cerita tokomu di sini:</b> siapa pemilik, kapan didirikan, apa yang membuat Rona Market berbeda.</div>
  </div>`},
  contact:{ title:"Hubungi Kami", body:`<div class="policy-content">
    <h2>Hubungi Rona Market</h2><div class="policy-date">Kami siap membantu</div>
    <p>Hubungi kami melalui:</p>
    <h3>WhatsApp</h3><p>Nomor: <b>${settings.whatsapp}</b><br>Jam: Senin–Sabtu, 08.00–20.00 WIB</p>
    <h3>Email</h3><p>${settings.email||"email@ronamarket.com"}</p>
    <h3>Media Sosial</h3><ul><li>Instagram: @ronamarket</li><li>TikTok: @ronamarket</li></ul>
    <div class="placeholder-box">✏️ Ganti data kontak di atas dengan milikmu.</div>
  </div>`},
  privacy:{ title:"Kebijakan Privasi", body:`<div class="policy-content">
    <h2>Kebijakan Privasi</h2><div class="policy-date">Terakhir diperbarui: Januari 2026</div>
    <p>Rona Market menghormati privasi pengunjung dan pelanggan.</p>
    <h3>Data yang Dikumpulkan</h3><ul><li>Nama dan nomor WhatsApp saat checkout.</li><li>Alamat pengiriman (produk fisik).</li><li>Email/ID akun (produk digital).</li><li>Riwayat pesanan.</li></ul>
    <h3>Cara Data Digunakan</h3><ul><li>Memproses pesanan.</li><li>Mengonfirmasi pembayaran.</li><li>Meningkatkan layanan.</li></ul>
    <h3>Penyimpanan Data</h3><p>Saat ini data disimpan di browser perangkat. Kami tidak menjual data pelanggan.</p>
    <div class="placeholder-box">✏️ Setelah pakai database, perbarui bagian "Penyimpanan Data".</div>
  </div>`},
  return:{ title:"Kebijakan Retur & Refund", body:`<div class="policy-content">
    <h2>Kebijakan Retur & Refund</h2><div class="policy-date">Terakhir diperbarui: Januari 2026</div>
    <h3>1. Produk yang Dapat Dikembalikan</h3><ul><li>Produk rusak/cacat akibat pengiriman.</li><li>Produk tidak sesuai pesanan.</li><li>Produk palsu (jika terbukti).</li></ul>
    <h3>2. Produk yang Tidak Dapat Dikembalikan</h3><ul><li>Produk digital yang sudah diaktivasi.</li><li>Produk yang sudah dipakai/dicuci.</li><li>Rusak akibat kelalaian pembeli.</li></ul>
    <h3>3. Batas Waktu</h3><p>Maksimal <b>2×24 jam</b> setelah diterima, dengan <b>video unboxing</b> dan foto.</p>
    <h3>4. Proses Retur</h3><ul><li>Hubungi admin via WhatsApp.</li><li>Kirim bukti video unboxing.</li><li>Admin verifikasi 1×24 jam.</li><li>Produk dikirim balik (biaya ditanggung pembeli kecuali kesalahan toko).</li></ul>
    <h3>5. Refund</h3><p>Diproses maksimal <b>3 hari kerja</b> setelah produk retur diterima.</p>
    <h3>6. Produk Digital</h3><p>Tidak dapat di-refund kecuali terbukti tidak berfungsi dan belum digunakan.</p>
    <div class="placeholder-box">✏️ Sesuaikan batas waktu & kebijakan dengan kondisi tokomu.</div>
  </div>`},
  terms:{ title:"Syarat & Ketentuan", body:`<div class="policy-content">
    <h2>Syarat & Ketentuan</h2><div class="policy-date">Terakhir diperbarui: Januari 2026</div>
    <p>Dengan memesan di Rona Market, pembeli dianggap menyetujui syarat berikut.</p>
    <h3>1. Pemesanan</h3><ul><li>Pesanan via form checkout + konfirmasi WhatsApp.</li><li>Diproses setelah pembayaran dikonfirmasi.</li></ul>
    <h3>2. Harga & Pembayaran</h3><ul><li>Harga dalam Rupiah, dapat berubah.</li><li>Pembayaran via transfer DANA atau metode yang disepakati.</li><li>Bukti transfer wajib dikirim.</li></ul>
    <h3>3. Pengiriman</h3><ul><li>Fisik via kurir pilihan pembeli.</li><li>Ongkir ditanggung pembeli kecuali promo.</li><li>Digital via WhatsApp/email setelah pembayaran.</li></ul>
    <h3>4. Pembatalan</h3><ul><li>Sebelum bayar: bebas.</li><li>Setelah bayar: ikuti kebijakan retur.</li></ul>
    <h3>5. Larangan</h3><ul><li>Tidak boleh data palsu atau penipuan.</li><li>Tidak boleh menyalahgunakan produk digital.</li></ul>
    <h3>6. Perubahan</h3><p>Rona Market berhak mengubah syarat ini sewaktu-waktu.</p>
    <div class="placeholder-box">✏️ Sesuaikan dengan kondisi tokomu.</div>
  </div>`}
};

function openPolicyPage(key){
  const page = POLICY_PAGES[key]; if(!page) return;
  $("policyTitle").textContent = page.title;
  $("policyBody").innerHTML = page.body;
  $("policyModal").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closePolicyPage(){
  $("policyModal").classList.remove("show");
  document.body.style.overflow = "";
}

/* ---------- FAQ ---------- */
const FAQ_ITEMS = [
  { q:"Berapa lama proses pengiriman?", a:"Produk fisik dikirim 1×24 jam setelah pembayaran dikonfirmasi. Estimasi 2–5 hari kerja. Produk digital maksimal 1×24 jam (biasanya lebih cepat)." },
  { q:"Metode pembayaran apa yang tersedia?", a:"Saat ini kami menerima pembayaran via <b>transfer DANA</b>. Setelah checkout, kamu akan melihat instruksi transfer dan bisa langsung mengirim format pesanan + bukti TF melalui WhatsApp." },
  { q:"Bagaimana cara melacak pesanan?", a:"Buka menu <b>Lacak</b> di navbar, masukkan nomor pesanan dan nomor WhatsApp saat checkout." },
  { q:"Apakah produk digital dikirim ke alamat rumah?", a:"Tidak. Produk digital dikirim via WhatsApp atau email, bukan ke alamat fisik." },
  { q:"Apakah bisa COD?", a:"Untuk saat ini kami <b>belum melayani COD</b>. Pembayaran di muka via transfer DANA." },
  { q:"Bagaimana jika produk rusak?", a:"Hubungi admin via WhatsApp maksimal 2×24 jam setelah diterima, sertakan <b>video unboxing</b>. Lihat Kebijakan Retur untuk detail." },
  { q:"Apakah bisa retur atau refund?", a:"Bisa untuk kondisi tertentu. Produk rusak/salah kirim bisa diretur. Produk digital yang sudah dikirim tidak bisa di-refund." },
  { q:"Apakah data saya aman?", a:"Kami hanya meminta data yang diperlukan untuk memproses pesanan dan tidak menjual data pelanggan." },
  { q:"Bagaimana cara menghubungi admin?", a:"Klik <b>Hubungi kami</b> di footer, atau chat WhatsApp toko. Jam: Senin–Sabtu, 08.00–20.00 WIB." },
  { q:"Apakah harga sudah termasuk ongkir?", a:"Belum. Ongkir dikonfirmasi admin setelah alamat pengiriman diterima." }
];

function openFAQ(){
  const body = `<div class="policy-content" style="margin-bottom:14px">
    <h2>Pertanyaan yang Sering Diajukan</h2>
    <div class="policy-date">Klik pertanyaan untuk melihat jawaban</div></div>
    <div id="faqList">
      ${FAQ_ITEMS.map((item,i)=>`
        <div class="faq-item" id="faq-${i}">
          <button class="faq-q" onclick="toggleFAQ(${i})">
            <span>${item.q}</span><i class="fa-solid fa-chevron-down"></i>
          </button>
          <div class="faq-a">${item.a}</div>
        </div>
      `).join("")}
    </div>`;
  openFeatureModal("FAQ — Rona Market", body);
}

function toggleFAQ(i){
  const item = document.getElementById("faq-"+i);
  if(!item) return;
  const isOpen = item.classList.contains("open");
  document.querySelectorAll(".faq-item").forEach(el=>el.classList.remove("open"));
  if(!isOpen) item.classList.add("open");
}

/* ---------- QUICK LINKS ---------- */
function addQuickLinks(){
  const sec = $("productSection");
  if(!$("customerTools")){
    const bar = document.createElement("div");
    bar.id = "customerTools"; bar.className = "filters"; bar.style.marginTop = "18px";
    bar.innerHTML = '<button class="filter" onclick="openCompare()">⇄ Bandingkan (<span id="compareCount">0</span>)</button><button class="filter" onclick="orderLookupUI(\'track\')">Lacak pesanan</button><button class="filter" onclick="orderLookupUI(\'history\')">Riwayat pesanan</button>';
    sec.insertBefore(bar, sec.querySelector(".products"));
  }
  $("compareCount").textContent = compareIds.length;
  renderNoticeCount();
}

/* ---------- INTERACTION GUARDS ---------- */
(function(){
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.closeModal = function(id){
    const el = document.getElementById(id); if(!el) return;
    el.classList.remove('show','page-mode');
    if(id==='checkoutModal'||id==='adminModal'){
      if(typeof window.navigatePage==='function' && document.body.dataset.page!=='shop') window.navigatePage('shop');
      return;
    }
    if(id==='productFormModal' && document.body.dataset.page==='admin'){
      const admin = document.getElementById('adminModal');
      if(admin) admin.classList.add('show','page-mode');
    }
  };
  window.closeCart = function(event){
    if(event){ event.preventDefault(); event.stopPropagation(); }
    const drawer = document.getElementById('cartDrawer');
    if(drawer) drawer.classList.remove('show','page-view');
    const overlay = document.getElementById('overlay');
    if(overlay) overlay.classList.remove('show');
    if(document.body.dataset.page==='cart' && typeof window.navigatePage==='function') window.navigatePage('shop');
  };
  document.addEventListener('click', function(e){
    const close = e.target.closest('.close'); if(!close) return;
    const wrap = close.closest('.modal-wrap');
    if(wrap && wrap.id){ e.preventDefault(); e.stopPropagation(); window.closeModal(wrap.id); }
  }, true);
  document.addEventListener('keydown', function(e){
    if(e.key!=='Escape') return;
    const visible = [...document.querySelectorAll('.modal-wrap.show')].reverse().find(el=>getComputedStyle(el).display!=='none');
    if(visible){ e.preventDefault(); window.closeModal(visible.id); return; }
    const drawer = document.getElementById('cartDrawer');
    if(drawer && (drawer.classList.contains('show')||drawer.classList.contains('page-view'))){ e.preventDefault(); window.closeCart(); }
  });
  document.addEventListener('click', function(e){
    const wrap = e.target.classList && e.target.classList.contains('modal-wrap') ? e.target : null;
    if(wrap && wrap.classList.contains('show')) window.closeModal(wrap.id);
  });
  const search = document.getElementById('searchInput');
  if(search && !search.dataset.optimized){
    search.dataset.optimized = '1';
    search.removeEventListener('input', window.renderProducts);
    let timer;
    search.addEventListener('input', function(){
      clearTimeout(timer);
      timer = setTimeout(()=>{ if(typeof window.renderProducts==='function') window.renderProducts(); }, 100);
    }, {passive:true});
  }
  if(reduceMotion) document.documentElement.style.scrollBehavior = 'auto';
  document.querySelectorAll('form').forEach(form=>{
    form.addEventListener('submit', function(){
      const submit = form.querySelector('button[type="submit"],button:not([type])');
      if(submit){ submit.disabled = true; setTimeout(()=>{submit.disabled=false;},1800); }
    });
  });
  document.addEventListener('invalid', function(e){
    const form = e.target.form;
    if(form) form.querySelectorAll('button:disabled').forEach(b=>b.disabled=false);
  }, true);
})();

/* ---------- CART CLOSE ISOLATION ---------- */
(function(){
  let pageBeforeCart = 'shop';
  window.openCart = function(){
    if(typeof ronaCurrentPage!=='undefined' && ronaCurrentPage!=='cart') pageBeforeCart = ronaCurrentPage;
    if(typeof navigatePage==='function') navigatePage('cart');
    const drawer = document.getElementById('cartDrawer');
    if(drawer){ drawer.classList.remove('show'); drawer.classList.add('page-view'); }
    const overlay = document.getElementById('overlay'); if(overlay) overlay.classList.remove('show');
    if(typeof renderCart==='function') renderCart();
  };
  const cartClose = document.querySelector('#cartDrawer .drawer-head .close');
  if(cartClose){ cartClose.type = 'button'; cartClose.setAttribute('aria-label','Tutup keranjang'); cartClose.onclick = window.closeCart; }
  document.addEventListener('click', function(e){
    if(e.target.closest('#cartDrawer .drawer-head .close')){ e.preventDefault(); e.stopPropagation(); }
  }, true);
})();

/* ---------- INIT ---------- */
applyAppearance();
renderProducts();
renderCart();
addQuickLinks();
renderNoticeCount();
