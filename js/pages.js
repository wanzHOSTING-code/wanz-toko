/* ============================================================
   Navigasi halaman (shop / track / cart / checkout / admin)
   ============================================================ */

let ronaCurrentPage = 'shop', ronaTrackMode = 'track';

function navigatePage(page) {
  ronaCurrentPage = page;
  document.body.dataset.page = page;
  document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === page));

  const drawer = $('cartDrawer');
  if (drawer) {
    drawer.classList.remove('show');
    if (page !== 'cart') drawer.classList.remove('page-view');
  }
  $('overlay')?.classList.remove('show');
  ['checkoutModal', 'adminModal'].forEach(id => $(id)?.classList.remove('page-mode', 'show'));

  if (page === 'shop') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (page === 'track') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    $('trackingPageForm')?.reset();
    $('trackingPageResult').innerHTML = '';
    const idField = $('trackingPageForm')?.elements.orderId;
    if (idField) {
      idField.closest('.field').hidden = ronaTrackMode === 'history';
      idField.required = ronaTrackMode !== 'history';
    }
    const h = $('trackingPage').querySelector('.page-heading h1');
    const desc = $('trackingPage').querySelector('.page-heading p');
    if (h) h.textContent = ronaTrackMode === 'history' ? 'Riwayat pesanan' : 'Lacak pesanan';
    if (desc) desc.textContent = ronaTrackMode === 'history'
      ? 'Lihat daftar pesanan yang pernah dibuat menggunakan nomor WhatsApp-mu.'
      : 'Pantau status pesanan Rona Market dengan nomor pesanan dan WhatsApp yang digunakan saat checkout.';
    return;
  }
  if (page === 'cart') {
    drawer.classList.add('page-view');
    renderCart();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
}

/* ---- Cart page ---- */
function openCart() {
  navigatePage('cart');
  $('cartDrawer').classList.add('page-view');
}

function closeCart() {
  if (ronaCurrentPage === 'cart') {
    navigatePage('shop');
  } else {
    $('overlay')?.classList.remove('show');
    $('cartDrawer')?.classList.remove('show');
  }
}

/* ---- Checkout page ---- */
const originalOpenCheckoutV51 = openCheckout;

function openCheckout() {
  if (!cart.length) return toast('Keranjang masih kosong.');
  if (cart.some(x => { const p = products.find(y => y.id === x.id); return !p || x.quantity > p.stock; })) return toast('Periksa kembali stok/kuota.');
  const hasPhysical = cart.some(x => products.find(p => p.id === x.id).type === 'fisik');
  const hasDigital = cart.some(x => products.find(p => p.id === x.id).type === 'digital');
  $('physicalFields').hidden = !hasPhysical;
  $('digitalFields').hidden = !hasDigital;
  $('checkoutHeading').textContent = hasPhysical && hasDigital ? 'Data pesanan campuran' : hasDigital ? 'Data pesanan digital' : 'Data pengiriman';
  $('checkoutForm').elements.address.required = hasPhysical;
  $('checkoutForm').elements.digitalEmail.required = false;
  $('checkoutForm').elements.accountId.required = false;
  $('checkoutTotal').textContent = rupiah(cart.reduce((s, x) => s + products.find(p => p.id === x.id).price * x.quantity, 0));
  navigatePage('checkout');
  $('checkoutModal').classList.add('show', 'page-mode');
}

/* ---- Admin page ---- */
function openAdmin() {
  navigatePage('admin');
  $('adminModal').classList.add('show', 'page-mode');
  $('adminLogin').hidden = adminLogged;
  $('adminDashboard').hidden = !adminLogged;
  if (adminLogged) renderAdmin('products');
}

/* ---- Tracking page ---- */
function orderLookupUI(mode) {
  ronaTrackMode = mode === 'history' ? 'history' : 'track';
  navigatePage('track');
}

function renderTrackingOrder(o) {
  const stages = ['Menunggu konfirmasi', 'Diproses', 'Dikirim', 'Selesai'];
  let status = o.status || 'Menunggu konfirmasi';
  let active = status === 'Dibatalkan' ? -1 : stages.indexOf(status);
  if (active < 0 && status !== 'Dibatalkan') {
    active = status.toLowerCase().includes('kirim') ? 2 : status.toLowerCase().includes('proses') ? 1 : 0;
  }
  const stageHtml = stages.map((st, i) =>
    `<div class="tracking-stage ${i < active ? 'done' : i === active ? 'current' : ''}">${st}</div>`
  ).join('');

  return `<article class="tracking-order-card">
    <div class="tracking-order-top">
      <div>
        <small>NOMOR PESANAN</small>
        <h3>${esc(o.id)}</h3>
        <small>${esc(o.date || '')}</small>
      </div>
      <div class="tracking-total">
        <span class="status-pill ${status === 'Selesai' ? 'done' : status === 'Dibatalkan' ? 'cancel' : ''}">${esc(status)}</span>
        <div style="margin-top:9px">${rupiah(o.total)}</div>
      </div>
    </div>
    ${status === 'Dibatalkan'
      ? '<div class="notice" style="margin-top:15px">Pesanan ini dibatalkan. Hubungi admin toko jika membutuhkan bantuan.</div>'
      : `<div class="tracking-timeline">${stageHtml}</div>`}
    <div class="tracking-meta">
      <div>Nama pemesan<b>${esc(o.customer || '-')}</b></div>
      <div>Kurir<b>${esc(o.courier || 'Belum ditentukan')}</b></div>
      <div>Alamat pengiriman<b>${esc(o.address || '-')}</b></div>
      <div>Voucher<b>${esc(o.voucher || 'Tidak digunakan')}</b></div>
    </div>
    <div class="tracking-items">
      <b>Detail pesanan</b><br>
      ${(o.items || []).map(i => `${esc(products.find(p => p.id === i.id)?.name || 'Produk')} × ${i.quantity}`).join('<br>')}
    </div>
    ${o.deliveryInfo ? `<div class="notice" style="margin-top:13px"><b>Informasi pengiriman / digital</b><br>${esc(o.deliveryInfo)}</div>` : ''}
  </article>`;
}

$('trackingPageForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const id = String(f.get('orderId') || '').trim().toLowerCase();
  const phone = normalizePhone(f.get('phone'));
  const found = orders.filter(o =>
    normalizePhone(o.phone) === phone &&
    (ronaTrackMode === 'history' || String(o.id).toLowerCase() === id)
  );
  $('trackingPageResult').innerHTML = found.length
    ? found.map(renderTrackingOrder).join('')
    : `<div class="tracking-empty">
        <i class="fa-solid fa-box-open"></i>
        <div><b>${ronaTrackMode === 'history' ? 'Belum ada riwayat pesanan' : 'Pesanan belum ditemukan'}</b></div>
        <p style="margin-top:6px">${ronaTrackMode === 'history'
          ? 'Belum ada pesanan dengan nomor WhatsApp tersebut.'
          : 'Pastikan nomor pesanan dan WhatsApp sama seperti saat checkout.'}</p>
      </div>`;
});

/* ---- Notifikasi ---- */
function renderNoticeCount() {
  const el = $('noticeCount');
  if (!el) return;
  const unread = notifications.filter(n => !n.read).length;
  el.textContent = unread > 99 ? '99+' : unread;
  el.style.display = unread ? 'inline-block' : 'none';
}

function openNotifications() {
  const unread = notifications.filter(n => !n.read).length;
  notifications.forEach(n => n.read = true);
  save();
  renderNoticeCount();
  const body = notifications.length
    ? notifications.map(n => `<div style="display:flex;gap:12px;padding:14px 2px;border-bottom:1px solid var(--line)">
        <span style="width:36px;height:36px;flex:none;border-radius:11px;background:#edf5ff;color:var(--blue);display:grid;place-items:center">
          <i class="fa-regular fa-bell"></i>
        </span>
        <div>
          <b style="font-size:12px">${esc(n.title)}</b>
          <p style="font-size:11px;margin:5px 0;color:#667085">${esc(n.message)}</p>
          <small style="color:var(--muted)">${esc(n.date)}</small>
        </div>
      </div>`).join('')
    : `<div class="tracking-empty"><i class="fa-regular fa-bell-slash"></i><p>Belum ada notifikasi.</p></div>`;
  openFeatureModal('Notifikasi', `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <small style="color:var(--muted)">${unread} notifikasi belum dibaca</small>
    <button class="filter" onclick="notifications=[];save();openNotifications()">Hapus semua</button>
  </div>${body}`);
}

/* ---- Close behaviour untuk page-mode ---- */
const oldCloseModalV51 = closeModal;
function closeModal(id) {
  if ((id === 'checkoutModal' && ronaCurrentPage === 'checkout') ||
      (id === 'adminModal' && ronaCurrentPage === 'admin')) {
    navigatePage('shop');
    return;
  }
  oldCloseModalV51(id);
}

/* Setelah checkout tersimpan, tampilkan halaman tracking dengan ID terisi */
$('checkoutForm')?.addEventListener('submit', () => {
  setTimeout(() => {
    if (orders.length) {
      const o = orders[0];
      if (o && o.timestamp > Date.now() - 10000) {
        navigatePage('track');
        const idField = $('trackingPageForm')?.elements.orderId;
        const phoneField = $('trackingPageForm')?.elements.phone;
        if (idField) idField.value = o.id;
        if (phoneField) phoneField.value = o.phone;
        $('trackingPageResult').innerHTML = renderTrackingOrder(o);
      }
    }
  }, 0);
});

renderNoticeCount();