/**
 * GRANT RADAR — Uygulama Mantığı
 * -------------------------------
 * Bağımlılık yok, build adımı yok. data.js'ten sonra yüklenir.
 *
 * Mimari:
 *   STATE.profiles[]   → çok projeli yapı
 *   STATE.activeId     → o an seçili profil
 *   engine.evaluate()  → bir programı profile karşı değerlendirir (saf fonksiyon)
 *   render*()          → ekranı çizer
 *
 * Depolama: localStorage anahtarı "grantradar.v2"
 * (v1 verisi varsa otomatik taşınır)
 */

const STORE_KEY = "grantradar.v2";
const STORE_KEY_V1 = "grantradar.v1";

/* ============================================================
   DURUM
   ============================================================ */

const STATE = { activeId: null, profiles: [] };

function blankProfile(name) {
  return {
    id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name || "Yeni Proje",
    companyType: "",
    country: "tr",
    companyAge: 0,
    employees: 1,
    revenue: 0,
    founderAge: null,
    stage: "",
    funding: "bootstrap",
    sectors: [],
    quals: [],
    tracked: {},
  };
}

/** v1 profilini v2 şemasına taşır */
function migrateV1Profile(old) {
  const p = blankProfile(old.name);
  p.id = old.id || p.id;
  p.companyType = old.companyType || "";
  p.companyAge = old.companyAge || 0;
  p.employees = old.employees ?? 1;
  p.revenue = old.revenue || 0;
  p.founderAge = old.founderAge ?? null;
  p.sectors = old.sector ? [old.sector] : [];
  p.quals = old.quals || [];
  p.tracked = old.tracked || {};
  p.country = "tr";
  p.stage = "";
  p.funding = "bootstrap";
  return p;
}

function load() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
  } catch (e) {
    console.warn("v2 verisi okunamadı.", e);
  }

  if (raw && Array.isArray(raw.profiles) && raw.profiles.length) {
    STATE.profiles = raw.profiles;
    STATE.activeId =
      raw.activeId && raw.profiles.some((p) => p.id === raw.activeId) ? raw.activeId : raw.profiles[0].id;
    return;
  }

  // v1'den taşıma
  try {
    const old = JSON.parse(localStorage.getItem(STORE_KEY_V1) || "null");
    if (old && Array.isArray(old.profiles) && old.profiles.length) {
      STATE.profiles = old.profiles.map(migrateV1Profile);
      STATE.activeId = STATE.profiles[0].id;
      save();
      console.info("v1 verileri v2 şemasına taşındı.");
      return;
    }
  } catch (e) {
    console.warn("v1 taşıması yapılamadı.", e);
  }

  // İlk açılış
  const a = blankProfile("Dormanreview — Danışmanlık");
  a.companyType = "yok";
  a.country = "tr";
  a.founderAge = 30;
  a.stage = "mvp";
  a.sectors = ["danismanlik", "yapayzeka", "enerji"];
  a.quals = ["ihracat"];

  const b = blankProfile("İkinci Proje");
  b.companyType = "yok";
  b.country = "tr";

  STATE.profiles = [a, b];
  STATE.activeId = a.id;
  save();
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(STATE));
  } catch (e) {
    console.warn("Kaydedilemedi (depolama dolu olabilir).", e);
  }
}

function active() {
  return STATE.profiles.find((p) => p.id === STATE.activeId) || STATE.profiles[0];
}

/* ============================================================
   EŞLEŞTİRME MOTORU
   ============================================================
   status : "eligible" | "partial" | "ineligible"
   - partial      → yalnızca NİTELİK eksiği (kullanıcı kapatabilir)
   - ineligible   → yapısal engel (şirket türü, ülke, yaş, sektör, aşama)
   ============================================================ */

const FUNDING_ORDER = ["bootstrap", "melek", "tohum", "seriesa"];

const engine = {
  labelOf(list, id) {
    const hit = list.find((x) => x.id === id);
    return hit ? hit.label : id;
  },

  evaluate(grant, p) {
    const r = grant.rules || {};
    const checks = [];
    let hardFail = false;
    let softFail = false;

    const fail = (text) => {
      hardFail = true;
      checks.push({ ok: false, soft: false, text });
    };
    const pass = (text) => checks.push({ ok: true, soft: false, text });

    /* --- Ülke / kayıt yeri --- */
    if (r.countries && r.countries.length) {
      const ok = !p.country || r.countries.includes(p.country);
      ok
        ? pass("Ülke kapsamda")
        : fail("Uygun ülkeler: " + r.countries.map((c) => this.labelOf(COUNTRIES, c)).join(", "));
    }

    /* --- Şirket türü --- */
    if (r.companyTypes && r.companyTypes.length) {
      const ok = r.companyTypes.includes(p.companyType);
      ok
        ? pass("Şirket türü uygun")
        : fail("Gereken tür: " + r.companyTypes.map((t) => this.labelOf(COMPANY_TYPES, t)).join(" / "));
    }

    /* --- Olgunluk aşaması --- */
    if (r.stages && r.stages.length) {
      const ok = !p.stage || r.stages.includes(p.stage);
      ok
        ? pass("Aşama uygun")
        : fail("Uygun aşamalar: " + r.stages.map((s) => this.labelOf(STAGES, s)).join(", "));
    }

    /* --- Sektör (kesişim yeterli) --- */
    if (r.sectors && r.sectors.length) {
      const mine = p.sectors || [];
      const ok = mine.length === 0 || mine.some((s) => r.sectors.includes(s));
      ok
        ? pass("Sektör kapsamda")
        : fail("Kapsamdaki sektörler: " + r.sectors.map((s) => this.labelOf(SECTORS, s)).join(", "));
    }

    /* --- Şirket yaşı --- */
    if (r.maxCompanyAgeYears !== undefined) {
      const ok = Number(p.companyAge || 0) <= r.maxCompanyAgeYears;
      ok
        ? pass(`Şirket yaşı uygun (≤ ${r.maxCompanyAgeYears} yıl)`)
        : fail(`Şirket ${r.maxCompanyAgeYears} yıldan yeni olmalı — sizinki ${p.companyAge} yıl`);
    }
    if (r.minCompanyAgeYears !== undefined) {
      const ok = Number(p.companyAge || 0) >= r.minCompanyAgeYears;
      ok
        ? pass(`Şirket yaşı uygun (≥ ${r.minCompanyAgeYears} yıl)`)
        : fail(`En az ${r.minCompanyAgeYears} yıllık şirket gerekiyor — sizinki ${p.companyAge} yıl`);
    }

    /* --- Kurucu yaşı --- */
    if (r.maxFounderAge !== undefined) {
      const age = Number(p.founderAge || 0);
      const ok = age > 0 && age <= r.maxFounderAge;
      ok
        ? pass(`Kurucu yaşı uygun (≤ ${r.maxFounderAge})`)
        : fail(`Kurucu ${r.maxFounderAge} yaşını doldurmamış olmalı`);
    }

    /* --- Çalışan / ciro --- */
    if (r.maxEmployees !== undefined) {
      const ok = Number(p.employees || 0) <= r.maxEmployees;
      ok ? pass("Çalışan sayısı uygun") : fail(`En fazla ${r.maxEmployees} çalışan`);
    }
    if (r.maxRevenue !== undefined) {
      const ok = Number(p.revenue || 0) <= r.maxRevenue;
      ok ? pass("Ciro uygun") : fail("Ciro üst sınırı aşılıyor");
    }

    /* --- Fon aşaması tavanı --- */
    if (r.maxFunding) {
      const mine = FUNDING_ORDER.indexOf(p.funding || "bootstrap");
      const cap = FUNDING_ORDER.indexOf(r.maxFunding);
      const ok = mine <= cap;
      ok
        ? pass("Yatırım aşaması uygun")
        : fail("Bu program " + this.labelOf(FUNDING_STAGES, r.maxFunding) + " ve öncesi içindir");
    }

    /* --- Nitelikler (yumuşak) --- */
    if (r.requiredQuals && r.requiredQuals.length) {
      const missing = r.requiredQuals.filter((q) => !(p.quals || []).includes(q));
      if (missing.length) softFail = true;
      checks.push({
        ok: missing.length === 0,
        soft: true,
        text:
          missing.length === 0
            ? "Gerekli nitelikler tamam"
            : "Eksik: " + missing.map((q) => this.labelOf(QUALIFICATIONS, q)).join(" · "),
      });
    }
    if (r.anyQuals && r.anyQuals.length) {
      const has = r.anyQuals.some((q) => (p.quals || []).includes(q));
      if (!has) softFail = true;
      checks.push({
        ok: has,
        soft: true,
        text: has
          ? "Nitelik şartı sağlanıyor"
          : "Şunlardan biri gerekli: " + r.anyQuals.map((q) => this.labelOf(QUALIFICATIONS, q)).join(" · "),
      });
    }

    const status = hardFail ? "ineligible" : softFail ? "partial" : "eligible";

    /* Puanlama: uygun 60 / yakın 30 taban + tutar (maks 25) + kolaylık (maks 15) */
    let score = status === "eligible" ? 60 : status === "partial" ? 30 : 0;
    if (status !== "ineligible") {
      score += grant.amountMax ? Math.min(25, Math.round((grant.amountMax / 1500000) * 25)) : 12;
      const effortPts = { "Çok düşük": 15, Düşük: 12, Orta: 7, Yüksek: 3, "Çok yüksek": 1 };
      score += effortPts[grant.effort] ?? 5;
    }

    return { status, score: Math.min(100, score), checks };
  },

  scanAll(p) {
    return GRANTS.map((g) => ({ grant: g, result: this.evaluate(g, p) })).sort(
      (a, b) => b.result.score - a.result.score
    );
  },

  /** "Şu niteliği kazanırsan kaç program açılır" — sadece yumuşak eksikler */
  unlockAnalysis(p) {
    const counts = {};
    GRANTS.forEach((g) => {
      if (this.evaluate(g, p).status !== "partial") return;
      const req = [...(g.rules.requiredQuals || []), ...(g.rules.anyQuals || [])];
      req.forEach((q) => {
        if ((p.quals || []).includes(q)) return;
        counts[q] = counts[q] || { qual: q, grants: [] };
        counts[q].grants.push(g.name);
      });
    });
    return Object.values(counts).sort((a, b) => b.grants.length - a.grants.length);
  },
};

/* ============================================================
   YARDIMCILAR
   ============================================================ */

const fmtTL = (n) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

const STATUS_LABEL = { eligible: "UYGUN", partial: "YAKIN", ineligible: "UYGUN DEĞİL" };

function fillSelect(el, items, placeholder) {
  el.innerHTML =
    (placeholder ? `<option value="">${placeholder}</option>` : "") +
    items.map((i) => `<option value="${i.id}">${esc(i.label)}</option>`).join("");
}

/** Checkbox ızgarası çizer */
function renderCheckGrid(container, items, selected, grouped) {
  const sel = selected || [];
  if (!grouped) {
    container.innerHTML = items
      .map(
        (i) => `<label class="check ${sel.includes(i.id) ? "on" : ""}">
          <input type="checkbox" value="${i.id}" ${sel.includes(i.id) ? "checked" : ""} />
          <span>${esc(i.label)}</span></label>`
      )
      .join("");
  } else {
    const groups = {};
    items.forEach((i) => {
      const g = i.group || "Diğer";
      (groups[g] = groups[g] || []).push(i);
    });
    container.innerHTML = Object.entries(groups)
      .map(
        ([g, list]) => `
        <div class="check-group">
          <div class="section-label">${esc(g)}</div>
          <div class="checks">
            ${list
              .map(
                (i) => `<label class="check ${sel.includes(i.id) ? "on" : ""}">
                  <input type="checkbox" value="${i.id}" ${sel.includes(i.id) ? "checked" : ""} />
                  <span>${esc(i.label)}</span></label>`
              )
              .join("")}
          </div>
        </div>`
      )
      .join("");
  }
  container.querySelectorAll("input").forEach((cb) =>
    cb.addEventListener("change", () => cb.closest(".check").classList.toggle("on", cb.checked))
  );
}

/* ============================================================
   PROFİL FORMU
   ============================================================ */

function renderProfileForm() {
  const p = active();
  document.getElementById("f-name").value = p.name || "";
  document.getElementById("f-companyType").value = p.companyType || "";
  document.getElementById("f-country").value = p.country || "tr";
  document.getElementById("f-companyAge").value = p.companyAge ?? 0;
  document.getElementById("f-employees").value = p.employees ?? 1;
  document.getElementById("f-revenue").value = p.revenue ?? 0;
  document.getElementById("f-founderAge").value = p.founderAge ?? "";
  document.getElementById("f-stage").value = p.stage || "";
  document.getElementById("f-funding").value = p.funding || "bootstrap";

  renderCheckGrid(document.getElementById("f-sectors"), SECTORS, p.sectors, false);
  renderCheckGrid(document.getElementById("f-quals"), QUALIFICATIONS, p.quals, true);
}

function readProfileForm() {
  const p = active();
  p.name = document.getElementById("f-name").value.trim() || "Adsız Proje";
  p.companyType = document.getElementById("f-companyType").value;
  p.country = document.getElementById("f-country").value;
  p.companyAge = Number(document.getElementById("f-companyAge").value) || 0;
  p.employees = Number(document.getElementById("f-employees").value) || 0;
  p.revenue = Number(document.getElementById("f-revenue").value) || 0;
  const fa = document.getElementById("f-founderAge").value;
  p.founderAge = fa === "" ? null : Number(fa);
  p.stage = document.getElementById("f-stage").value;
  p.funding = document.getElementById("f-funding").value;
  p.sectors = Array.from(document.querySelectorAll("#f-sectors input:checked")).map((i) => i.value);
  p.quals = Array.from(document.querySelectorAll("#f-quals input:checked")).map((i) => i.value);
  save();
}

/* ============================================================
   KARTLAR VE LİSTELER
   ============================================================ */

function grantCard(grant, result, p) {
  const tracked = !!p.tracked[grant.id];
  const typeClass = /vergi|istisna|muafiyet/i.test(grant.type)
    ? "vergi"
    : /ödül|award/i.test(grant.category)
    ? "odul"
    : "hibe";

  const checksHtml = result.checks
    .map((c) => {
      const cls = c.ok ? "pass" : c.soft ? "soft" : "fail";
      const icon = c.ok ? "✓" : c.soft ? "!" : "✕";
      return `<div class="reason ${cls}"><span class="icon">${icon}</span><span>${esc(c.text)}</span></div>`;
    })
    .join("");

  const docsHtml = (grant.docs || []).length
    ? `<details class="docs"><summary>Gerekli belgeler (${grant.docs.length})</summary><ul>${grant.docs
        .map((d) => `<li>${esc(d)}</li>`)
        .join("")}</ul></details>`
    : "";

  return `
  <article class="grant ${result.status}">
    <div class="grant-top">
      <div style="min-width:0">
        <div class="grant-eyebrow">
          <span>${esc(grant.institution)}</span><span class="sep">·</span>
          <span class="tag ${typeClass}">${esc(grant.category)}</span>
        </div>
        <div class="grant-title">${esc(grant.name)}</div>
        <div class="grant-amount">${esc(grant.amountLabel)}</div>
        <div class="grant-summary">${esc(grant.summary)}</div>
      </div>
      <div class="verdict">
        <div class="v-state">${STATUS_LABEL[result.status]}</div>
        <div class="v-score">${result.score}</div>
      </div>
    </div>

    <div class="specs">
      <div class="spec"><div class="s-label">Tür</div><div class="s-val">${esc(grant.type)}</div></div>
      <div class="spec"><div class="s-label">Efor</div><div class="s-val">${esc(grant.effort)}</div></div>
      <div class="spec"><div class="s-label">Süre</div><div class="s-val">${esc(grant.timeline)}</div></div>
    </div>

    <div class="reasons">${checksHtml}</div>

    ${grant.notes ? `<div class="grant-note">${esc(grant.notes)}</div>` : ""}
    ${docsHtml}

    <div class="grant-actions">
      <a class="arrow" href="${esc(grant.source)}" target="_blank" rel="noopener">Resmi kaynak</a>
      <button type="button" class="btn ${tracked ? "danger" : "secondary"} sm plain" data-track="${grant.id}">
        ${tracked ? "Takipten çıkar" : "Takibe al"}
      </button>
    </div>
  </article>`;
}

function bindTrackButtons(root) {
  root.querySelectorAll("[data-track]").forEach((b) =>
    b.addEventListener("click", () => toggleTrack(b.dataset.track))
  );
}

function renderGrants() {
  const p = active();
  const q = document.getElementById("q-search").value.trim().toLowerCase();
  const cat = document.getElementById("q-category").value;
  const elig = document.getElementById("q-eligibility").value;

  let rows = engine.scanAll(p);

  if (q) {
    rows = rows.filter((r) =>
      (r.grant.name + " " + r.grant.summary + " " + r.grant.institution + " " + r.grant.category + " " + r.grant.type)
        .toLowerCase()
        .includes(q)
    );
  }
  if (cat) rows = rows.filter((r) => r.grant.category === cat);
  if (elig) rows = rows.filter((r) => r.result.status === elig);

  const el = document.getElementById("grants-list");
  document.getElementById("grants-count").textContent =
    `${rows.length} program gösteriliyor (toplam ${GRANTS.length})`;
  el.innerHTML = rows.length
    ? rows.map((r) => grantCard(r.grant, r.result, p)).join("")
    : `<div class="empty"><h3>Sonuç yok</h3><p>Filtreleri gevşetmeyi deneyin.</p></div>`;
  bindTrackButtons(el);
}

function renderPanel() {
  const p = active();
  const rows = engine.scanAll(p);
  const eligible = rows.filter((r) => r.result.status === "eligible");
  const partial = rows.filter((r) => r.result.status === "partial");
  const total = rows.length;
  const trackedCount = Object.keys(p.tracked).length;

  document.getElementById("panel-title").textContent = p.name + ".";

  /* --- Ölçüm şeridi: oranları toplam program sayısına göre --- */
  const pct = (n) => Math.round((n / total) * 100);
  const meters = [
    { cls: "ok", label: "Uygun", val: eligible.length, w: pct(eligible.length) },
    { cls: "warn", label: "Yakın", val: partial.length, w: pct(partial.length) },
    { cls: "info", label: "Takipte", val: trackedCount, w: pct(trackedCount) },
    { cls: "", label: "Uygun değil", val: total - eligible.length - partial.length, w: pct(total - eligible.length - partial.length) },
  ];
  document.getElementById("panel-meters").innerHTML = meters
    .map(
      (m) => `
    <div class="meter ${m.cls}">
      <div class="m-label">${m.label}</div>
      <div class="m-track"><div class="m-fill" style="width:${Math.max(m.w, 1)}%"></div></div>
      <div class="m-val">${m.val}</div>
    </div>`
    )
    .join("");

  /* --- Büyük istatistik --- */
  document.getElementById("panel-bigstat").innerHTML = `
    <div class="bigstat">
      <span class="n">${eligible.length}</span>
      <span class="of">/ ${total} program</span>
    </div>
    <p class="bigstat-note">
      ${total} programdan ${eligible.length} tanesine bugün başvurabilirsiniz.
      ${partial.length} tanesi için ise yalnızca kapatabileceğiniz bir eksik var.
    </p>`;

  document.getElementById("badge-eligible").textContent = eligible.length;
  document.getElementById("badge-tracked").textContent = trackedCount;

  /* --- En iyi 3 fırsat --- */
  const top = document.getElementById("panel-top");
  const best = rows.filter((r) => r.result.status !== "ineligible").slice(0, 3);
  top.innerHTML = best.length
    ? best.map((r) => grantCard(r.grant, r.result, p)).join("")
    : `<div class="empty"><h3>Henüz eşleşme yok</h3><p>Proje Profili sekmesinden bilgilerinizi doldurun.</p></div>`;
  bindTrackButtons(top);

  /* --- Bugün → Sonra dönüşüm tablosu --- */
  const unlocks = engine.unlockAnalysis(p);
  const el = document.getElementById("panel-unlocks");
  if (!unlocks.length) {
    el.innerHTML = `<p style="font-size:14px;color:var(--text-faint)">Kapatılabilir bir eksiğiniz görünmüyor.</p>`;
    return;
  }
  el.innerHTML =
    `<div class="transform-head"><div class="a">Bugün</div><div class="b">Sonra</div><div style="min-width:46px"></div></div>` +
    unlocks
      .slice(0, 8)
      .map(
        (u) => `
      <div class="transform">
        <div class="from">${esc(engine.labelOf(QUALIFICATIONS, u.qual))} yok</div>
        <div class="to">${esc(u.grants.length)} program açılır</div>
        <div class="gain">+${u.grants.length}</div>
      </div>`
      )
      .join("");
}

function renderTracker() {
  const p = active();
  const ids = Object.keys(p.tracked);
  const el = document.getElementById("tracker-list");

  if (!ids.length) {
    el.innerHTML = `<div class="empty"><h3>Takipte program yok</h3><p>Programlar sekmesinden "Takibe al" deyin.</p></div>`;
    return;
  }

  el.innerHTML = ids
    .map((id) => {
      const g = GRANTS.find((x) => x.id === id);
      if (!g) return "";
      const t = p.tracked[id];
      const st = APPLICATION_STATUSES.find((s) => s.id === t.status) || APPLICATION_STATUSES[0];
      return `
      <div class="track-row">
        <div class="name">${esc(g.name)}<small>${esc(g.institution)} · ${esc(g.amountLabel)}</small></div>
        <span class="status-pill" style="background:${st.color}22;color:${st.color}">${esc(st.label)}</span>
        <select data-status="${id}" aria-label="Durum">
          ${APPLICATION_STATUSES.map(
            (s) => `<option value="${s.id}" ${s.id === t.status ? "selected" : ""}>${esc(s.label)}</option>`
          ).join("")}
        </select>
        <input type="text" data-note="${id}" value="${esc(t.note || "")}" placeholder="Not…" aria-label="Not" />
        <button type="button" class="btn danger sm" data-untrack="${id}">Kaldır</button>
      </div>`;
    })
    .join("");

  el.querySelectorAll("[data-status]").forEach((s) =>
    s.addEventListener("change", () => {
      active().tracked[s.dataset.status].status = s.value;
      active().tracked[s.dataset.status].updatedAt = new Date().toISOString();
      save();
      renderTracker();
      renderPanel();
    })
  );
  el.querySelectorAll("[data-note]").forEach((i) =>
    i.addEventListener("change", () => {
      active().tracked[i.dataset.note].note = i.value;
      save();
    })
  );
  el.querySelectorAll("[data-untrack]").forEach((b) =>
    b.addEventListener("click", () => toggleTrack(b.dataset.untrack))
  );
}

const RESOURCES = [
  { n: "KOSGEB", u: "https://www.kosgeb.gov.tr", d: "Girişimcilik, İş Kurma, KOBİGEL, İşletme Geliştirme destekleri." },
  { n: "TÜBİTAK", u: "https://tubitak.gov.tr", d: "BiGG (1512), KOBİ Ar-Ge (1507), Sanayi Ar-Ge (1501)." },
  { n: "Ticaret Bakanlığı", u: "https://ticaret.gov.tr/destekler", d: "İhracat, HİSER, E-Turquality, TURQUALITY®." },
  { n: "Kolay Destek", u: "https://kolaydestek.gov.tr", d: "Devlet desteklerinin tek noktadan arama platformu." },
  { n: "Gelir İdaresi Başkanlığı", u: "https://www.gib.gov.tr", d: "Hizmet ihracatı ve KDV istisnaları, genç girişimci muafiyeti." },
  { n: "TÜRKPATENT", u: "https://www.turkpatent.gov.tr", d: "Marka tescili ve benzerlik araştırması." },
  { n: "Ufuk Avrupa (Horizon)", u: "https://ufuk.tubitak.gov.tr", d: "AB araştırma ve inovasyon fonları, ulusal koordinasyon." },
  { n: "EIC (Avrupa Inovasyon Konseyi)", u: "https://eic.ec.europa.eu", d: "EIC Accelerator hibe + yatırım programı." },
  { n: "Eureka / Eurostars", u: "https://www.eurekanetwork.org", d: "Uluslararası ortaklı KOBİ Ar-Ge fonu." },
  { n: "KVKK", u: "https://www.kvkk.gov.tr", d: "Aydınlatma yükümlülüğü, VERBİS ve veri güvenliği rehberleri." },
  { n: "GrantChain — Eşleştirme", u: "https://www.grantchain.eu/match", d: "5 soruyla Web3/AI/iklim hibelerine eşleştirme yapan ücretsiz dizin." },
  { n: "0xLabs — Grant Providers", u: "https://www.0xlabs.tech/grant-providers", d: "Blokzincir vakıflarının hibe programları, tutar bilgisiyle." },
  { n: "Superteam Earn", u: "https://superteam.fun/earn", d: "Solana ekosisteminde bounty, proje ve bölgesel hibeler (Türkiye dahil)." },
  { n: "NEAR Funding Hub", u: "https://www.near.org/funding", d: "NEAR ekosistemindeki tüm fon kanalları tek sayfada." },
  { n: "Top 100 Web3 Grants", u: "https://app.folk.app/shared/Top-100-Web3-Grants-sI1rSi46Slu8RcGDhEtE80OrsfFmiGsp", d: "Topluluk tarafından derlenen kapsamlı Web3 hibe listesi." },
];

function renderResources() {
  document.getElementById("resources-list").innerHTML = RESOURCES.map(
    (r) => `
    <div class="res-item">
      <h3>${esc(r.n)}</h3>
      <p>${esc(r.d)}</p>
      <a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.u)} ↗</a>
    </div>`
  ).join("");
}

/* ============================================================
   EYLEMLER
   ============================================================ */

function toggleTrack(grantId) {
  const p = active();
  if (p.tracked[grantId]) delete p.tracked[grantId];
  else p.tracked[grantId] = { status: "ilgileniyorum", note: "", updatedAt: new Date().toISOString() };
  save();
  renderAll();
}

function renderProfileSelect() {
  document.getElementById("profile-select").innerHTML = STATE.profiles
    .map((p) => `<option value="${p.id}" ${p.id === STATE.activeId ? "selected" : ""}>${esc(p.name)}</option>`)
    .join("");
}

function renderAll() {
  renderProfileSelect();
  renderProfileForm();
  renderPanel();
  renderGrants();
  renderTracker();
  renderSync();
}

/* ============================================================
   SENKRON ARAYÜZÜ
   ============================================================
   Kapalıyken hiçbir ağ isteği yapılmaz. Ayarlar girilene kadar
   uygulama tamamen çevrimdışı çalışır.
   ============================================================ */

function renderSync() {
  const el = document.getElementById("sync-state");
  if (!el) return;

  const setup = document.getElementById("sync-setup");
  const auth = document.getElementById("sync-auth");
  const actions = document.getElementById("sync-actions");

  if (!sync.isConfigured()) {
    el.innerHTML = `<span class="dot-off"></span>Senkron kapalı — veriler yalnızca bu tarayıcıda.`;
    setup.classList.remove("hidden");
    auth.classList.add("hidden");
    actions.classList.add("hidden");
    return;
  }

  document.getElementById("sync-url").value = sync.cfg.url;
  document.getElementById("sync-key").value = sync.cfg.anonKey.slice(0, 12) + "…";

  if (!sync.isSignedIn()) {
    el.innerHTML = `<span class="dot-off"></span>Bağlantı kayıtlı — giriş bekleniyor.`;
    setup.classList.remove("hidden");
    auth.classList.remove("hidden");
    actions.classList.add("hidden");
    return;
  }

  const who = sync.session.email ? esc(sync.session.email) : "oturum açık";
  const last = sync.lastSyncAt
    ? " · son senkron " + new Date(sync.lastSyncAt).toLocaleTimeString("tr-TR")
    : "";
  el.innerHTML = `<span class="dot-on"></span>Senkron açık — ${who}${last}`;
  setup.classList.add("hidden");
  auth.classList.add("hidden");
  actions.classList.remove("hidden");
}

function syncMsg(text, isError) {
  const el = document.getElementById("sync-state");
  if (!el) return;
  el.innerHTML =
    `<span class="${isError ? "dot-off" : "dot-on"}"></span>` +
    `<span style="color:${isError ? "var(--danger)" : "var(--accent)"}">${esc(text)}</span>`;
}

function wireSync() {
  if (!document.getElementById("sync-state")) return;
  sync.load();

  // Magic link dönüşü
  if (sync.isConfigured() && sync.captureSessionFromUrl()) {
    syncMsg("Giriş başarılı. Verileriniz eşitlenebilir.");
    setTimeout(renderSync, 1500);
  }

  document.getElementById("btn-sync-save").addEventListener("click", () => {
    try {
      sync.configure(
        document.getElementById("sync-url").value,
        document.getElementById("sync-key").value
      );
      renderSync();
      syncMsg("Bağlantı kaydedildi. Şimdi e-posta ile giriş yapın.");
      document.getElementById("sync-auth").classList.remove("hidden");
    } catch (e) {
      syncMsg(e.message, true);
    }
  });

  document.getElementById("btn-sync-off").addEventListener("click", () => {
    if (!confirm("Senkron kapatılsın mı? Yerel verileriniz silinmez.")) return;
    sync.disable();
    document.getElementById("sync-url").value = "";
    document.getElementById("sync-key").value = "";
    renderSync();
  });

  document.getElementById("btn-sync-link").addEventListener("click", async () => {
    const email = document.getElementById("sync-email").value.trim();
    try {
      syncMsg("Gönderiliyor…");
      await sync.sendMagicLink(email);
      syncMsg("Giriş bağlantısı gönderildi. E-postanızı kontrol edin.");
    } catch (e) {
      syncMsg(e.message, true);
    }
  });

  document.getElementById("btn-sync-push").addEventListener("click", async () => {
    try {
      syncMsg("Yükleniyor…");
      const r = await sync.push(STATE);
      syncMsg(`Yüklendi: ${r.profiles} proje, ${r.tracked} takip kaydı.`);
      setTimeout(renderSync, 2500);
    } catch (e) {
      syncMsg(e.message, true);
    }
  });

  document.getElementById("btn-sync-pull").addEventListener("click", async () => {
    try {
      syncMsg("İndiriliyor…");
      const remote = await sync.pull();
      STATE.profiles = sync.merge(STATE.profiles, remote);
      if (!STATE.profiles.some((p) => p.id === STATE.activeId)) {
        STATE.activeId = STATE.profiles[0]?.id;
      }
      save();
      renderAll();
      syncMsg(`${remote.length} proje birleştirildi.`);
      setTimeout(renderSync, 2500);
    } catch (e) {
      syncMsg(e.message, true);
    }
  });

  document.getElementById("btn-sync-out").addEventListener("click", () => {
    sync.signOut();
    renderSync();
  });
}

function switchTab(name) {
  document.querySelectorAll(".tab-panel").forEach((s) => s.classList.add("hidden"));
  document.getElementById("tab-" + name).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ============================================================
   BAŞLANGIÇ
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  load();

  fillSelect(document.getElementById("f-companyType"), COMPANY_TYPES, "Seçin…");
  fillSelect(document.getElementById("f-country"), COUNTRIES, null);
  fillSelect(document.getElementById("f-stage"), STAGES, "Seçin…");
  fillSelect(document.getElementById("f-funding"), FUNDING_STAGES, null);

  const cats = [...new Set(GRANTS.map((g) => g.category))].sort();
  document.getElementById("q-category").innerHTML =
    `<option value="">Tüm kategoriler</option>` +
    cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");

  document.querySelectorAll(".nav-item").forEach((b) =>
    b.addEventListener("click", () => switchTab(b.dataset.tab))
  );

  document.getElementById("profile-select").addEventListener("change", (e) => {
    STATE.activeId = e.target.value;
    save();
    renderAll();
  });

  document.getElementById("btn-new-profile").addEventListener("click", () => {
    const name = prompt("Yeni projenin adı:", "Yeni Proje");
    if (name === null) return;
    const p = blankProfile(name.trim() || "Yeni Proje");
    STATE.profiles.push(p);
    STATE.activeId = p.id;
    save();
    renderAll();
    switchTab("profil");
  });

  document.getElementById("btn-rename-profile").addEventListener("click", () => {
    const p = active();
    const name = prompt("Proje adı:", p.name);
    if (name === null) return;
    p.name = name.trim() || p.name;
    save();
    renderAll();
  });

  document.getElementById("btn-delete-profile").addEventListener("click", () => {
    if (STATE.profiles.length <= 1) return alert("En az bir proje kalmalı.");
    const p = active();
    if (!confirm(`"${p.name}" projesi ve tüm başvuru kayıtları silinsin mi?`)) return;
    STATE.profiles = STATE.profiles.filter((x) => x.id !== p.id);
    STATE.activeId = STATE.profiles[0].id;
    save();
    renderAll();
  });

  document.getElementById("btn-save-profile").addEventListener("click", () => {
    readProfileForm();
    renderAll();
    const msg = document.getElementById("save-msg");
    msg.textContent = "Kaydedildi ✓";
    setTimeout(() => (msg.textContent = ""), 2200);
    switchTab("tesvikler");
  });

  ["q-search", "q-category", "q-eligibility"].forEach((id) =>
    document.getElementById(id).addEventListener("input", renderGrants)
  );
  document.getElementById("btn-reset-filters").addEventListener("click", () => {
    document.getElementById("q-search").value = "";
    document.getElementById("q-category").value = "";
    document.getElementById("q-eligibility").value = "";
    renderGrants();
  });

  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `grant-radar-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById("btn-import").addEventListener("click", () =>
    document.getElementById("file-import").click()
  );
  document.getElementById("file-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.profiles)) throw new Error("Geçersiz dosya");
        STATE.profiles = data.profiles.map((p) => (p.sectors ? p : migrateV1Profile(p)));
        STATE.activeId = STATE.profiles[0].id;
        save();
        renderAll();
        alert("Yedek yüklendi.");
      } catch (err) {
        alert("Dosya okunamadı: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  document.getElementById("btn-wipe").addEventListener("click", () => {
    if (!confirm("TÜM projeler ve başvuru kayıtları silinecek. Emin misiniz?")) return;
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(STORE_KEY_V1);
    location.reload();
  });

  renderResources();
  wireSync();
  renderAll();
});
