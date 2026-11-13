# Faristol

Faristol digital per estudiar música: compositors, obres, teoria i calendari del curs, en un sol lloc. Una eina personal en català, pensada per a un músic que cursa direcció i pedagogia.

**Accés:** <https://oboada.github.io/faristol/> (cal iniciar sessió)

## Resum

| Secció | Què hi ha |
|---|---|
| **Inici** | Cercador global, continua des d'on ho vas deixar, accés per èpoques i properes dates |
| **Biblioteca** | Compositors per èpoques (Barroc → Segle XXI), amb retrat, biografia i obres |
| **Obra** | Context, esquema de la forma (moviments, seccions, compassos, tonalitats) i guió d'assaig |
| **Teoria** | Orquestració, Harmonia, Forma i Vocabulari |
| **Curs** | Obres del curs per quadrimestres, amb períodes de preparació i pilot |

## Ordinador i mòbil

- **Ordinador:** espai de treball amb editor de text enriquit, esquemes, pla d'assaig, cerca i exportació (PDF).
- **Mòbil i tauleta:** versió de consulta, àgil i de lectura còmoda, sense edició.

S'instal·la com a app (PWA) i funciona també sense connexió.

## Tecnologia

- Una sola pàgina HTML/CSS/JavaScript, sense framework.
- [Supabase](https://supabase.com) per a l'autenticació i la sincronització de les dades de l'usuari.
- GitHub Pages per a la publicació.

## Privadesa

El contingut de l'app es publica xifrat (AES-256) i només es desxifra després d'iniciar sessió. Qui visiti el repositori o l'adreça veu només la pantalla d'entrada. Les dades de l'usuari són privades i els registres nous estan desactivats.

## Publicació

Vegeu [`README.md`](deploy/README.md) del paquet de publicació per configurar Supabase i GitHub Pages.

---

Autor: Oriol Boada
