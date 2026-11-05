/* ============================================================
   Data awal, state global, dan helper umum
   ============================================================ */

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

const load = (k, d) => {
  try {
    const x = localStorage.getItem(k);
    return x ? JSON.parse(x) : d;
  } catch {
    return d;
  }
};

let products = load("rona3_products", initialProducts);
let cart = load("rona3_cart", []);
let orders = load("rona3_orders", []);

let settings = load("rona3_settings", {
  whatsapp: "6281234567890",
  adminPassword: "admin123",
  shopName: "Rona Market",
  announcement: "✨ Pilihan menarik setiap hari · Belanja nyaman di Rona Market",
  heroTitle: "Temukan yang kamu suka, harga bersahabat.",
  heroDescription: "Produk pilihan untuk menemani aktivitasmu. Cari, pilih, dan pesan dengan lebih mudah.",
  heroImage: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
  primary: "#2878f0",
  accent: "#ff914d",
  tagline: "Belanja nyaman, pilihan lebih menyenangkan."
});

let activeType = "all",
    activeSub = "all",
    showOnlyFavorites = false,
    favorites = load("rona3_favorites", []),
    adminLogged = false,
    loginAttempts = 0,
    lockUntil = 0,
    idleTimer = null,
    toastTimer;

const $ = id => document.getElementById(id);
const rupiah = n => new Intl.NumberFormat("id-ID", {style: "currency", currency: "IDR", maximumFractionDigits: 0}).format(Number(n) || 0);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));

function save() {
  localStorage.setItem("rona3_products", JSON.stringify(products));
  localStorage.setItem("rona3_cart", JSON.stringify(cart));
  localStorage.setItem("rona3_orders", JSON.stringify(orders));
  localStorage.setItem("rona3_settings", JSON.stringify(settings));
  localStorage.setItem("rona3_favorites", JSON.stringify(favorites));
}

function toast(s) {
  $("toast").textContent = s;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2500);
}
