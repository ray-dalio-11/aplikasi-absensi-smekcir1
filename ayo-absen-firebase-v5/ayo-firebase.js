// Ayo Absen — lapisan Firebase (Auth Google + Firestore realtime)
// Semua import memakai URL CDN (browser tidak mengerti "firebase/app" tanpa bundler)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  query,
  collection,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Config dari Firebase Console > Project settings > Your apps > Web app
// (apiKey web memang publik; keamanan data ada di firestore.rules)
const CFG = {
  apiKey: "AIzaSyAWHNbi9D0bBJqkBBBAtte0S2-s7zOKUnY",
  authDomain: "absensi-smkn-1-ciruas.firebaseapp.com",
  projectId: "absensi-smkn-1-ciruas",
  storageBucket: "absensi-smkn-1-ciruas.firebasestorage.app",
  messagingSenderId: "430723744896",
  appId: "1:430723744896:web:3bf63dc4bc0eec197d9265",
  measurementId: "G-73CR4M5N7J",
};

const ready = !CFG.apiKey.startsWith("ISI");
// kolom ayo/meta yang boleh ditulis tiap peran (harus sama dengan firestore.rules)
const W = {
  siswa: ["izin", "log"],
  ortu: [],
  guru: ["izin", "log", "sp", "nilai"],
  admin: ["school", "sp", "log", "izin", "ann", "extra", "nilai", "jadwal"],
};
const LBL = { siswa: "NISN", ortu: "NISN anak", guru: "NIP" };
let app,
  auth,
  db,
  prof = null,
  cu = null,
  T,
  subs = [],
  last = {};

const sel = (o, ks) => Object.fromEntries(ks.map((k) => [k, o[k]]).filter((x) => x[1] !== undefined));
const enc = (e) => (e || []).map((x) => ({ n: x[0], nm: x[1], k: x[2] }));
const uni = (a = [], b = [], f) => [...new Map([...a, ...b].map((x) => [f(x), x])).values()];
// gabung data lokal dengan data server agar edit dua peran tidak saling menimpa
function mix(R, L) {
  const o = {};
  if (L.school) o.school = L.school.lat ? L.school : R.school || L.school;
  if (L.sp) {
    o.sp = { ...R.sp };
    for (const n in L.sp) if (!o.sp[n] || L.sp[n].length >= o.sp[n].length) o.sp[n] = L.sp[n];
  }
  if (L.log) o.log = uni(R.log, L.log, (x) => x.t).slice(-30);
  if (L.izin) o.izin = uni(R.izin, L.izin, (x) => x.n + x.j + x.k + x.d);
  if (L.ann) o.ann = uni(R.ann, L.ann, (x) => x.t + x.d);
  if (L.extra) o.extra = uni(R.extra, L.extra, (x) => x.n);
  if (L.jadwal) o.jadwal = L.jadwal;
  if (L.nilai) {
    o.nilai = { ...R.nilai };
    for (const n in L.nilai) o.nilai[n] = { ...(R.nilai || {})[n], ...L.nilai[n] };
  }
  return o;
}

const cache = () => {
  try {
    const { school, att, sp, log, izin, ann, extra, jadwal } = S;
    localStorage.setItem(
      "ayo",
      JSON.stringify({ school, att: strip(att), sp, log, izin, ann, extra, jadwal }),
    );
  } catch (e) {}
};
const redraw = () => {
  syncSiswa();
  if (S.user && !["absen", "lokasi", "cs", "izin"].includes(S.tab)) {
    window._keep = 1;
    render();
  }
};
// gabung dokumen absen dari server; jangan timpa perubahan lokal yang belum terkirim
const merge = (qs) =>
  qs.forEach((d) => {
    const k = d.id,
      loc = S.att[k];
    if (loc && last[k] !== undefined && JSON.stringify(loc) !== last[k]) return;
    S.att[k] = normAtt(d.data());
    last[k] = JSON.stringify(S.att[k]);
  });
const stopAll = () => {
  subs.forEach((u) => u());
  subs = [];
};
const esc = (x) => String(x || "").replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
const shell = (h) => {
  $("#nav").innerHTML = "";
  $("#app").innerHTML =
    `<div style="padding-top:8vh"><div class="logo" style="font-size:26px"><i style="width:40px;height:40px;font-size:20px;border-radius:13px">A</i>Ayo Absen</div></div><div class="card" style="margin-top:20px">${h}<button class="btn ghost" id="so" style="margin-top:10px">Ganti akun Google</button></div>`;
  $("#so").onclick = () => signOut(auth);
};
const err = (e) => toast("Sinkron gagal: " + (e.code || e.message));
const view = () => ({
  ...S,
  nilai: Object.fromEntries(Object.entries(NILAI).map(([n, a]) => [n, Object.fromEntries(a)])),
});
let PEND = [];
window.pendHTML = () =>
  PEND.length
    ? "<h2>Akun menunggu persetujuan</h2>" +
      PEND.map(
        (p) =>
          `<div class="card"><b>${esc(p.name || p.email)}</b> <span class="chip warn">${esc(p.role)}</span><div class="mute">${esc(p.email)} · ${esc(LBL[p.role])} ${esc(p.nisn)}${p.role !== "guru" && !SISWA.find((x) => x[0] === p.nisn) ? " · <b>tidak ada di data siswa</b>" : ""}</div><div class="row" style="margin-top:10px"><button class="btn" data-ok="${esc(p.id)}">Setujui</button><button class="btn ghost" data-no="${esc(p.id)}">Tolak</button></div></div>`,
      ).join("")
    : "";

document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-ok],[data-no],[data-nl],[data-rk],[data-csv]");
  if (!b || !db) return;
  const d = b.dataset,
    has = (k) => d[k] !== undefined; // atribut kosong (data-csv) tetap terdeteksi
  try {
    if (has("rk")) {
      const d0 = new Date();
      d0.setDate(d0.getDate() - 31);
      const qs = await getDocs(query(collection(db, "absen"), where("d", ">=", ymd(d0))));
      merge(qs);
      cache();
      toast(qs.size + " catatan dimuat");
      redraw();
    } else if (has("csv")) {
      const rows = [["NISN", "Nama", "Kelas", "Hadir", "Izin", "Sakit", "Alpa", "Persen"]].concat(
        SISWA.map((x) => {
          const h = hist(x[0], 1);
          return [x[0], x[1], x[2], h.H, h.I, h.Sk, h.A, pct(h)];
        }),
      );
      const url = URL.createObjectURL(
        new Blob(
          [
            "\ufeff" +
              rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n"),
          ],
          { type: "text/csv" },
        ),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "rekap-" + dk() + ".csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (has("ok")) await setDoc(doc(db, "users", d.ok), { ok: true }, { merge: true });
    else if (has("no")) await deleteDoc(doc(db, "users", d.no));
    else if (has("nl")) {
      const n = $("#nln").value,
        m = $("#nlm").value.trim(),
        v = +$("#nlv").value;
      if (!m || $("#nlv").value === "" || isNaN(v) || v < 0 || v > 100)
        return toast("Isi mapel dan nilai 0–100");
      const a = (NILAI[n] = NILAI[n] || []),
        x = a.find((y) => y[0] === m);
      x ? (x[1] = v) : a.push([m, v]);
      save();
      toast("Nilai disimpan");
      redraw();
      const z = $("#nlv");
      if (z) z.value = "";
    }
  } catch (er) {
    err(er);
  }
});

function linkUI(msg) {
  stopAll();
  shell(
    `<h2 style="margin-top:0">Hubungkan akun</h2><p class="mute">${esc(cu.email)}</p>${msg ? `<p style="color:var(--bad);margin:8px 0">${esc(msg)}</p>` : ""}<label class="tag">${LBL[APP]}</label><input id="ni" inputmode="numeric"><button class="btn" id="lk">Simpan</button>`,
  );
  $("#lk").onclick = async () => {
    const v = $("#ni").value.trim();
    if (!/^\d{4,}$/.test(v)) return toast("Isi " + LBL[APP] + " dengan angka");
    const p = { role: APP, nisn: v, email: cu.email, name: cu.displayName || "", ok: false };
    try {
      await setDoc(doc(db, "users", cu.uid), p, { merge: true });
      wait();
    } catch (e) {
      err(e);
    }
  };
}
function wait() {
  shell(
    `<h2 style="margin-top:0">Menunggu persetujuan</h2><p class="mute">Admin kurikulum perlu menyetujui akun ${esc(cu.email)}. Halaman ini lanjut otomatis setelah disetujui.</p>`,
  );
  subs.push(
    onSnapshot(
      doc(db, "users", cu.uid),
      (s) => {
        const p = s.data();
        if (!p) return linkUI("Pengajuan ditolak admin. Periksa data lalu ajukan ulang.");
        if (p.ok === true) {
          prof = p;
          start();
        }
      },
      err,
    ),
  );
}

function start() {
  const r = prof.role,
    st = r === "siswa" || r === "ortu",
    p0 = prof;
  let first = true;
  stopAll();
  const enter = () => {
    if (!first || prof !== p0) return;
    first = false;
    if (st && !SISWA.find((x) => x[0] === prof.nisn)) {
      stopAll();
      S.user = null;
      return shell(
        '<h2 style="margin-top:0">NISN tidak terdaftar</h2><p class="mute">NISN pada akun ini tidak ada di data siswa. Hubungi admin kurikulum.</p>',
      );
    }
    S.user = { role: r, nisn: st ? prof.nisn : "", email: prof.email, name: prof.name || "" };
    if (!TABS[r].some((x) => x[0] === S.tab) && S.tab !== "izin") S.tab = "home";
    save();
    render();
  };
  setTimeout(enter, 6000); // tetap masuk walau server lambat/offline
  subs.push(
    onSnapshot(
      doc(db, "ayo", "meta"),
      (s) => {
        if (s.metadata.hasPendingWrites) return;
        const m = s.data() || {};
        ["school", "sp", "log", "izin", "ann"].forEach((k) => m[k] && (S[k] = m[k]));
        if (m.izin) S.izin = normIzin(m.izin);
        if (m.jadwal) S.jadwal = m.jadwal.map((x) => [x.t, x.m, x.g, x.r]);
        if (m.extra) S.extra = m.extra.map((x) => [x.n, x.nm, x.k]);
        if (m.nilai) for (const n in m.nilai) NILAI[n] = Object.entries(m.nilai[n]);
        syncSiswa();
        if (st && !SISWA.find((x) => x[0] === prof.nisn)) {
          stopAll();
          S.user = null;
          return shell(
            '<h2 style="margin-top:0">NISN tidak terdaftar</h2><p class="mute">NISN pada akun ini tidak ada di data siswa. Hubungi admin kurikulum.</p>',
          );
        }
        cache();
        last.sig = JSON.stringify(sel(view(), W[r]));
        if (first) enter();
        else redraw();
      },
      (e) => {
        err(e);
        enter();
      },
    ),
  );
  if (r === "admin")
    subs.push(
      onSnapshot(
        query(collection(db, "users"), where("ok", "==", false)),
        (qs) => {
          PEND = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
          redraw();
        },
        err,
      ),
    );
  subs.push(
    st
      ? onSnapshot(
          query(collection(db, "absen"), where("n", "==", prof.nisn)),
          (qs) => {
            if (qs.metadata.hasPendingWrites) return;
            merge(qs);
            cache();
            redraw();
          },
          err,
        )
      : onSnapshot(
          query(collection(db, "absen"), where("d", "==", dk())),
          (qs) => {
            if (qs.metadata.hasPendingWrites) return;
            merge(qs);
            cache();
            redraw();
          },
          err,
        ),
  );
}

window.FB = {
  async signIn() {
    if (!ready) return toast("Isi CFG di ayo-firebase.js dulu");
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, p);
    } catch (e) {
      // redirect hanya bila popup diblokir/tidak didukung; menutup popup sendiri bukan error
      if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e.code))
        signInWithRedirect(auth, p);
      else if (!["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(e.code))
        toast("Login gagal: " + e.code);
    }
  },
  signOut: () => auth && signOut(auth),
  push() {
    clearTimeout(T);
    T = setTimeout(async () => {
      if (!prof) return;
      const r = prof.role;
      try {
        for (const k in S.att)
          if (k.startsWith(dk()) && (r === "guru" || (r === "siswa" && k.endsWith("_" + prof.nisn)))) {
            const j = JSON.stringify(S.att[k]);
            if (last[k] === j) continue;
            const pl = JSON.parse(j);
            pl.d = dk();
            pl.n = k.split("_")[1];
            if (r === "siswa") delete pl.valid; // siswa tidak boleh menyentuh validasi
            await setDoc(doc(db, "absen", k), pl, { merge: true });
            last[k] = j;
          }
        const w = W[r],
          sig = JSON.stringify(sel(view(), w));
        if (w.length && sig !== last.sig) {
          const L = sel(view(), w);
          if (L.extra) L.extra = enc(L.extra);
          if (L.jadwal) L.jadwal = L.jadwal.map((j) => ({ t: j[0], m: j[1], g: j[2], r: j[3] }));
          await runTransaction(db, async (tx) => {
            const ref = doc(db, "ayo", "meta"),
              R = (await tx.get(ref)).data() || {};
            if (!Object.keys(R).length && r !== "admin") return;
            tx.set(ref, sel(mix(R, L), w), { merge: true });
          });
          last.sig = sig;
        }
      } catch (e) {
        err(e);
      }
    }, 400);
  },
};

const D0 = dk();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && dk() !== D0) location.reload();
});

if (ready) {
  app = initializeApp(CFG); // cukup SATU kali (sebelumnya dua kali -> error duplicate-app)
  auth = getAuth(app);
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (e) {
    db = getFirestore(app);
  } // antrean tulis offline
  // Analytics opsional: dimuat terpisah agar kegagalannya (mis. diblokir/HTTP) tidak merusak aplikasi
  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js")
    .then(async (m) => {
      if (await m.isSupported()) m.getAnalytics(app);
    })
    .catch(() => {});
  getRedirectResult(auth).catch((e) => toast("Login gagal: " + e.code));
  onAuthStateChanged(auth, async (u) => {
    stopAll();
    prof = null;
    cu = u;
    last = {}; // reset sinkronisasi saat ganti akun
    if (u) endBoot(false);
    if (!u) {
      endBoot(false);
      S.user = null;
      S.att = {};
      try {
        localStorage.removeItem("ayo");
        sessionStorage.removeItem("ayoS");
      } catch (e) {}
      return render();
    }
    try {
      const s = await getDoc(doc(db, "users", u.uid));
      if (s.exists()) {
        const p = s.data();
        if (p.role !== APP)
          return shell(
            `<h2 style="margin-top:0">Salah aplikasi</h2><p class="mute">Akun ${esc(u.email)} terdaftar sebagai <b>${esc(p.role)}</b>. Buka aplikasi ${esc(p.role)}.</p>`,
          );
        if (p.role !== "admin" && p.ok !== true) return wait();
        prof = p;
        return start();
      }
      if (APP === "admin")
        return shell(
          `<h2 style="margin-top:0">Akun belum jadi admin</h2><p class="mute">Minta pengelola membuat dokumen <b>users/${esc(u.uid)}</b> di Firestore dengan role "admin".</p>`,
        );
      linkUI();
    } catch (e) {
      err(e);
    }
  });
} else endBoot();
