# Grant Radar — Proje Notları (Claude Code için)

Bu dosyayı Claude Code otomatik okur. Projede çalışırken bu kurallara uy.

## Ne bu proje?

Türkiye ve global destek programlarını kullanıcının proje profiline göre
puanlayıp sıralayan tek sayfalık web uygulaması. İki kişi kullanıyor
(Aybars Dorman ve partneri), her biri kendi projeleri için ayrı profiller açıyor.

**Kapsam:** TR devlet destekleri · TR vergi avantajları · TR kurumsal programlar ·
global hızlandırıcılar · kurumsal inovasyon/venture client programları ·
Web3 zincir ve protokol ekosistem grantları · bulut & AI kredileri · AB fonları ·
iş dünyası ödülleri · hibe arama platformları. **Toplam 249 program.**

**Build adımı yok. Framework yok. Bağımlılık yok.** Dosyaları düzenle,
tarayıcıda aç, biter.

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `index.html` | Tüm ekranların iskeleti. Sekmeler `.tab-panel` sınıfıyla gizlenir/gösterilir. |
| `styles.css` | Tüm stil. Renkler `:root` altındaki CSS değişkenlerinde; açık/koyu tema otomatik. |
| `data.js` | Program veritabanı (`GRANTS`) + form sabitleri. **İçerik değişikliklerinin %90'ı burada.** |
| `app.js` | Durum yönetimi, eşleştirme motoru (`engine`), render fonksiyonları, senkron arayüzü. |
| `sync.js` | İsteğe bağlı Supabase senkron katmanı. SDK yok, doğrudan REST. |
| `supabase-schema.sql` | Supabase tabloları + RLS politikaları. SQL Editor'da bir kez çalıştırılır. |
| `netlify.toml` / `wrangler.toml` | Netlify ve Cloudflare deploy ayarları. |
| `DEPLOY.md` | Cloudflare, GitHub Pages, Vercel, Surge, Netlify talimatları. |

## Mimari kurallar

- **Durum tek yerde:** `STATE = { activeId, profiles[] }`. Her değişiklikten sonra `save()` çağır.
- **localStorage anahtarı:** `grantradar.v2`. Şema değişirse `v3` yap ve `migrateV1Profile` gibi bir geçiş fonksiyonu ekle — mevcut kullanıcı verisi asla kaybolmasın.
- **Çok profillilik:** Her proje ayrı bir profil nesnesi. Asla tek profil varsayma.
- **HTML'e veri basarken `esc()` kullan.** XSS'e karşı tek savunma bu.
- **`engine.evaluate()` saf fonksiyon olmalı** — DOM'a dokunmasın, sadece `(grant, profile)` alıp sonuç döndürsün. Test edilebilirliği buna bağlı.
- **Harici istek yok.** CDN, font servisi, analytics ekleme. Tek istisna: kullanıcının açıkça yapılandırdığı Supabase senkronu.
- **Senkron opsiyoneldir ve varsayılan kapalıdır.** `sync.isConfigured()` false ise hiçbir ağ isteği yapılmamalı. localStorage her zaman birincil kaynaktır; Supabase yalnızca yedek katmandır.
- **`service_role` anahtarı asla istemci koduna girmez.** `sync.configure()` bunu zaten reddediyor — bu kontrolü kaldırma.

## Profil şeması (v2)

```js
{
  id, name,
  companyType,   // yok | sahis | limited | anonim | yurtdisi | dao
  country,       // tr | eu | uk | us | other
  companyAge,    // yıl
  employees,
  revenue,       // TL
  founderAge,
  stage,         // fikir | prototip | mvp | gelir | olcek
  funding,       // bootstrap | melek | tohum | seriesa
  sectors: [],   // çoklu seçim
  quals: [],     // nitelikler
  tracked: { [grantId]: { status, note, updatedAt } }
}
```

## Eşleştirme mantığı (kritik)

Üç durum var:

- `eligible` — tüm şartlar sağlanıyor
- `partial` — sadece **nitelik** eksiği var (kullanıcının kapatabileceği: KOSGEB kaydı almak, eğitim tamamlamak, açık kaynak yapmak gibi)
- `ineligible` — **yapısal** engel var (şirket türü, ülke, yaş, sektör, aşama, ciro) — kısa vadede değiştirilemez

Bu ayrım ürünün kalbi. Yeni bir kural eklerken "kullanıcı bunu bu ay
değiştirebilir mi?" diye sor: değiştirebiliyorsa yumuşak (`soft: true`),
değiştiremiyorsa sert.

Puanlama: uygun=60, yakın=30 tabanı + tutar katkısı (maks 25) + başvuru
kolaylığı (maks 15).

`engine.unlockAnalysis()` yalnızca `partial` olanlara bakıp "şu niteliği
kazanırsan +N program açılır" listesi üretir. Bu, ürünün en değerli çıktısı.

## Yeni program ekleme

`data.js` içindeki `GRANTS` dizisine ekle. Zorunlu alanlar:
`id, name, institution, category, type, amountLabel, summary, effort, timeline, source, docs[], rules{}, notes`

`effort` şu beş değerden biri olmalı (puanlama buna bağlı):
`"Çok düşük" | "Düşük" | "Orta" | "Yüksek" | "Çok yüksek"`

`rules` alanları (hepsi opsiyonel): `companyTypes, countries, stages, sectors,
maxCompanyAgeYears, minCompanyAgeYears, maxEmployees, maxRevenue, maxFounderAge,
maxFunding, requiredQuals, anyQuals`

**Her yeni kaydın `source` alanı resmi kurum URL'si olmalı.** Blog veya haber
sitesi linkleme.

## Test

```bash
node --check data.js && node --check app.js
node /tmp/t2.js   # senaryo + sınır testleri (yoksa yeniden yaz)
```

Test yazarken şu sınır kontrollerini koru:

1. `genc-girisimci`: 30 yaş → ineligible, 27 yaş → eligible
2. `eturquality`: şahıs → ineligible, limited → eligible
3. `horizon-europe`: ABD kaydı → ineligible
4. `polkadot-treasury`: açık kaynak yoksa → partial, varsa → eligible
5. `endeavor-turkiye`: 0 yaşında şirket → ineligible
6. `startup-autobahn`: fikir aşaması → ineligible

Ayrıca veri bütünlüğü kontrolü: tekrarlı id yok, `rules` içindeki tüm
nitelik/sektör/ülke/aşama id'leri sabitlerde tanımlı.

## Deploy

`DEPLOY.md` dosyasına bak — 5 alternatif var. Netlify sitesi hazır:
`grant-radar-tr` (ID `73a55d33-8993-4373-adb7-37575369fa5f`).

## Yapma

- Teşvik tutarlarını kaynak göstermeden değiştirme.
- Kullanıcı verisini herhangi bir sunucuya gönderme.
- `data.js`'e yorum satırı olmadan kural ekleme — sonraki okuyucu nedenini anlamalı.
- Emin olmadığın ürün kararında varsayımla ilerleme, sor.

## Sıradaki geliştirme fikirleri

- Son başvuru tarihi alanı + yaklaşan tarih uyarısı
- Başvuru evrak checklist'i (her programın `docs` dizisinden otomatik)
- İki profili yan yana karşılaştıran görünüm
- "Başvuru dosyası özeti" PDF çıktısı
- Program bazlı not/dosya ekleme
