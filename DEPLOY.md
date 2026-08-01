# Yayına Alma

## ⚡ Senin kurulumun için: GitHub → Cloudflare (otomatik)

Repo ve Cloudflare bağlantısı zaten kurulu. Tek yapman gereken push:

```bash
cd grant-radar
git init                                    # ilk seferse
git remote add origin https://github.com/srabyanamrod/grantradar-tr.git
git add .
git commit -m "249 program + Supabase senkron + yeni arayüz"
git branch -M main
git push -u origin main --force             # ilk push'ta --force gerekebilir
```

Push biter bitmez Cloudflare otomatik build alır ve site güncellenir.

> **Not:** `wrangler.toml` dosyası klasörde hazır. Cloudflare'de **Build command**
> alanını **boş** bırak, **Deploy command** `npx wrangler deploy` kalsın.

Sonraki güncellemelerde sadece:

```bash
git add . && git commit -m "güncelleme" && git push
```

---

# Alternatifler

Grant Radar tamamen statik: sunucu yok, veritabanı yok, build adımı yok.
Bu yüzden neredeyse her yerde çalışır. Netlify takılırsa aşağıdakilerden
herhangi biri aynı işi görür.

---

## 0. Hiç yayına almadan kullan (en hızlısı)

Klasördeki `index.html` dosyasına çift tıklayın. Tarayıcıda açılır ve çalışır.

- ✅ Kurulum yok, hesap yok, internet gerekmez
- ⚠️ Bazı tarayıcılar `file://` üzerinde localStorage'ı kısıtlar; verileriniz
  kaydolmuyorsa aşağıdaki yerel sunucu yöntemine geçin

**Yerel sunucu (kısıtlama sorununu çözer):**

```bash
cd grant-radar
python3 -m http.server 8000
# tarayıcı: http://localhost:8000
```

Bu, tek kişilik kullanım için fazlasıyla yeterli. Telefondan erişmek veya
partnerinizle paylaşmak istiyorsanız aşağıdakilere geçin.

---

## 1. Cloudflare Pages — sürükle-bırak *(önerilen alternatif)*

En hızlı ve en güvenilir ücretsiz seçenek.

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages**
2. **Upload assets** sekmesini seçin
3. Proje adı yazın (ör. `grant-radar`)
4. `grant-radar` klasörünü (veya zip'i) sürükleyip bırakın
5. **Deploy**

Sonuç: `grant-radar.pages.dev` gibi bir URL, HTTPS dâhil.

Güncelleme: aynı sayfadan yeni sürümü tekrar yükleyin.

---

## 2. GitHub Pages — kalıcı ve ücretsiz

Hesabınız zaten varsa en sürdürülebilir yol; her `git push` otomatik yayınlar.

```bash
cd grant-radar
git init
git add .
git commit -m "Grant Radar"
gh repo create grant-radar --public --source=. --push
```

Sonra GitHub'da: **Settings → Pages → Source: Deploy from a branch →
Branch: main / (root) → Save**

Sonuç: `https://<kullanıcı-adınız>.github.io/grant-radar/`

> Repoyu `private` yaparsanız GitHub Pages ücretli plan ister.
> Uygulama hiçbir gizli bilgi içermediği için `public` sorun değil —
> verileriniz kodda değil, tarayıcınızda duruyor.

---

## 3. Vercel

```bash
npx vercel
```

Sorulara varsayılan cevapları verin. Framework sorulduğunda **Other** seçin.
Ya da https://vercel.com/new adresinden klasörü sürükleyin.

---

## 4. Surge.sh — tek komut

```bash
npm install -g surge
cd grant-radar
surge
```

E-posta ve şifre sorar (ilk seferde hesap açar), ardından bir URL verir.
İstediğiniz alt alan adını yazabilirsiniz: `grant-radar.surge.sh`

---

## 5. Netlify (asıl plan)

Hesabınızda site zaten oluşturuldu:

- **Site adı:** `grant-radar-tr`
- **Site ID:** `73a55d33-8993-4373-adb7-37575369fa5f`
- **Panel:** https://app.netlify.com/projects/grant-radar-tr

**Sürükle-bırak:** Panelde **Deploys** sekmesi → sayfanın altındaki
sürükle-bırak alanına klasörü/zip'i bırakın.

**CLI:**

```bash
cd grant-radar
npx netlify-cli login
npx netlify-cli link --id 73a55d33-8993-4373-adb7-37575369fa5f
npx netlify-cli deploy --prod --dir .
```

**Netlify takılıyorsa kontrol edin:**

- Tarayıcıda oturumunuz açık mı (`netlify login` yeni sekme açar, onay bekler)
- Sürüklediğiniz şey klasörün *içeriği* mi, yoksa üst klasör mü — `index.html`
  kökte olmalı
- Ücretsiz plan aylık deploy limitine takılmış olabilir

---

## Hangisini seçmeli?

| Durum | Öneri |
|---|---|
| Sadece kendi bilgisayarımda kullanacağım | **0** — yerel sunucu |
| Hızlıca bir link alıp telefondan da açayım | **1** — Cloudflare Pages |
| Uzun vadede geliştireceğim, her değişiklik otomatik yayınlansın | **2** — GitHub Pages |
| Netlify'ı zaten kurdum, oradan devam | **5** |

---

## Özel alan adı bağlama

Hepsinde benzer: sağlayıcının **Custom domain** ayarına
`grants.aybarsdorman.com` yazın, ardından alan adı panelinizde bir **CNAME**
kaydı oluşturun:

```
grants  CNAME  <size-verilen-adres>
```

HTTPS sertifikası otomatik gelir (birkaç dakika sürebilir).

---

## Paylaşım notu

Uygulama verileri **her tarayıcıda ayrı** tutar. Aynı URL'i partnerinizle
paylaşabilirsiniz — birbirinizin profillerini görmezsiniz, herkesin kendi
projeleri kendi cihazında kalır.

Verinizi başka bir cihaza taşımak için: **Kaynaklar → JSON olarak dışa aktar**,
sonra diğer cihazda **JSON içe aktar**.
