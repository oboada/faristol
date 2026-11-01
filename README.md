# Faristol — publicació (GitHub Pages + Supabase)

**Com queda protegida la informació encara que el repositori sigui públic**

L'`index.html` públic només és la pantalla d'entrada. Tota l'app (codi, fitxes, textos, teoria) viu **xifrada** a `app.enc`
(AES-256). La clau de desxifrat és a Supabase i només es lliura després d'iniciar sessió amb el teu correu i contrasenya.
Qui visiti l'adreça o miri el repositori veu un fitxer il·legible i una pantalla de login. Les teves dades (documents que
edites) també són a Supabase, amb regles que només et deixen veure les teves files, i els registres nous estan desactivats.

| Fitxer | Per a què serveix |
|---|---|
| `index.html` | Pantalla d'entrada: login, recull la clau i obre l'app |
| `app.enc` | L'app sencera, xifrada |
| `config.js` | **L'únic que has d'editar**: URL i clau pública de Supabase |
| `supabase-sync.js` | Sincronització de dades amb Supabase (un cop dins) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Instal·lable com a app i amb ús sense connexió |
| `supabase/schema.sql` | Taules i regles de seguretat |

A part (NO es puja a GitHub): **`NO-PUJAR-clau-privada.sql`**, que guarda la clau a Supabase.

---

## 1. Supabase (projecte teu, separat del de la Banda)

1. <https://supabase.com/dashboard> → **New project** → nom `faristol`, regió *West EU (Ireland)*, desa la contrasenya de la base de dades.
2. **SQL Editor → New query** → enganxa `supabase/schema.sql` → **Run** (*Success*).
3. **SQL Editor → New query** → enganxa el contingut de `NO-PUJAR-clau-privada.sql` → **Run**. (Un cop; si el perds, torna'm a demanar-lo.)
4. **Authentication → Users → Add user → Create new user**: el teu correu i **una contrasenya llarga i única** (és el que protegeix tot). Marca **Auto Confirm User**.
5. **Authentication → Sign In / Providers → Email**: desactiva **Allow new users to sign up** i desa.
6. **Project Settings → API Keys**: copia la **Project URL** i la clau **Publishable** (`sb_publishable_…`; si no hi és, la *anon public*). Mai la `service_role` ni la `secret`.
7. A `config.js`, enganxa'ls entre les cometes i desa.
8. **Per a «He oblidat la contrasenya»**: un cop tinguis l'adreça de GitHub Pages, a **Authentication → URL Configuration** posa-hi a *Site URL* `https://EL-TEU-USUARI.github.io/faristol/` i afegeix la mateixa adreça (amb `/`) a *Redirect URLs*. Sense això, l'enllaç del correu no tornarà a l'app.

## 2. GitHub Pages

1. <https://github.com/new> → nom `faristol` → **Public** → *Create repository*.
2. **uploading an existing file** → arrossega **tot el contingut** de la carpeta `faristol` (incloses `icons` i `supabase`) → **Commit changes**. *(No hi pugis `NO-PUJAR-clau-privada.sql`.)*
3. **Settings → Pages** → *Deploy from a branch* → `main` / `/ (root)` → **Save**.
4. Al cap d'1-2 min: `https://EL-TEU-USUARI.github.io/faristol/`.

## 3. Primera vegada

1. Obre l'adreça → entra → es mostra l'app. Un cop dins, les dades es desen a Supabase (**Desat**).
2. **Passa les dades de l'artefacte actual**: a l'app antiga, **Configuració → Dades → Còpia de seguretat (exporta)**; a la nova, el mateix menú (importa).
3. **Instal·la-la**: iPhone/iPad, Safari → *Comparteix* → **Afegeix a la pantalla d'inici**. Mac/Chrome: icona d'instal·lar a la barra d'adreces.
4. En aquest dispositiu es recorda la sessió i la clau, i l'app s'obre també sense connexió. **Tanca la sessió**: afegeix `#sessio` a l'adreça i prem el botó (també esborra la clau del dispositiu).

## Si oblides la contrasenya

A la pantalla d'entrada, **He oblidat la contrasenya** → escrius el correu → et ve un enllaç → tries una contrasenya nova i entres directament.

## Actualitzar l'app

Et passaré un `app.enc` nou: el substitueixes al repositori (**Add file → Upload files**, mateix nom). La clau no canvia; no cal tocar Supabase.

## Seguretat: què cal saber

- La protecció és tan forta com la **contrasenya** del teu compte: fes-la llarga i única. Si vols més, activa la verificació en dos passos a Supabase (**Authentication → Multi-Factor**).
- La clau *publishable* de `config.js` és pública per disseny; sense sessió no dona accés a res.
- Un cop has entrat, el contingut desxifrat és al teu dispositiu, com qualsevol app. No instal·lis l'app en dispositius que no són teus.
- Supabase gratuït no fa còpies diàries: exporta el `.json` de tant en tant.
- **Portrets amb IA (fase següent)**: una funció de Supabase amb la clau del model d'imatges com a secret; encaixa sense canviar res del que has pujat.
