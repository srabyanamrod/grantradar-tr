/**
 * GRANT RADAR — Supabase Senkron Katmanı
 * =======================================
 * Tasarım ilkesi: OFFLINE-FIRST.
 *
 *   • localStorage her zaman birincil kaynaktır.
 *   • Supabase yalnızca isteğe bağlı bir yedekleme/senkron katmanıdır.
 *   • Senkron kapalıyken veya internet yokken uygulama tam çalışır.
 *   • Kullanıcı ayarları girmediği sürece hiçbir ağ isteği yapılmaz.
 *
 * SDK kullanmıyoruz — Supabase REST + Auth API'sine doğrudan fetch ile
 * gidiyoruz. Böylece bağımlılık ve harici CDN yükü sıfır kalıyor.
 *
 * Kurulum: supabase-schema.sql dosyasını Supabase SQL Editor'da çalıştırın,
 * ardından Kaynaklar sekmesindeki Senkron ayarlarına Project URL ve
 * "anon public" anahtarını girin.
 */

const SYNC_CFG_KEY = "grantradar.sync.cfg";
const SYNC_SESSION_KEY = "grantradar.sync.session";

const sync = {
  cfg: null,        // { url, anonKey }
  session: null,    // { access_token, refresh_token, expires_at, email }
  lastError: null,
  lastSyncAt: null,

  /* ---------- yapılandırma ---------- */

  load() {
    try {
      this.cfg = JSON.parse(localStorage.getItem(SYNC_CFG_KEY) || "null");
      this.session = JSON.parse(localStorage.getItem(SYNC_SESSION_KEY) || "null");
    } catch {
      this.cfg = null;
      this.session = null;
    }
    return this;
  },

  configure(url, anonKey) {
    url = (url || "").trim().replace(/\/+$/, "");
    anonKey = (anonKey || "").trim();
    if (!url || !anonKey) throw new Error("URL ve anon anahtarı gerekli.");
    if (!/^https:\/\/.+\.supabase\.co$/.test(url)) {
      throw new Error("URL şu biçimde olmalı: https://xxxx.supabase.co");
    }
    if (anonKey.length < 40) throw new Error("Anahtar geçersiz görünüyor.");
    // service_role anahtarını tarayıcıya koymaya karşı koruma
    if (/service_role/i.test(anonKey)) {
      throw new Error("Bu service_role anahtarı. Sadece 'anon public' anahtarını kullanın.");
    }
    this.cfg = { url, anonKey };
    localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(this.cfg));
    return this.cfg;
  },

  disable() {
    this.cfg = null;
    this.session = null;
    localStorage.removeItem(SYNC_CFG_KEY);
    localStorage.removeItem(SYNC_SESSION_KEY);
  },

  isConfigured() {
    return !!(this.cfg && this.cfg.url && this.cfg.anonKey);
  },

  isSignedIn() {
    return !!(this.session && this.session.access_token);
  },

  /* ---------- düşük seviye istek ---------- */

  async req(path, { method = "GET", body, auth = true, prefer } = {}) {
    if (!this.isConfigured()) throw new Error("Senkron yapılandırılmamış.");
    const headers = {
      apikey: this.cfg.anonKey,
      "Content-Type": "application/json",
    };
    if (auth && this.session?.access_token) {
      headers.Authorization = "Bearer " + this.session.access_token;
    }
    if (prefer) headers.Prefer = prefer;

    const res = await fetch(this.cfg.url + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && auth) {
      // Oturum düşmüş olabilir — yenilemeyi dene
      const refreshed = await this.refresh();
      if (refreshed) return this.req(path, { method, body, auth, prefer });
      throw new Error("Oturum süresi doldu, tekrar giriş yapın.");
    }

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
      const msg = (data && (data.message || data.error_description || data.error)) || res.statusText;
      throw new Error(msg || "İstek başarısız (" + res.status + ")");
    }
    return data;
  },

  /* ---------- kimlik doğrulama (magic link) ---------- */

  /** E-posta ile giriş bağlantısı gönderir. Şifre yok. */
  async sendMagicLink(email) {
    if (!email || !/.+@.+\..+/.test(email)) throw new Error("Geçerli bir e-posta girin.");
    await this.req("/auth/v1/otp", {
      method: "POST",
      auth: false,
      body: { email, create_user: true, options: { email_redirect_to: location.href.split("#")[0] } },
    });
    return true;
  },

  /**
   * Magic link'ten dönüşte URL fragment'ındaki token'ı yakalar.
   * index.html yüklendiğinde bir kez çağrılır.
   */
  captureSessionFromUrl() {
    if (!location.hash || location.hash.length < 10) return false;
    const p = new URLSearchParams(location.hash.slice(1));
    const access_token = p.get("access_token");
    const refresh_token = p.get("refresh_token");
    if (!access_token) return false;

    this.session = {
      access_token,
      refresh_token,
      expires_at: Date.now() + Number(p.get("expires_in") || 3600) * 1000,
      email: null,
    };
    localStorage.setItem(SYNC_SESSION_KEY, JSON.stringify(this.session));
    // Token'ı adres çubuğundan temizle
    history.replaceState(null, "", location.pathname + location.search);
    this.fetchUser().catch(() => {});
    return true;
  },

  async fetchUser() {
    const u = await this.req("/auth/v1/user");
    if (u && u.email && this.session) {
      this.session.email = u.email;
      this.session.user_id = u.id;
      localStorage.setItem(SYNC_SESSION_KEY, JSON.stringify(this.session));
    }
    return u;
  },

  async refresh() {
    if (!this.session?.refresh_token) return false;
    try {
      const d = await this.req("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        auth: false,
        body: { refresh_token: this.session.refresh_token },
      });
      if (!d?.access_token) return false;
      this.session = {
        ...this.session,
        access_token: d.access_token,
        refresh_token: d.refresh_token || this.session.refresh_token,
        expires_at: Date.now() + (d.expires_in || 3600) * 1000,
      };
      localStorage.setItem(SYNC_SESSION_KEY, JSON.stringify(this.session));
      return true;
    } catch {
      return false;
    }
  },

  signOut() {
    this.session = null;
    localStorage.removeItem(SYNC_SESSION_KEY);
  },

  /* ---------- veri eşleme ---------- */

  toRow(p, userId) {
    return {
      id: p.id,
      user_id: userId,
      name: p.name,
      company_type: p.companyType || null,
      country: p.country || null,
      company_age: Number(p.companyAge) || 0,
      employees: Number(p.employees) || 0,
      revenue: Number(p.revenue) || 0,
      founder_age: p.founderAge ?? null,
      stage: p.stage || null,
      funding: p.funding || null,
      sectors: p.sectors || [],
      quals: p.quals || [],
      updated_at: new Date().toISOString(),
    };
  },

  fromRow(r, trackedRows) {
    const tracked = {};
    (trackedRows || [])
      .filter((t) => t.profile_id === r.id)
      .forEach((t) => {
        tracked[t.grant_id] = { status: t.status, note: t.note || "", updatedAt: t.updated_at };
      });
    return {
      id: r.id,
      name: r.name,
      companyType: r.company_type || "",
      country: r.country || "tr",
      companyAge: r.company_age || 0,
      employees: r.employees || 0,
      revenue: Number(r.revenue) || 0,
      founderAge: r.founder_age ?? null,
      stage: r.stage || "",
      funding: r.funding || "bootstrap",
      sectors: r.sectors || [],
      quals: r.quals || [],
      tracked,
      _updatedAt: r.updated_at,
    };
  },

  /* ---------- senkron işlemleri ---------- */

  /** Yereldeki her şeyi buluta yazar (upsert). */
  async push(state) {
    if (!this.isSignedIn()) throw new Error("Önce giriş yapın.");
    const userId = this.session.user_id || (await this.fetchUser()).id;

    const profileRows = state.profiles.map((p) => this.toRow(p, userId));
    await this.req("/rest/v1/profiles?on_conflict=id", {
      method: "POST",
      body: profileRows,
      prefer: "resolution=merge-duplicates,return=minimal",
    });

    const trackedRows = [];
    state.profiles.forEach((p) => {
      Object.entries(p.tracked || {}).forEach(([grantId, t]) => {
        trackedRows.push({
          user_id: userId,
          profile_id: p.id,
          grant_id: grantId,
          status: t.status || "ilgileniyorum",
          note: t.note || "",
          updated_at: t.updatedAt || new Date().toISOString(),
        });
      });
    });
    if (trackedRows.length) {
      await this.req("/rest/v1/tracked?on_conflict=profile_id,grant_id", {
        method: "POST",
        body: trackedRows,
        prefer: "resolution=merge-duplicates,return=minimal",
      });
    }

    this.lastSyncAt = new Date().toISOString();
    return { profiles: profileRows.length, tracked: trackedRows.length };
  },

  /** Buluttaki her şeyi çeker. */
  async pull() {
    if (!this.isSignedIn()) throw new Error("Önce giriş yapın.");
    const profiles = await this.req("/rest/v1/profiles?select=*");
    const tracked = await this.req("/rest/v1/tracked?select=*");
    this.lastSyncAt = new Date().toISOString();
    return (profiles || []).map((r) => this.fromRow(r, tracked));
  },

  /**
   * Çift yönlü birleştirme: aynı id'de daha yeni updated_at kazanır.
   * Çakışma kaybı olmaması için yerelde olup bulutta olmayanlar korunur.
   */
  merge(localProfiles, remoteProfiles) {
    const byId = {};
    localProfiles.forEach((p) => (byId[p.id] = p));
    remoteProfiles.forEach((r) => {
      const local = byId[r.id];
      if (!local) {
        byId[r.id] = r;
        return;
      }
      const lt = Date.parse(local._updatedAt || 0) || 0;
      const rt = Date.parse(r._updatedAt || 0) || 0;
      byId[r.id] = rt > lt ? r : local;
    });
    return Object.values(byId);
  },
};

/* Node tarafında test edilebilsin diye */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { sync };
}
