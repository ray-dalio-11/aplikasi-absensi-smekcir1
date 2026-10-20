const J = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) || d;
  } catch (e) {
    return d;
  }
};
const save = () => {
  try {
    const { school, att, sp, log, izin, ann, extra, jadwal } = S;
    localStorage.setItem(
      "ayo",
      JSON.stringify({ school, att: strip(att), sp, log, izin, ann, extra, jadwal }),
    );
    sessionStorage.setItem("ayoS", JSON.stringify({ user: S.user, tab: S.tab }));
    bc && bc.postMessage(1);
    window.FB && FB.push();
  } catch (e) {}
};
let bc = null;
try {
  bc = new BroadcastChannel("ayo");
} catch (e) {}
const MAX_R = 10;
const SISWA = []; // diisi admin lewat tab Siswa (impor)
const NILAI = {};
const SP0 = {};
let S = Object.assign(
  {
    school: { lat: null, lng: null, r: 10 },
    att: {},
    sp: SP0,
    log: [],
    izin: [],
    ann: [],
    jadwal: [],
    extra: [],
    user: null,
    tab: "home",
  },
  J("ayo", {}),
);
try {
  const z = JSON.parse(sessionStorage.getItem("ayoS")) || {};
  if (z.tab) S.tab = z.tab;
} catch (e) {}
const reload = () => {
  const u = S.user,
    t = S.tab;
  S = Object.assign(S, J("ayo", {}));
  S.user = u;
  S.tab = t;
};
let sim = { on: false, m: 4 };
const $ = (s) => document.querySelector(s),
  pad = (n) => String(n).padStart(2, "0");
const esc = (x) => String(x == null ? "" : x).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const okImg = (p) =>
  typeof p === "string" && p.length < 30000 && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(p);
const normAtt = (o) => {
  o = o || {};
  const t = /^\d\d:\d\d$/;
  return {
    in: t.test(o.in) ? o.in : undefined,
    out: t.test(o.out) ? o.out : undefined,
    dist: Number.isFinite(+o.dist) ? +o.dist : 0,
    photo: okImg(o.photo) ? o.photo : "",
    valid: o.valid === true || o.valid === false ? o.valid : null,
    d: /^\d{4}-\d\d-\d\d$/.test(o.d) ? o.d : undefined,
    n: typeof o.n === "string" ? o.n : undefined,
  };
};
const normIzin = (a) =>
  (Array.isArray(a) ? a : [])
    .slice(-500)
    .map((x) => ({
      n: String(x.n || ""),
      j: String(x.j || "").slice(0, 30),
      k: String(x.k || "").slice(0, 200),
      d: String(x.d || "").slice(0, 10),
      st: ["menunggu", "disetujui", "ditolak"].includes(x.st) ? x.st : "menunggu",
    }));
let boot = true;
window.endBoot = (r) => {
  if (boot) {
    boot = false;
    if (r !== false && !S.user) render();
  }
};
setTimeout(() => window.endBoot(), 8000);
const hm = () => {
  const d = new Date();
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
};
const ic = {
  home: '<path d="M3 11l9-8 9 8v10H3z"/>',
  cam: '<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="8" cy="12" r="2"/><path d="M13 10h6M13 14h4"/>',
  ok: '<path d="M5 12l5 5L20 7"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  pin: '<path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 15-5 16 0"/>',
};
const TABS = {
  siswa: [
    ["home", "Beranda", "home"],
    ["absen", "Absen", "cam"],
    ["jadwal", "Jadwal", "cal"],
    ["kartu", "Kartu", "card"],
    ["cs", "CS", "chat"],
  ],
  guru: [
    ["home", "Beranda", "home"],
    ["validasi", "Validasi", "ok"],
    ["jadwal", "Jadwal", "cal"],
    ["cs", "CS", "chat"],
  ],
  ortu: [
    ["home", "Anak", "user"],
    ["nilai", "Nilai", "chart"],
    ["jadwal", "Jadwal", "cal"],
    ["cs", "CS", "chat"],
  ],
  admin: [
    ["home", "Beranda", "home"],
    ["lokasi", "Lokasi", "pin"],
    ["siswa", "Siswa", "user"],
    ["sp", "Peringatan", "chart"],
    ["jadwal", "Jadwal", "cal"],
    ["cs", "CS", "chat"],
  ],
};
const toast = (m) => {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = m;
  document.body.append(t);
  setTimeout(() => t.remove(), 2400);
};
function dist(a, b, c, d) {
  const R = 6371000,
    r = Math.PI / 180,
    x = (c - a) * r,
    y = (d - b) * r,
    h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const AL = {
  siswa: ["Masuk sebagai siswa", "NISN"],
  ortu: ["Masuk sebagai orang tua", "NISN anak"],
  guru: ["Masuk sebagai guru", "NIP"],
  admin: ["Masuk sebagai admin kurikulum", ""],
};
const APPN = {
  siswa: "Absen, jadwal pelajaran, dan kartu pelajar digital.",
  ortu: "Pantau kehadiran, nilai, dan peringatan anak Anda.",
  guru: "Validasi kehadiran, kelola izin dan surat peringatan.",
  admin: "Panel kurikulum: titik absen, data siswa, pengumuman.",
};
function login() {
  $("#nav").innerHTML = "";
  if (boot) {
    $("#app").innerHTML = '<div class="mute" style="padding-top:30vh;text-align:center">Memuat…</div>';
    return;
  }
  $("#app").innerHTML =
    `<div style="padding-top:8vh"><div class="logo" style="font-size:26px"><i style="width:40px;height:40px;font-size:20px;border-radius:13px">A</i>Ayo Absen</div><p class="mute" style="margin-top:14px">${APPN[APP]}</p></div>
 <div class="card" style="margin-top:20px"><h2 style="margin-top:0">${AL[APP][0]}</h2><p class="mute" style="margin-bottom:14px">Masuk memakai akun Google. ${AL[APP][1] ? "Pertama kali masuk, Anda diminta menghubungkan " + AL[APP][1] + "." : ""}</p><button class="btn" id="go">Masuk dengan Google</button></div>`;
  $("#go").onclick = () =>
    window.FB ? FB.signIn() : toast("Firebase belum termuat. Buka lewat http(s), bukan file://");
}
const me = () => SISWA.find((s) => s[0] === S.user.nisn) || ["", "—", "—"];
const dk = () => ymd(new Date()),
  K = (n) => dk() + "_" + n,
  strip = (a) =>
    Object.fromEntries(Object.entries(a).map(([k, v]) => [k, k.startsWith(dk()) ? v : { ...v, photo: "" }]));
const att = (n) => S.att[K(n)] || {};
const stat = (a) =>
  !a.in
    ? ["Belum absen", "warn"]
    : a.valid === true
      ? ["Hadir · divalidasi", ""]
      : a.valid === false
        ? ["Ditolak guru", "bad"]
        : ["Hadir · menunggu guru", "warn"];
function schedule() {
  if (!S.jadwal.length) return '<span class="mute">Jadwal belum diisi admin.</span>';
  const now = hm();
  return S.jadwal
    .map((j) => {
      const [s, e] = j[0].split("–");
      const on = now >= s && now < e;
      return `<div class="sch ${on ? "now" : ""}"><b>${j[0]}</b><div><div>${j[1]}</div><div class="mute">${j[2]} · ${j[3]}</div></div></div>`;
    })
    .join("");
}
function home() {
  const r = S.user.role,
    a = att(me()[0]);
  if (r === "siswa") {
    const [t, c] = stat(a),
      cur = nowClass();
    return `<div style="margin-bottom:14px"><div class="mute">${greet()}</div><h1>${me()[1].split(" ")[0]}</h1></div>
 <div class="card hero"><div class="row"><div><div style="opacity:.8;font-size:13px">${dayStr()}</div><div class="clk" id="clk">${hm()}</div></div><span class="chip">${t}</span></div>
 ${!a.in ? '<button class="btn" data-t2="absen" style="margin-top:14px">Absen masuk sekarang</button>' : a.out ? '<div style="margin-top:12px;opacity:.9">Masuk ' + a.in + " · Pulang " + a.out + "</div>" : '<div style="margin-top:12px;opacity:.9">Masuk ' + a.in + '. Jangan lupa absen pulang.</div><button class="btn" data-t2="absen" style="margin-top:10px">Absen pulang</button>'}</div>
 ${cur ? `<div class="card"><div class="tag">Sedang berlangsung</div><div style="font-size:18px;font-weight:600">${cur[1]}</div><div class="mute">${cur[2]} · ${cur[3]} · ${cur[0]}</div></div>` : ""}
 ${wkCard()}<button class="btn ghost" data-t2="izin">Ajukan izin / sakit</button><h2>Jadwal hari ini</h2><div class="card">${schedule()}</div>`;
  }
  if (r === "ortu") {
    const [t, c] = stat(a),
      sp = S.sp[me()[0]] || [];
    return `<h1>${me()[1]}</h1><p class="mute">${me()[2]} · anak Anda</p>
 <div class="card"><div class="row"><div><div class="tag">Absen hari ini (langsung)</div><div style="font-size:18px;font-weight:600">${t}</div></div><span class="chip ${c}">${a.in || "—"}</span></div>${a.out ? `<div class="mute">Pulang ${a.out}</div>` : ""}</div>
 ${wkCard()}<h2>Riwayat peringatan BK</h2><div class="card">${sp.length ? sp.map((x) => `<div><span class="chip bad">${esc(x.t)}</span> <b>${esc(x.d)}</b><div class="mute">${esc(x.n)}</div></div>`).join("") : '<span class="mute">Belum ada surat peringatan.</span>'}</div>`;
  }
  if (r === "guru") {
    const h = SISWA.filter((s) => att(s[0]).in).length;
    return `<h1>Halo, ${esc((S.user.name || "Guru").split(" ")[0])}</h1><p class="mute">Dashboard guru</p>
 <div class="card"><div class="tag">Hadir hari ini</div><div style="font-size:28px;font-weight:700">${h} <span class="mute" style="font-size:15px">dari ${SISWA.length} siswa</span></div><div class="meter" style="margin-top:10px"><i style="width:${SISWA.length ? (h / SISWA.length) * 100 : 0}%"></i></div></div>
 <h2>Sedang berlangsung</h2><div class="card">${schedule()}</div>`;
  }
  const h = SISWA.filter((s) => att(s[0]).in).length;
  return `<h1>Kurikulum</h1><p class="mute">Ringkasan sekolah hari ini</p>
 <div class="card"><div class="tag">Absen masuk</div><div style="font-size:28px;font-weight:700">${h}/${SISWA.length}</div></div>
 <div class="card"><div class="tag">Titik lokasi</div><div>${S.school.lat ? "Sudah diatur · radius " + S.school.r + " m" : '<span class="chip warn">Belum diatur</span> Atur di tab Lokasi'}</div></div>
 ${rekap()}<h2>Kehadiran langsung</h2><div class="card">${SISWA.map((s) => {
   const a = att(s[0]),
     [t, c] = stat(a);
   return `<div class="row" style="padding:6px 0"><span>${s[1]}</span><span class="chip ${c}">${a.in || "—"}</span></div>`;
 }).join("")}</div>`;
}
let stream = null,
  pos = null,
  wid = null,
  snap = null;
function absen() {
  const a = att(me()[0]),
    fase = !a.in ? "masuk" : !a.out ? "pulang" : "selesai";
  const body =
    fase === "selesai"
      ? `<div class="card"><b>Absen hari ini sudah lengkap.</b><div class="mute">Masuk ${a.in} · Pulang ${a.out}</div></div>`
      : `
 <h1>Absen ${fase}</h1><p class="mute">Foto wajah dan lokasi dicek bersama. Batas jarak ${Math.min(S.school.r, MAX_R)} m dari titik sekolah.</p>
 <div class="card"><video id="v" autoplay playsinline muted></video><canvas id="c" width="96" height="72" style="display:none"></canvas>
 <div class="row" style="margin-top:12px"><div><div class="tag">Jarak ke titik absen</div><div id="d" style="font-size:22px;font-weight:700">—</div></div><span id="s" class="chip warn">Menunggu</span></div>
 <div class="meter" style="margin-top:8px"><i id="m" style="width:0"></i></div></div>
 <button class="btn" id="ab">Ambil foto &amp; absen ${fase}</button>`;
  return body;
}
function initAbsen() {
  const v = $("#v");
  if (!v) return;
  navigator.mediaDevices
    ?.getUserMedia({ video: { facingMode: "user" } })
    .then((s) => {
      stream = s;
      v.srcObject = s;
    })
    .catch(() => toast("Kamera tidak bisa diakses. Izinkan kamera di pengaturan browser."));
  const upd = () => {
    const R = Math.min(S.school.r, MAX_R);
    let d = sim.on
      ? sim.m
      : pos && S.school.lat
        ? dist(pos.latitude, pos.longitude, S.school.lat, S.school.lng)
        : null;
    if (!sim.on && !S.school.lat) d = null;
    $("#d").textContent = d == null ? "—" : d.toFixed(1) + " m";
    const ok = d != null && d <= R;
    $("#m").style.width = d == null ? 0 : Math.max(4, 100 - (d / (R * 3)) * 100) + "%";
    const s = $("#s");
    s.textContent =
      d == null
        ? S.school.lat || sim.on
          ? "Mencari GPS"
          : "Titik belum diatur"
        : ok
          ? "Di dalam radius"
          : "Di luar radius";
    s.className = "chip " + (ok ? "" : "bad");
    window._ok = ok;
    window._d = d;
  };
  if (wid == null && navigator.geolocation)
    wid = navigator.geolocation.watchPosition(
      (p) => {
        pos = p.coords;
        upd();
      },
      () => {},
      { enableHighAccuracy: true },
    );
  upd();
  $("#ab").onclick = () => {
    upd();
    if (pos && pos.accuracy > 25)
      return toast("Akurasi GPS " + Math.round(pos.accuracy) + " m. Tunggu sinyal lebih baik.");
    if (!window._ok)
      return toast(
        `Absen gagal: jarak ${window._d == null ? "tidak diketahui" : window._d.toFixed(1) + " m"}, batas ${Math.min(S.school.r, MAX_R)} m`,
      );
    if (!v.videoWidth) return toast("Kamera belum siap. Tunggu gambar muncul.");
    let photo = "";
    try {
      const c = $("#c");
      c.getContext("2d").drawImage(v, 0, 0, 96, 72);
      photo = c.toDataURL("image/jpeg", 0.5);
    } catch (e) {}
    if (!photo) return toast("Foto wajib. Izinkan akses kamera.");
    const a = (S.att[K(me()[0])] = S.att[K(me()[0])] || {});
    const fase = a.in ? "pulang" : "masuk";
    if (!a.in) {
      a.in = hm();
      a.photo = photo;
      a.valid = null;
    } else a.out = hm();
    a.dist = +window._d.toFixed(1);
    S.log.push({ n: me()[0], t: `${me()[1]} absen ${fase} ${hm()} · ${a.dist} m` });
    S.log = S.log.slice(-30);
    save();
    navigator.vibrate && navigator.vibrate(60);
    okSheet(fase, a);
  };
}
const stop = () => {
  stream && stream.getTracks().forEach((t) => t.stop());
  stream = null;
  wid != null && navigator.geolocation.clearWatch(wid);
  wid = null;
};
const noSiswa = () =>
  '<div class="card"><span class="mute">Belum ada data siswa. Admin mengimpor siswa lewat tab Siswa.</span></div>';
function validasi() {
  if (!SISWA.length) return noSiswa();
  return (
    `<h1>Validasi kehadiran</h1><p class="mute">Cek siswa tetap mengikuti pelajaran sampai jam pulang.</p>` +
    izinList() +
    SISWA.map((s) => {
      const a = att(s[0]),
        [t, c] = stat(a);
      return `<div class="card"><div class="row"><div style="display:flex;gap:10px;align-items:center">${okImg(a.photo) ? `<img src="${a.photo}" width="48" height="36" style="border-radius:8px">` : '<div style="width:48px;height:36px;border-radius:8px;background:var(--bg)"></div>'}<div><b>${s[1]}</b><div class="mute">${a.in ? `Masuk ${a.in} · ${a.dist} m${a.out ? " · Pulang " + a.out : ""}` : "Belum absen"}</div></div></div><span class="chip ${c}">${a.valid === true ? "Valid" : a.valid === false ? "Ditolak" : "—"}</span></div>
 ${a.in ? `<div class="row" style="margin-top:10px"><button class="btn" data-v="1" data-n="${s[0]}">Valid</button><button class="btn ghost" data-v="0" data-n="${s[0]}">Tolak</button></div>` : ""}</div>`;
    }).join("")
  );
}
const nm = (n) => SISWA.find((s) => s[0] === n);
function hist(n, m) {
  const t = new Date(),
    iz = S.izin.filter((x) => x.n === n && x.st === "disetujui" && x.d);
  let H = 0,
    I = 0,
    Sk = 0,
    A = 0,
    T = 0;
  for (let i = 1; i <= m * 30; i++) {
    const d = new Date(t);
    d.setDate(t.getDate() - i);
    const w = d.getDay();
    if (w === 0 || w === 6) continue;
    const k = ymd(d),
      a = S.att[k + "_" + n],
      z = iz.find((x) => x.d === k);
    T++;
    if (a && a.in && a.valid !== false) H++;
    else if (z) z.j === "Sakit" ? Sk++ : I++;
    else A++;
  }
  return { H, I, Sk, A, T: T || 1 };
}
const pct = (h) => Math.round((h.H / h.T) * 100);
function rekap() {
  if (!SISWA.length) return "";
  return `<h2>Rekap 30 hari</h2><div class="card"><div class="row" style="margin-bottom:8px"><button class="btn ghost" data-rk="1">Muat data</button><button class="btn ghost" data-csv="1">Unduh CSV</button></div>${SISWA.map(
    (s) => {
      const h = hist(s[0], 1);
      return `<div style="padding:6px 0"><div class="row"><span>${s[1]}</span><b>${pct(h)}%</b></div><div class="meter" style="margin-top:4px"><i style="width:${pct(h)}%"></i></div></div>`;
    },
  ).join("")}</div>`;
}
function izinList() {
  if (S.user.role !== "guru") return "";
  const z = S.izin
    .map((x, i) =>
      x.st === "menunggu"
        ? `<div class="row" style="padding:6px 0"><div><b>${esc((nm(x.n) || [])[1] || x.n)}</b> <span class="chip warn">${esc(x.j)}</span><div class="mute">${esc(x.k)}</div></div><div><button class="chip" data-z="${i}" style="border:0;cursor:pointer">Setujui</button> <button class="chip bad" data-zx="${i}" style="border:0;cursor:pointer">Tolak</button></div></div>`
        : "",
    )
    .join("");
  return `<h2>Izin masuk</h2><div class="card">${z || '<span class="mute">Tidak ada pengajuan.</span>'}</div><h2>Surat peringatan BK</h2><div class="card"><select id="spn">${SISWA.map((s) => `<option value="${s[0]}">${s[1]}</option>`).join("")}</select><input id="spt" placeholder="Alasan, misal: bolos 2 kali"><button class="btn ghost" id="spb">Kirim SP ke orang tua</button></div><h2>Input nilai</h2><div class="card"><select id="nln">${SISWA.map((s) => `<option value="${s[0]}">${s[1]}</option>`).join("")}</select><input id="nlm" placeholder="Mata pelajaran"><input id="nlv" type="number" min="0" max="100" placeholder="Nilai 0–100"><button class="btn ghost" data-nl="1">Simpan nilai</button></div><h2>Absen hari ini</h2>`;
}
function izin() {
  const mine = S.izin.filter((x) => x.n === me()[0]);
  return `<h1>Ajukan izin</h1><p class="mute">Wali kelas akan menyetujui.</p><div class="card"><label class="tag">Jenis</label><select id="zj"><option>Sakit</option><option>Izin keluarga</option><option>Lainnya</option></select><label class="tag">Keterangan</label><input id="zk" placeholder="Singkat saja"><button class="btn" id="zs">Kirim pengajuan</button></div><h2>Pengajuan saya</h2><div class="card">${mine.map((x) => `<div class="row"><span>${esc(x.j)} · ${esc(x.k)}</span><span class="chip ${x.st === "disetujui" ? "" : x.st === "ditolak" ? "bad" : "warn"}">${esc(x.st)}</span></div>`).join("") || '<span class="mute">Belum ada.</span>'}</div>`;
}
let chat = [["b", "Halo, saya CS Ayo Absen. Pilih pertanyaan di bawah atau ketik sendiri."]];
const FAQ = {
  siswa: ["jadwal", "absen saya", "nilai saya", "Cara absen?", "Kenapa absen gagal?"],
  ortu: ["absen anak", "nilai anak", "sp anak", "jadwal", "Kenapa absen gagal?"],
  guru: ["hari ini", "bermasalah", "jadwal", "Cara absen?"],
  admin: ["hari ini", "bermasalah", "Cara impor siswa?", "Cara absen?"],
};
function who(t) {
  const r = S.user.role;
  if (r === "siswa" || r === "ortu") {
    const o = SISWA.find(
      (s) => s[0] !== me()[0] && (t.includes(s[1].split(" ")[0].toLowerCase()) || t.includes(s[0])),
    );
    return o ? "deny" : me();
  }
  return SISWA.find((s) => t.includes(s[1].split(" ")[0].toLowerCase()) || t.includes(s[0]));
}
function ans(q) {
  const r = S.user.role,
    t = q.trim().toLowerCase().replace(/^\//, ""),
    s = who(t),
    stf = r === "guru" || r === "admin";
  if (s === "deny")
    return "Maaf, Anda hanya bisa melihat data " + (r === "ortu" ? "anak Anda" : "diri sendiri") + ".";
  if (/cara absen|bagaimana absen/.test(t))
    return "Buka tab Absen, izinkan kamera dan lokasi, berdiri di area sekolah (maksimal 10 m dari titik absen), lalu ketuk Ambil foto &amp; absen. Guru mapel akan memvalidasi kehadiran Anda sampai jam pulang.";
  if (/gagal|ditolak|kenapa/.test(t))
    return "Absen gagal biasanya karena: (1) jarak lebih dari 10 m dari titik absen, (2) kamera atau GPS belum diizinkan, (3) guru menolak validasi. Coba berpindah ke area terbuka agar GPS lebih akurat.";
  if (/impor/.test(t))
    return r === "admin"
      ? "Buka tab Siswa, tempel daftar dari Excel dengan format NISN, nama, kelas (satu siswa per baris), lalu ketuk Impor siswa."
      : "Perintah ini khusus admin.";
  if (/jadwal/.test(t)) return S.jadwal.map((j) => `${j[0]} · ${j[1]} (${j[2]}, ${j[3]})`).join("<br>");
  if (/bermasalah/.test(t)) {
    if (!stf) return "Perintah ini khusus guru dan admin.";
    const k = Object.keys(S.sp);
    return k.length
      ? k
          .map((n) => `${(nm(n) || [])[1] || n} · ${S.sp[n].length} SP (${S.sp[n].slice(-1)[0].t})`)
          .join("<br>")
      : "Tidak ada siswa bermasalah.";
  }
  if (!s && /hari ini|hari-ini/.test(t) && stf)
    return SISWA.map((x) => {
      const a = att(x[0]);
      return `${x[1]}: ${a.in ? "masuk " + a.in + (a.out ? ", pulang " + a.out : "") : "belum absen"}`;
    }).join("<br>");
  if (!s)
    return stf
      ? "Sebutkan nama atau NISN siswa, contoh: cari Budi. Atau coba: bermasalah, hari ini."
      : "Saya belum paham. Coba salah satu tombol di atas.";
  const a = att(s[0]),
    sps = S.sp[s[0]] || [];
  if (/\bsp\b|peringatan/.test(t))
    return sps.length
      ? sps.map((x) => `${x.t} · ${x.d}: ${x.n}`).join("<br>")
      : s[1] + " belum pernah menerima SP.";
  if (/laporan|rekap/.test(t)) {
    const m = +(t.match(/\b([1-3])\b/) || [0, 1])[1],
      h = hist(s[0], m),
      nl = NILAI[s[0]] || [],
      av = nl.length ? Math.round(nl.reduce((x, y) => x + y[1], 0) / nl.length) : "-";
    return `${s[1]} · ${m} bulan terakhir<br>Hadir ${h.H}, izin ${h.I}, sakit ${h.Sk}, alpa ${h.A} (${pct(h)}%)<br>Rata-rata nilai: ${av}`;
  }
  if (/nilai/.test(t)) {
    const nl = NILAI[s[0]];
    return nl ? nl.map((x) => x[0] + ": " + x[1]).join("<br>") : "Belum ada nilai untuk " + s[1] + ".";
  }
  if (/absen|hari ini|hari-ini/.test(t))
    return `${s[1]}: ${a.in ? "masuk " + a.in + (a.out ? ", pulang " + a.out : "") + " (" + a.dist + " m)" : "belum absen hari ini"}`;
  return `${s[1]}<br>NISN ${s[0]} · ${s[2]}<br>Hari ini: ${a.in ? "masuk " + a.in : "belum absen"}<br>SP BK: ${sps.length}`;
}
function cs() {
  const r = S.user.role;
  return `<h1>Tanya CS</h1><p class="mute">Tanya soal absensi, jadwal, dan data siswa sesuai hak akses Anda.</p>
 <div class="chips">${FAQ[r].map((x) => `<button class="chip" data-q="${x}">${x}</button>`).join("")}</div>
 <div class="card">${chat.map((m) => `<div class="bub ${m[0]}"><span>${m[1]}</span></div>`).join("")}</div>
 <input id="bq" placeholder="Ketik pertanyaan"><button class="btn" id="bs">Kirim</button>`;
}
const greet = () => {
  const h = new Date().getHours();
  return "Selamat " + (h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam");
};
const dayStr = () =>
  new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
function nowClass() {
  const n = hm();
  return S.jadwal.find((j) => {
    const [a, b] = j[0].split("–");
    return n >= a && n < b;
  });
}
function okSheet(f, a) {
  render();
  const o = document.createElement("div");
  o.className = "ov";
  o.innerHTML = `<div class="sheet"><svg viewBox="0 0 52 52" width="72" height="72"><circle cx="26" cy="26" r="24" fill="none" stroke="var(--acc)" stroke-width="3"/><path class="ck" d="M15 27l8 8 14-16" fill="none" stroke="var(--acc)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg><h2 style="margin:10px 0 2px">Absen ${f} berhasil</h2><div class="mute">${hm()} · ${a.dist} m dari titik absen</div><div class="mute" style="margin-top:4px">Menunggu validasi guru mapel.</div><button class="btn" style="margin-top:16px">Selesai</button></div>`;
  o.onclick = () => o.remove();
  document.body.append(o);
}
const RL = { siswa: "Siswa", guru: "Guru", ortu: "Orang tua", admin: "Admin" };
function topbar() {
  return `<div class="top"><div class="logo"><i>A</i>Ayo Absen</div><span class="chip">${RL[S.user.role]}</span></div>`;
}
function syncSiswa() {
  (S.extra || []).forEach((x) => {
    if (!SISWA.find((s) => s[0] === x[0])) SISWA.push(x);
  });
}
function wkCard() {
  const n = me()[0],
    d = new Date(),
    dow = (d.getDay() + 6) % 7,
    mon = new Date(d);
  mon.setDate(d.getDate() - dow);
  let c = [],
    run = 0;
  for (let i = 0; i < 5; i++) {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    const k = ymd(x),
      a = S.att[k + "_" + n],
      z = S.izin.some((y) => y.n === n && y.st === "disetujui" && y.d === k);
    const v = i > dow ? "" : a && a.in && a.valid !== false ? "h" : z ? "i" : "";
    c.push(v);
    if (v === "h") run++;
    else if (i < dow) run = 0;
  }
  return `<div class="card"><div class="row"><b>Pekan ini</b><span class="mute">${run} hari hadir beruntun</span></div><div class="wk" style="margin-top:10px">${["Sen", "Sel", "Rab", "Kam", "Jum"].map((x, i) => `<div class="${i === dow ? "t" : ""}">${x}<b class="${c[i]}"></b></div>`).join("")}</div></div>`;
}
function attn() {
  const now = hm(),
    l = [];
  SISWA.forEach((s) => {
    const a = att(s[0]);
    if (a.in && a.in > "07:15") l.push([s[1], "Terlambat, masuk " + a.in]);
    else if (!a.in && now > "07:30" && now < "15:00" && ![0, 6].includes(new Date().getDay()))
      l.push([s[1], "Belum absen"]);
    if (S.sp[s[0]] && S.sp[s[0]].length) l.push([s[1], S.sp[s[0]].length + " SP BK"]);
  });
  return (
    (S.user.role === "admin" && window.pendHTML ? pendHTML() : "") +
    `<h2>Perlu perhatian</h2><div class="card">${l.map((x) => `<div class="row" style="padding:5px 0"><b>${x[0]}</b><span class="chip warn">${x[1]}</span></div>`).join("") || '<span class="mute">Semua aman.</span>'}</div>`
  );
}
function annBox() {
  const ad = S.user.role === "admin";
  return `<h2>Pengumuman</h2><div class="card">${ad ? '<input id="at" placeholder="Tulis pengumuman untuk semua peran"><button class="btn ghost" id="ap">Kirim pengumuman</button>' : ""}${
    S.ann
      .slice(-3)
      .reverse()
      .map((x) => `<div class="ann"><b>${esc(x.t)}</b><div class="mute">${esc(x.d)}</div></div>`)
      .join("") || '<span class="mute">Belum ada.</span>'
  }</div>`;
}
function jadwalTab() {
  return (
    `<h1>Jadwal pelajaran</h1><p class="mute">Guru, jam, dan ruang kelas</p><div class="card">${schedule()}</div>` +
    (S.user.role === "admin"
      ? `<h2>Ubah jadwal</h2><div class="card"><textarea id="jt" placeholder="07:00-08:30, Mata pelajaran, Nama guru, Ruang (satu baris per sesi)">${esc(S.jadwal.map((j) => j.join(", ")).join("\n"))}</textarea><button class="btn" id="jsv">Simpan jadwal</button></div>`
      : "")
  );
}
function siswaTab() {
  return `<h1>Data siswa</h1><p class="mute">${SISWA.length} siswa terdaftar. Tempel daftar dari Excel: NISN, nama, kelas.</p><div class="card"><textarea id="it" placeholder="NISN, Nama, Kelas (satu siswa per baris)"></textarea><button class="btn" id="imp">Impor siswa</button></div><div class="card">${SISWA.map((s) => `<div class="row" style="padding:5px 0"><span>${s[1]}</span><span class="mute">${s[0]} · ${s[2]}</span></div>`).join("")}</div>`;
}
function nilai() {
  const n = NILAI[me()[0]] || [];
  return `<h1>Nilai ${me()[1].split(" ")[0]}</h1><p class="mute">Semester ini</p><div class="card">${n.map((x) => `<div style="padding:8px 0"><div class="row"><span>${x[0]}</span><b>${x[1]}</b></div><div class="meter" style="margin-top:6px"><i style="width:${x[1]}%"></i></div></div>`).join("")}</div>`;
}
function lokasi() {
  return `<h1>Titik absen</h1><p class="mute">Jarak maksimal absen sah adalah ${MAX_R} m dari titik ini.</p>
 <div class="card"><div class="tag">Koordinat sekolah</div><div style="font-weight:600;margin:4px 0 12px">${S.school.lat ? S.school.lat.toFixed(6) + ", " + S.school.lng.toFixed(6) : "Belum diatur"}</div>
 <button class="btn" id="setp">Pakai lokasi saya sekarang</button></div>
 <div class="card"><label class="tag">Radius (1–${MAX_R} m)</label><input id="rad" type="number" min="1" max="${MAX_R}" value="${S.school.r}"><button class="btn ghost" id="rsv">Simpan radius</button></div>`;
}
function sp() {
  return (
    `<h1>Peringatan BK</h1><p class="mute">Siswa yang pernah menerima surat peringatan.</p>` +
    Object.keys(S.sp)
      .map((n) => {
        const s = SISWA.find((x) => x[0] === n) || [n, n, ""];
        return `<div class="card"><b>${s[1]}</b> <span class="mute">${s[2]}</span>${S.sp[n].map((x) => `<div style="margin-top:8px"><span class="chip bad">${esc(x.t)}</span> ${esc(x.d)}<div class="mute">${esc(x.n)}</div></div>`).join("")}</div>`;
      })
      .join("")
  );
}
function kartu() {
  const s = me();
  return `<h1>Kartu siswa</h1><p class="mute">Ketuk kartu untuk membalik.</p><div class="scene"><div class="flip" id="fl"><div class="face front"><div class="row" style="align-items:flex-start"><b>SMKN 1 Ciruas</b><span style="opacity:.8;font-size:12px">Kartu Pelajar</span></div><div style="display:flex;gap:14px;align-items:flex-end"><div class="ph">${s[1][0]}</div><div><div style="font-size:19px;font-weight:700">${s[1]}</div><div style="opacity:.85">NISN ${s[0]}</div><div style="opacity:.85">${s[2]}</div></div></div></div>
 <div class="face back"><div id="qr"></div><div style="font-size:12px;color:#333">Pindai untuk melihat data siswa</div></div></div></div>`;
}
function render() {
  const kp = window._keep;
  window._keep = 0;
  const vals = kp
    ? [...document.querySelectorAll("#app input[id],#app textarea[id],#app select[id]")].map((e) => [
        e.id,
        e.value,
        e === document.activeElement,
      ])
    : [];
  stop();
  syncSiswa();
  if (S.user && S.user.role !== APP) S.user = null;
  if (!S.user) return login();
  const r = S.user.role,
    t = S.tab;
  let h =
    t === "home"
      ? home()
      : t === "absen" && r === "siswa"
        ? absen()
        : t === "jadwal"
          ? jadwalTab()
          : t === "kartu"
            ? kartu()
            : t === "validasi"
              ? validasi()
              : t === "nilai"
                ? nilai()
                : t === "lokasi"
                  ? lokasi()
                  : t === "sp"
                    ? sp()
                    : t === "cs"
                      ? cs()
                      : t === "izin"
                        ? izin()
                        : t === "siswa" && r === "admin"
                          ? siswaTab()
                          : home();
  $("#app").innerHTML =
    topbar() +
    h +
    (t === "home" ? (r === "guru" || r === "admin" ? attn() : "") + annBox() : "") +
    `<div style="margin-top:20px"><button class="btn ghost" id="out">Keluar (${r})</button></div>`;
  $("#nav").innerHTML =
    "<nav><div>" +
    TABS[r]
      .map(
        (x) =>
          `<button class="${x[0] === t ? "on" : ""}" data-t="${x[0]}"><svg viewBox="0 0 24 24">${ic[x[2]]}</svg>${x[1]}</button>`,
      )
      .join("") +
    "</div></nav>";
  document.querySelectorAll("nav button").forEach(
    (b) =>
      (b.onclick = () => {
        S.tab = b.dataset.t;
        save();
        render();
      }),
  );
  $("#out").onclick = () => {
    window.FB ? FB.signOut() : ((S.user = null), save(), render());
  };
  if (t === "absen") initAbsen();
  if ($("#ap"))
    $("#ap").onclick = () => {
      const v = $("#at").value.trim();
      if (!v) return toast("Tulis pengumuman dulu");
      S.ann.push({
        t: v,
        d: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + " " + hm(),
      });
      save();
      toast("Pengumuman terkirim");
      render();
    };
  if (t === "siswa" && r === "admin") {
    $("#imp").onclick = () => {
      let add = 0,
        skip = 0;
      $("#it")
        .value.split("\n")
        .filter((l) => l.trim())
        .forEach((l) => {
          const p = l.split(/[,;\t]/).map((x) => x.trim());
          if (p.length < 3 || !/^\d{4,}$/.test(p[0]) || SISWA.find((s) => s[0] === p[0])) return skip++;
          S.extra.push([p[0], p[1], p[2]]);
          SISWA.push([p[0], p[1], p[2]]);
          add++;
        });
      save();
      toast(add + " siswa ditambahkan, " + skip + " dilewati");
      render();
    };
  }
  if (t === "jadwal" && r === "admin")
    $("#jsv").onclick = () => {
      const out = [];
      let bad = 0;
      $("#jt")
        .value.split("\n")
        .filter((l) => l.trim())
        .slice(0, 40)
        .forEach((l) => {
          const p = l.split(",").map((x) => x.trim()),
            m = /^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/.exec(p[0] || "");
          if (!m || !p[1] || +m[1] > 23 || +m[3] > 23 || +m[2] > 59 || +m[4] > 59) return bad++;
          out.push([pad(+m[1]) + ":" + m[2] + "–" + pad(+m[3]) + ":" + m[4], p[1], p[2] || "", p[3] || ""]);
        });
      S.jadwal = out;
      save();
      toast(out.length + " sesi disimpan" + (bad ? ", " + bad + " baris dilewati" : ""));
      render();
    };
  if (t === "cs") {
    const go = (q) => {
      q = (q || "").trim();
      if (!q) return;
      chat.push(["u", esc(q)], ["b", ans(q)]);
      render();
      window.scrollTo(0, document.body.scrollHeight);
    };
    $("#bs").onclick = () => go($("#bq").value);
    $("#bq").onkeydown = (e) => e.key === "Enter" && go($("#bq").value);
    document.querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => go(b.dataset.q)));
  }
  if (t === "izin") {
    $("#zs").onclick = () => {
      const k = $("#zk").value.trim();
      if (!k) return toast("Isi keterangan dulu");
      S.izin.push({ n: me()[0], j: $("#zj").value, k, d: dk(), st: "menunggu" });
      save();
      toast("Pengajuan terkirim");
      render();
    };
  }
  document.querySelectorAll("[data-z]").forEach(
    (b) =>
      (b.onclick = () => {
        S.izin[+b.dataset.z].st = "disetujui";
        save();
        render();
      }),
  );
  document.querySelectorAll("[data-zx]").forEach(
    (b) =>
      (b.onclick = () => {
        S.izin[+b.dataset.zx].st = "ditolak";
        save();
        render();
      }),
  );
  document.querySelectorAll("[data-t2]").forEach(
    (b) =>
      (b.onclick = () => {
        S.tab = b.dataset.t2;
        save();
        render();
      }),
  );
  if ($("#spb"))
    $("#spb").onclick = () => {
      const n = $("#spn").value,
        k = $("#spt").value.trim();
      if (!k) return toast("Isi alasan SP");
      S.sp[n] = S.sp[n] || [];
      const d = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
      S.sp[n].push({ t: "SP " + (S.sp[n].length + 1), d, n: k });
      S.log.push({ n, t: "SP " + S.sp[n].length + " dikirim ke orang tua " + nm(n)[1] });
      save();
      toast("SP terkirim");
      render();
    };
  if (t === "kartu") {
    $("#fl").onclick = (e) => e.currentTarget.classList.toggle("f");
    try {
      new QRCode($("#qr"), {
        text: JSON.stringify({ nisn: me()[0], nama: me()[1], kelas: me()[2] }),
        width: 130,
        height: 130,
      });
    } catch (e) {}
  }
  document.querySelectorAll("[data-v]").forEach(
    (b) =>
      (b.onclick = () => {
        S.att[K(b.dataset.n)].valid = b.dataset.v === "1";
        save();
        render();
      }),
  );
  if (t === "lokasi") {
    $("#setp").onclick = () =>
      navigator.geolocation.getCurrentPosition(
        (p) => {
          S.school.lat = p.coords.latitude;
          S.school.lng = p.coords.longitude;
          save();
          toast("Titik absen disimpan");
          render();
        },
        () => toast("Lokasi tidak bisa dibaca. Izinkan akses lokasi."),
        { enableHighAccuracy: true },
      );
    $("#rsv").onclick = () => {
      S.school.r = Math.min(MAX_R, Math.max(1, +$("#rad").value || MAX_R));
      save();
      toast("Radius disimpan: " + S.school.r + " m");
    };
  }
  vals.forEach(([id, v, fc]) => {
    const e = document.getElementById(id);
    if (e && e.type !== "checkbox") {
      e.value = v;
      fc && e.focus();
    }
  });
}
if (bc)
  bc.onmessage = () => {
    reload();
    if (!["absen", "lokasi", "cs", "izin"].includes(S.tab)) render();
  };

const AN = { siswa: "Siswa", ortu: "Orang Tua", guru: "Guru", admin: "Admin" },
  ACC = {
    siswa: ["#1c6b4f", "#5fc79a"],
    ortu: ["#a24a28", "#f0a27e"],
    guru: ["#2c5a8a", "#8fb8e8"],
    admin: ["#3b4046", "#b8c0c8"],
  };
(() => {
  const dk = matchMedia("(prefers-color-scheme:dark)").matches,
    c = ACC[APP][dk ? 1 : 0],
    st = document.documentElement.style;
  st.setProperty("--acc", c);
  st.setProperty("--accs", "color-mix(in srgb," + c + " 16%,var(--card))");
  st.setProperty("--onacc", dk ? "#0f1f18" : "#fff");
  document.title = "Ayo Absen · " + AN[APP];
  document.body.classList.add(APP);
})();
setInterval(() => {
  const e = $("#clk");
  if (e) e.textContent = hm();
}, 15000);
try {
  navigator.serviceWorker && navigator.serviceWorker.register("sw.js").catch(() => {});
} catch (e) {}
render();
