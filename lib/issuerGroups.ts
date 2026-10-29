import type { PublicBond } from "./types";
import { issuerKey } from "./ranking";
import { ENRICHED } from "./issuerEnrich/data";

// Issuer groups (the owner, 25/10/2026): one economic issuer per line, the names and subsidiaries it appears under in
// the bond copy, joined with " | " (names as lib/ranking.ts issuerKey writes them), under the major sector the group
// belongs to (lib/sectors.ts). The copy carries no legal-entity identifier, parent or guarantor column, so this table
// is the 10bonds list of who belongs together, built from the 710 EUR issuer names of 25/10/2026 (e.g. "DZ Bank",
// "DZ BANK AG Deutsche Zentral-Genossenschaftsbank" and DZ HYP are one group, DZ BANK AG and its subsidiary).
// Captive finance arms count with their parent's sector. Issuers not listed form their own group (never joined to
// another by name similarity) with sector "Unclassified" (lib/sectors.ts); a bond with no issuer name at all is
// unverified and never enters the coherent optimiser. Limits: no LEI or guarantee check, joins decided from public
// ownership as known to us; extend the table when a new issuer appears (the live check lists the ones missing).
export const GROUP_TABLE_VERSION = "groups-2026-10-25";

const TABLE: Record<string, string> = {
  "Financials": `
poste italiane
aareal bank
abanca corporacion bancaria
abn amro bank | abn amro
aib group
banca monte dei paschi di siena | mediobnc international lu
banca transilvania
banco bpm
banco santande | santander uk group holdings | santander uk
bank polska kasa opieki
banque cantonale de geneve
bayerische landesbank | landesbank saar
bbva global finance
belfius bank
bnp paribas
bpce | natixis pfandbriefbank
banque federative du credit mutuel bfcm | banque credit mutuel
capital one financial corp | capital one
citigroup
commerzbank
cooperatieve rabobank u a | rabobank
credit agricole | credit agricole home loan sfh
danske bk
dekabank deutsche girozentrale
deutsche bank
deutsche pfandbriefbank | deutsche pfbrfbk
dnb bank
dz bank deutsche zentral genossenschaftsbank | dz bank | dz hyp
erste group bank | erste group | erste bank hungary zrt | ceska sporitelna as | slovenska sporitelna as
eurobank
goldman sachs group the | goldman sachs
landesbank hessen thuringen girozentrale | helaba
hsbc holdings | hsbc bank
hypo vorarlberg bank
ing groep | ing bank | ing diba
intesa sanpaolo | vseobecna uverova banka as
jefferies financial group | jefferies fincl
kbc group | kbc groep
kookmin bank
landesbank baden wuert | lbbw
lloyds bank uk | lloyds bank corporate markets
mbh bank nyrt
mizuho financial group | mizuho
morgan stanley
mufg
national au bank | bank of new zealand
natl bk canada
natwest grp | nwm
nomura holdings
norddeutsche landesbank girozentrale
nordea bank abp | nordea bnk | nordea mortgage bank
ntnwde buldg soc
op yrityspankki
piraeus bank
powszechna kasa oszczednosci pko bank polski
raiffeisen bank international | raiffeisen landesbank steiermark
rbc
shinhan bank co
skandinaviska enskilda banken | skandinaviska enskilda
smfg
societe generale
sparebank 1 sor norge
sparebanken norge boligkreditt as
standard chartered
svenska handelsbanken
swedbank
the bank of nova scotia | nova scotia
toronto dominion bank
ubs group
unicredit | unicredit bank | unicredit bank czech republic and slovakia a s
volksbank wien
wells fargo
nrw bank
macquarie group
orix
mitsubishi hc capital uk
leasys
hyundai cap
grenke finance
garfunkelux holdco 3
nexi
global payments
shift4 payments
nasdaq
euronext
deutsche borse
lseg netherlands | lsega financing
euroclear holding
moody s
marsh mclennan
equitable financial
fairfax finance
axa
allianz finance ii
talanx | hannover rueck
achmea
asr nederland
nn group | nationale nederlanden bank
sampo
unipol gruppo
uniqa insurance group
great west lifeco
liberty mut grp
nippon life ins | nippon life insurance co
la mondiale
phoenix grp
exor
jab holdings
eqt
tamburi
wendel
groupe bruxelles lambert gbl | groupe bruxelles lambert
`,
  "Government & agencies": `
nederlandse waterschapsbank
austria
baden wurttemberg
belgium
berlin
brandenburg
brazil
bulgaria
chile
colombia republic of
croatia
cyprus
estonia
finland
flamische gemeinschaft
france
germany
greece
hamburg
hessen
hungary
indonesia
ireland
israel
italy
kazakhstan
latvia
lithuania
mecklenburg vorpommern
mexico
netherlands
nordrhein westfalen
ontario
peru
philippines
people s republic of china
poland
portugal
rheinland pfalz
romania
saarland
sachsen anhalt
slovenia
slowakische republik
spain
turkiye
agence francaise de developpement
asian development bank adb
council of europe development bank
ebrd
european financial stability facility
european investment bank eib | european investment bank
european stability mechanism
european union
ifc
inter american investment corp iic
world bank
kfw | reconstruction loan corporation
landwirtschaftliche rentenbank
municipality finance
emissionskonsortium der gemeinsamen landerschatzanweisungen bestehend aus de
investitionsbank berlin
investitionsbank des landes brandenburg ilb
korea housing finance corp khfc
magyar export import bank zrt
ile de france mobilites
autobahnen und schnellstra en finanzierungs
`,
  "Industrials": `
cnh industrial finance euro | cnh industrial
danfoss finance i
la poste
legrand
transurb finance
volvo treasury
3m co
abb finance
abertis infraestructuras | societe des autoroutes du nord et de l est de la france sanef | holding d infrastructures de transport s
adecco international finance serv
aeroporti di roma
aeroports de paris
aena sme
airbus group finance
albion financing 1 sarl
alstom
apcoa group
assemblin caverion group
astm
atlas copco finance dac
autostrade per l italia
bouygues
bureau veritas
brenntag finance
biffa group holdings
boels topholding
caterpillar financial services corp | ctrpllr finance serv
daa finance
deutsche bahn finance
deutsche post
dover
dp world
dsv panalpina finance
east japan railway co
easyjet finco
eaton capital unlimited co
edenred
elis
emerson electric
experian europe dac | experian finance
fedex corp | fedex
ferrovial emisiones
ferrovie dello stato ital
fcc servicios medio ambiente holding
fortive
ge
hamburger hochbahn
hochtief
honeywell international
illinois tool
interparking
johnson cntrls
loomis
lufthansa
maersk
metso outotec
metropolitano de lisboa
mtu aero engines
nexans
paccar financial europe
paprec holding
parker hannifin corp | parker hannifin
pluxee
prosegur cia de seguridad
randstad
regie autonome des transports parisiens ratp
relx finance
rentokil initial finance
rolls royce
rtx corp
safran
schneider electric
siemens financieringsmaatschappij | siemens finance
siemens energy finance
signify
sixt
societe des autoroutes paris rhin rhone aprr
societe nationale sncf
teleperformance
thales
timken
tyco electronics group
ups
vestas wind systems finance
vinci | autoroutes du sud de la france | compagnie financiere et industrielle des autoroutes cofiroute | compagnie finance ind autoroutes
wabtec transportation netherlands
wolters kluwer
wurth finance international
`,
  "Consumer discretionary": `
robert bosch invest nedld | robert bosch
accorinvest group
adidas
aptiv swiss holdings
aramark international finance sarl
booking holdings
cirsa finance international r l
compass group finance netherlands
daimler | daimler international finance
bmw finance | bmw
volkswagen international finance | volkswagen bank | volkswagen leasing | traton finance luxembourg | traton finance luxemburg
renault | rci banque
stellantis
ford motor cred | ford motor credit co llc
gm finance
toyota credit | toyota finance au | toyota motor credit corp
honda motor co
john deere bank | john deere cap | john deere cash management
continental
compagnie generale des etablissements michelin
dometic group publ
h m finance
harley davidson finance
jaguar land rover
kering
magna international
mahle
mcdonald s
pvh
richemont international holding
schaeffler
sodexo
wmg acquisition
`,
  "Consumer staples": `
essity capital
henkel kgaa
anheuser busch inbev
b a t netherlands finance
altria group
boots group finco lp | bellis acquisition company
campari
carrefour
coca cola hbc finance
ccep finance
danone
diageo capital
esselunga
femsa
froneri lux finco sarl
general mills
heineken
iceland bondco
imperial brands finance netherlands | imperial
jde peet s
jt international finance
kellanova
kerry group financial services
koninklijke ahold delhaize | ahold finance us
kraft heinz food
l oreal
louis dreyfus co
market bidco finco
molson coors
mondelez international holdings nether | mondelez international
nestle finance international
nomad foods bondco
pepsico
pernod ricard
philip morris
reckitt benckiser treasury services | reckitt benckiser tsy
tesco corporate treasury services | tesco
unilever capital | unilever finance netherlands
`,
  "Health care": `
astrazeneca finance llc
alcon finance corp
baxter international
becton dickinson euro finance sarl | becton dickinson
bayer
cab selas
cencora
clariane
coloplast finance
dh europe finance ii
essilorluxottica
eurofins scientific
fresenius co kgaa | fresenius finance ireland | fresenius medica | fresenius medical care and co kgaa | fresenius
grunenthal
gsk capital | glaxosmithkline cap
gsk consumer healthcare capital nl
iqvia
lonza finance international
medtronic
merck financial services | emd finance
nidda healthcare holding
novartis finance
sandoz finance
novo nordisk finance
perrigo finance unlimited co
koninklijke philips | philips
roche finance europe
sanofi
smith nephew
stryker
takeda pharma
teva
thermo fisher scientific finance i | thermo fisher
upjohn finance
zimmer biomet
`,
  "Technology": `
cap gemini
amadeus it group
asml holding
dassault systemes
dxc capital funding dac
fidelity ntl inf
fiserv
ibm
infineon technologies
mks incorporated
nokia
sap
the sage group
uber technologies
prosus
softbank group corp | softbank group
`,
  "Communication services": `
at t
verizon
orange
deutsche telekom international fin | deutsche telekom international finance | deutsche telekom | t mobile usa
british tele
koninklijke kpn | kpn
swisscom finance
telefonica emis | telefonica emisiones u
telstra group
vodafone group | vodafone international financing dac
elisa
iliad | iliad holding sas
proximus
cellnex telecom | cellnex finance co
infrastrutture wireless italiane | inwit
fibercop
america movil
ck hutchison grp tele finance
ntt finance
ses
tdf infrastructure
jcdecaux
universal music group
netflix
wpp finance deutschland
bertelsmann kgaa
`,
  "Utilities": `
ignitis grupe uab
iwb
a2a
acea
acciona energia financiacion filiales
alliander
amprion
apa infra
cadent finance
e on international finance | e on inter finance
electricite de france
rte edf transport | coentreprise de transport d electricite
edp finance | edp servicios financieros espana s | edp
elia group | elia transmission belgium | eurogrid
enagas financiaciones u
enbw international finance
enel finance international | enel finance | enel
enexis holding
engie
erg
ewe
fluvius system operator cvba
fortum
gas networks ireland
iberdrola finanzas u
iren
italgas
national grid north america | national grid
naturgy finance
nederlandse gasunie
nortegas energia distribution
oncor elec dlvry | oncor electric delivery company ll
red electrica financ u
redexis gas finance
ren finance
rwe finance europe | rwe
severn trent utilities finance
snam
spp distribucia
stedin holding
tennet co kg | tennet netherlands
terna rete elettrica nazio | terna
teollisuuden voima
terega sasu | terega
veolia environ | veolia environnement
vier gas transport
duke energy
nextera holdings
southern co
eastern power networks
madrilena red de gas finance
contourglobal power holdings
ep infrastructure as
eustream as
verbund
`,
  "Energy": `
eni
omv
orlen
repsol europe finance | repsol international finance
shell international finance
total capital
bp capital markets
aker bp
neste
galaxy pipeline assets
pemex
cepsa finance
schlumberger finance france sas
technip energies
var energi
orano
urenco finance
`,
  "Materials": `
dow chem
arkema
akzo nobel
albemarle new holding
arcelormittal
anglo american cap
basf
glencore finance europe | glencore capital finance dac
linde finance | linde us | linde
air liquide finance
ppg inds
lyb international finance ii
nouryon finance
kronos international
lanxess
heidelberg materials | heidelbergcement
compagnie de saint gobain
ardagh metal packaging finance usa
progroup
givaudan finance europe
koninklijke dsm
firmenich productions participations s
syngenta finance
evonik finance
covestro
constantia flexibles group
crh finance dac | crh smw finance
imcd
k s
metsa board
mondi finance
smurfit kappa tr | smurfit kappa treasury
sika capital
snf group
stora enso
upm kymmene
westlake
tornator oy
`,
  "Real estate": `
pub strg oprtng
aedifica
adler financing sarl
akelius residential property finance
altarea
aroundtown | grand city properties
balder finland
ca immobilien anlagen
carmila
castellum
cofinimmo
covivio hotels saca | covivio
cpi property group
ctp
gecina
gewobag wohnungsbau
hammerson ireland finance dac
heimstaden bostad treasury
kojamo
klepierre
leg immobilien
mercialys
merlin properties socimi
ne property
sagax euro
segro
inmobiliaria colonial | societe fonciere lyonnaise
sveafastigheter
unibail rodamco
vgp
vesteda finance
vonovia finance | vonovia | deutsche wohnen
mileway
realty income corp | realty income
wp carey | wpc eurobond
sato
hemso treasury
american tower
iron mountain
equinix europe 1 | equinix europe 2
digital dutch finco
simon international finance
mpt finance corp
global switch finance
`,
};

const ENRICHED_PARENT_SECTOR = (k: string): { sector: string } | null => (ENRICHED[k]?.sector ? { sector: ENRICHED[k].sector! } : null);

export type GroupInfo = { group: string; sector: string | null; known: boolean; enriched?: boolean };

const BY_KEY = new Map<string, { group: string; sector: string }>();
for (const [sector, body] of Object.entries(TABLE)) {
  for (const line of body.trim().split("\n")) {
    const keys = line.split("|").map((k) => k.trim()).filter(Boolean);
    for (const k of keys) BY_KEY.set(k, { group: keys[0], sector });
  }
}

/** The issuer group and sector of a bond. Unlisted issuers are their own group, sector null; no issuer name = unverified. */
export function groupInfo(b: Pick<PublicBond, "issuer" | "isin">): GroupInfo {
  const key = issuerKey(b);
  if (key.startsWith("isin:")) return { group: key, sector: null, known: false };
  const hit = BY_KEY.get(key);
  if (hit) return { group: hit.group, sector: hit.sector, known: true };
  // Not in the hand-made table: use what the free-source lookup found (sector from SEC SIC / name rules, group from the GLEIF ultimate parent).
  const e = ENRICHED[key];
  if (!e) return { group: key, sector: null, known: true };
  const parent = e.parent ? BY_KEY.get(e.parent) ?? ENRICHED_PARENT_SECTOR(e.parent) : null;
  const sector = e.sector ?? parent?.sector ?? null;
  return { group: e.parent ? (BY_KEY.get(e.parent)?.group ?? e.parent) : key, sector, known: true, enriched: !!sector };
}

export const issuerGroupOf = (b: Pick<PublicBond, "issuer" | "isin">): string => groupInfo(b).group;
/** True when the bond names its issuer (otherwise its identity cannot be checked). */
export const issuerVerified = (b: Pick<PublicBond, "issuer" | "isin">): boolean => groupInfo(b).known;
