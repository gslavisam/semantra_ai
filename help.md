# Uputstvo za Semantra React radnu površinu (Help Guide)

Ovaj dokument je praktičan vodič za upotrebu **Semantra Enterprise Semantic Integration Workbench** web aplikacije izgrađene u **React 18 / TypeScript** okruženju sa Node.js Express backendom.

---

## 🧭 Glavna navigacija i moduli

Semantra pruža šest glavnih radnih celina dostupnih u gornjoj navigacionoj traci:

1. **Workspace (Mapiranje & Profilisanje)**: Centralna radna površina za ingestiju izvornih i ciljnih šema, determinističko multi-signalno rangiranje predloga, analizu konfidencije, definisanje transformacija i automatsko generisanje koda (Python/Pandas, PySpark, dbt SQL, TypeScript).
2. **Reverse Engineering (WF-13)**: Specijalizovani 7-stepeni proces za automatsku analizu i sintezu ugovora integracije iz sirovih JSON/XML payload-a, automatsku ekstrakciju stranih ključeva i kardinalnosti, sinhronizaciju sa test asercijama i kreiranje izvršnog koda.
3. **Canonical Console (Upravljanje rečnikom)**: Centralni registar kanonskih entiteta, atributa i alijasa, sa Git-like grananjem (`main`, `draft`), **3-Way Merge Conflict Resolution** čarobnjakom za razrešavanje konflikata i nepromenljivim revizorskim tragom (Audit Trail).
4. **Catalog (Katalog integracija)**: Pretraga, verifikacija i ponovna upotreba prethodno odobrenih integracionih šema i kanonskih modela sa proračunom kompatibilnosti.
5. **Benchmarks (Kalibracija algoritama)**: Evaluacija preciznosti mapiranja kroz testne skupove podataka, poređenje profila bodovanja (Strict, Balanced, Semantic) i analiza uticaja korekcija analitičara.
6. **System & Observability (Sistem & Sigurnost)**: Nadzor stanja sistema, telemetrija, upravljanje Circuit Breaker zaštitnim mehanizmima za AI pozive i verifikacija zaštite podataka (PII maskiranje).

---

## 🛠️ Detaljni vodič kroz ključne tokove

### 1. Workspace: Radni tok mapiranja i transformacija

1. **Izbor ili unos izvora i cilja**:
   - Učitajte datoteke (CSV, JSON, XML, Excel ili DDL) ili izaberite pripremljene industrijske primere (npr. SAP IDoc, Workday, Salesforce, Stripe).
   - Sistem automatski vrši profilisanje podataka (tipovi, kardinalnost, null-odnosi, primeri vrednosti).
2. **Pokretanje determinističkog mapiranja**:
   - Pokrenite algoritam bodovanja koji kombinuje:
     - *Syntactic Match* (Levenshtein, Jaro-Winkler)
     - *Token Jaccard & N-Gram preklapanje*
     - *Semantička sličnost*
     - *Kompatibilnost tipova podataka*
     - *Strukturni kontekst i alijase*
3. **Pregled i verifikacija (Review & Triage)**:
   - Polja se automatski kategorišu:
     - `High Confidence (≥ 0.80)`: Direktno preporučena mapiranja.
     - `Needs Review (0.50 - 0.79)`: Zahteva proveru analitičara uz detaljan prikaz signala.
     - `Unmapped Gap (< 0.50)`: Polja bez jasnog parnjaka koja zahtevaju manuelno mapiranje ili transformacionu logiku.
4. **Transformacioni dizajn i generisanje koda**:
   - Definišite operacije mapiranja: direktno preslikavanje, spajanje stringova, konverzija valuta, parsiranje datuma, uslovna logika.
   - Generišite izvršni kod jednim klikom za:
     - **Python (Pandas)**
     - **PySpark (DataFrame API)**
     - **dbt SQL (Model transformacije)**
     - **TypeScript / JavaScript**
5. **Assertions & Validacija**:
   - Definišite ili generišite asercije (invarijante kvaliteta podataka: `NOT_NULL`, `UNIQUE`, `REGEX_MATCH`, `NUMERIC_RANGE`).
   - Pokrenite evaluaciju asercija direktno u radnoj površini.

---

### 2. Reverse Engineering ugovora integracije (WF-13)

Strukturisani 7-stepeni proces koji od nepoznatog JSON/XML payload-a kreira čist, standardizovan ugovor:

- **Korak 1 (Ingest & Health Audit)**: Validacija strukture, analiza popunjenosti polja, otkrivanje anomalija u tipovima.
- **Korak 2 (Payload Deconstruction)**: Razbijanje ugnježdenih hijerarhija i automatsko uparivanje sa kanonskim pojmovima.
- **Korak 3 (Smart Graph & FK Relations)**: Detekcija relacionih veza, primarnih/stranih ključeva i kardinalnosti (`1:1`, `1:N`, `N:1`).
- **Korak 4 (Assertions Synchronization)**: Automatsko kreiranje pravila validacije i sinhronizacija sa testnim paketom.
- **Korak 5 (Canonical Model Synthesis)**: Sinteza standardnog JSON Schema modela sa obogaćenom poslovnom semantikom.
- **Korak 6 (Refined Contract & Export)**: Izvoz DDL skripti i koda transformacije.
- **Korak 7 (Visual Architecture & BA Report)**: Interaktivni graf zavisnosti entiteta i izvoz izvršnog izveštaja za poslovne analitičare.

---

### 3. Canonical Console i 3-Way Merge

- **Kreiranje i rad na granama**: Radite izmene rečnika u izolovanoj radnoj grani (`draft`) bez uticaja na produkcioni `main` rečnik.
- **3-Way Merge čarobnjak**: Kada je rad završen, pokrenite spajanje grane sa `main`. Ukoliko postoje kolizije, sistem otvara interaktivni vizuelni pregled gde za svaki atribut možete izabrati:
  - *Keep Main* (zadrži postojeću vrednost iz glavne grane)
  - *Use Draft* (prihvati izmenu iz radne grane)
  - *Custom Override* (unesi prilagođenu novu definiciju)
- **Kriptografski potpis**: Svaki merge generiše SHA-256 hash transakcije i trajno se upisuje u revizorski dnevnik (Stewardship Audit Trail).

---

### 4. Bezbednost i Bounded AI principi

- **Ograničeni AI (Bounded AI)**: Generativni AI (Google Gemini 2.5) služi isključivo kao savetodavni asistent (objašnjenja, predlozi optimizacije i sinteza arhitekture). Sve odluke i mapiranja ostaju deterministički i pod kontrolom analitičara.
- **Automatsko PII maskiranje**: Pre bilo kakvog slanja podataka ka AI modelima, osetljivi podaci (imena, adrese, kreditne kartice, tokeni, JMBG) se automatski detektuju i maskiraju na klijentskom sloju.
- **Circuit Breaker**: U slučaju prekoračenja limita ili grešaka eksternog servisa, sistem automatski aktivira zaštitu i prebacuje se u 100% lokalni deterministički režim rada.

---

## ⌨️ Prečice i saveti za rad

- Klikom na ikonu **Pomoć (?)** u zaglavlju aplikacije otvara se interaktivni tehnički vodič sa detaljnim formulama bodovanja, primerima i specifikacijama signala.
- Sve generisane izveštaje, transformacije i ugovore možete direktno kopirati u clipboard ili preuzeti kao fajl (`.json`, `.py`, `.sql`, `.ts`, `.md`).
- Stanje sesije i radni nacrti se automatski čuvaju lokalno u vašem pregledaču.
