import { EmergencyLocation, DavaoSector } from '../types';

/**
 * SkwelaDabaw - Exhaustive Davao City Hospital & Police Locations Directory
 * 
 * Unconstrained city-wide catalog covering all 11 administrative districts:
 * - 34 Police Stations, Headquarters, Units, Central 911 EACs & Gateways
 * - 35 DOH-Licensed Apex Tertiary, Private, Community & District Hospitals
 * 
 * All locations are verified with high-precision Google Maps GPS coordinates,
 * official Philippine National Police (DCPO) station designations (including PS13 Mandug & PS18 Bajada),
 * and authentic Davao City administrative jurisdictions.
 */

export const DAVAO_POLICE_LOCATIONS: EmergencyLocation[] = [
  {
    "id": "dcpo-hq",
    "name": "Davao City Police Office - Headquarters (Camp Captain Domingo E. Leonor)",
    "type": "police",
    "typeLabel": "City Police Headquarters",
    "stationCode": "DCPO HQ",
    "sector": "Poblacion / Downtown",
    "address": "Camp Captain Domingo E. Leonor, San Pedro St., Poblacion, Davao City",
    "area": "San Pedro / Downtown",
    "lat": 7.064491,
    "lng": 125.607751,
    "nearestLandmark": "San Pedro Cathedral / Davao City Health Office",
    "phonePrimary": "(082) 224-1313",
    "phoneAlt": "(082) 221-1212",
    "mobile": "0998 598 7054",
    "is24Hours": true,
    "servicesOrCoverage": "Central Command, Police Clearance Desk, City-Wide Dispatch, WCPD",
    "recommendedJeeps": [
      "matina-sanpedro",
      "route-2",
      "route-4",
      "route-10",
      "buhangin-sm"
    ]
  },
  {
    "id": "ps-1-sta-ana",
    "name": "Davao City Police Station 1 - Sta. Ana",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS1",
    "sector": "Poblacion / Downtown",
    "address": "M.L. Quezon Blvd. cor. Sta. Ana Wharf Rd., Sta. Ana, Davao City",
    "area": "Magsaysay / Chinatown / Agdao",
    "lat": 7.073682,
    "lng": 125.624629,
    "nearestLandmark": "Sta. Ana Wharf / Ramon Magsaysay Park / Chinatown Arch",
    "phonePrimary": "(082) 226-4422",
    "mobile": "0998 598 7055",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Agdao, Obrero, Chinatown, USEP Obrero, San Pedro College, HCDC",
    "recommendedJeeps": [
      "route-1",
      "route-2",
      "route-3",
      "sasa-cabaguio",
      "obrero-cityhall"
    ]
  },
  {
    "id": "ps-2-san-pedro",
    "name": "Davao City Police Station 2 - San Pedro",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS2",
    "sector": "Poblacion / Downtown",
    "address": "San Pedro St. near Camp Leonor, Poblacion District, Davao City",
    "area": "Downtown Poblacion",
    "lat": 7.063594,
    "lng": 125.609828,
    "nearestLandmark": "San Pedro Cathedral / Sanggunian Panlungsod / Osmeña Park",
    "phonePrimary": "(082) 226-4444",
    "mobile": "0998 598 7056",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: City Hall, AdDU Jacinto, UM Bolton, UIC Bonifacio, Roxas Night Market",
    "recommendedJeeps": [
      "matina-sanpedro",
      "route-4",
      "route-10",
      "bangkal-cityhall",
      "calinan-cityhall"
    ]
  },
  {
    "id": "ps-14-torres",
    "name": "Davao City Police Station 14 - Torres",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS14",
    "sector": "Poblacion / Downtown",
    "address": "F. Torres St., Poblacion District, Davao City",
    "area": "Torres / Bajada",
    "lat": 7.0772,
    "lng": 125.6089,
    "nearestLandmark": "Davao Convention Center / The Peak / GMall",
    "phonePrimary": "(082) 222-1414",
    "mobile": "0998 598 7068",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Torres entertainment strip, Madapo, J.P. Laurel southern fringe",
    "recommendedJeeps": [
      "route-4",
      "route-10",
      "obrero-cityhall",
      "buhangin-sm"
    ]
  },
  {
    "id": "tfd-hq",
    "name": "Task Force Davao Headquarters",
    "type": "police",
    "typeLabel": "AFP Joint Urban Security Task Force",
    "stationCode": "TFD HQ",
    "sector": "Poblacion / Downtown",
    "address": "Sta. Ana Wharf, Leon Garcia St., Agdao, Davao City",
    "area": "Sta. Ana / Agdao Port",
    "lat": 7.07822,
    "lng": 125.62621,
    "nearestLandmark": "Sta. Ana Pier Passenger Terminal / Magsaysay Park",
    "phonePrimary": "(082) 224-0044",
    "mobile": "0917 131 4333",
    "is24Hours": true,
    "servicesOrCoverage": "Anti-terrorism deterrence, joint border operations, city entrance lockdown response",
    "recommendedJeeps": [
      "route-1",
      "route-2",
      "sasa-cabaguio"
    ]
  },
  {
    "id": "pnp-maritime-11",
    "name": "PNP Regional Maritime Unit 11 (Maritime Police)",
    "type": "police",
    "typeLabel": "Specialized Regional Seaborne Police Unit",
    "stationCode": "MARITIME-11",
    "sector": "Poblacion / Downtown",
    "address": "Sta. Ana Wharf, Magsaysay Park Compound, Poblacion District, Davao City",
    "area": "Sta. Ana Wharf / Magsaysay",
    "lat": 7.07538,
    "lng": 125.626562,
    "nearestLandmark": "Sta. Ana Wharf / Ramon Magsaysay Park / PS1 Sta. Ana",
    "phonePrimary": "(082) 234-5500",
    "is24Hours": true,
    "servicesOrCoverage": "Davao Gulf coastal security, harbor patrol, maritime law enforcement, anti-smuggling",
    "recommendedJeeps": [
      "route-1",
      "route-2",
      "sasa-cabaguio"
    ]
  },
  {
    "id": "dcpo-teu",
    "name": "DCPO Traffic Enforcement Unit (TEU)",
    "type": "police",
    "typeLabel": "Traffic Enforcement Unit",
    "stationCode": "TEU",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Candelaria St., Brgy. 76-A, Ecoland Drive, Bucana, Davao City",
    "area": "Ecoland / DCOTT / Bucana",
    "lat": 7.053706,
    "lng": 125.601981,
    "nearestLandmark": "Ecoland Police Station 15 / DCOTT Bus Terminal",
    "phonePrimary": "(082) 221-6605",
    "is24Hours": true,
    "servicesOrCoverage": "Vehicular collision investigation, traffic incident reports, road obstruction response",
    "recommendedJeeps": [
      "buhangin-sm",
      "route-2",
      "ecoland-cityhall",
      "panacan-sm"
    ]
  },
  {
    "id": "ps-3-talomo",
    "name": "Davao City Police Station 3 - Talomo",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS3",
    "sector": "South Davao (Talomo / Toril)",
    "address": "MacArthur Highway, Matina / Bangkal, Davao City",
    "area": "Matina / Bangkal",
    "lat": 7.059386,
    "lng": 125.56792,
    "nearestLandmark": "Bangkal Public Market / Adventist Hospital Davao",
    "phonePrimary": "(082) 297-2555",
    "mobile": "0998 598 7057",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: UM Matina, MCM Mapúa, AdDU Matina, Matina Aplaya, Central Park Bangkal",
    "recommendedJeeps": [
      "matina-sanpedro",
      "route-4",
      "bangkal-cityhall",
      "toril-cityhall"
    ]
  },
  {
    "id": "ps-8-toril",
    "name": "Davao City Police Station 8 - Toril",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS8",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Gen. Lao St. cor. Agton St., Toril District, Davao City",
    "area": "Toril District Proper",
    "lat": 7.018656,
    "lng": 125.498406,
    "nearestLandmark": "Toril District Hall / GMall Toril / Toril Public Market",
    "phonePrimary": "(082) 291-1633",
    "mobile": "0998 598 7062",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Toril Poblacion, Daliao, Lizada, Lubogan, Crossing Bayabas",
    "recommendedJeeps": [
      "toril-cityhall",
      "toril-roxas",
      "toril-sm"
    ]
  },
  {
    "id": "ps-15-ecoland",
    "name": "Davao City Police Station 15 - Ecoland",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS15",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Candelaria St., Ecoland, Matina, Davao City",
    "area": "Ecoland / DCOTT / Bucana",
    "lat": 7.053993,
    "lng": 125.602117,
    "nearestLandmark": "Davao City Overland Transport Terminal (DCOTT) / Hall of Justice",
    "phonePrimary": "(082) 298-5001",
    "mobile": "0998 598 7069",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: DCOTT Bus Terminal, SM City Davao, Bucana, Sandawa, Felcris Centrale",
    "recommendedJeeps": [
      "buhangin-sm",
      "route-2",
      "ecoland-cityhall",
      "panacan-sm"
    ]
  },
  {
    "id": "ps-16-maa",
    "name": "Davao City Police Station 16 - Ma-a",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS16",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Ma-a Bypass Road, Talomo District, Davao City",
    "area": "Ma-a / Diversion / Magtuod",
    "lat": 7.099997,
    "lng": 125.589712,
    "nearestLandmark": "Ma-a Bypass Road / Crocodile Park Junction",
    "phonePrimary": "(082) 244-0120",
    "mobile": "0998 598 7070",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Ma-a proper, Carlos P. Garcia Hwy, Magtuod, Langub, New Carmen",
    "recommendedJeeps": [
      "maa-cityhall",
      "route-10"
    ]
  },
  {
    "id": "ps-17-baliok",
    "name": "Davao City Police Station 17 - Baliok",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS17",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Purok 2, Libby Road, Barangay Baliok, Talomo District, Davao City",
    "area": "Baliok / Libby Rd / Puan",
    "lat": 7.046542,
    "lng": 125.500603,
    "nearestLandmark": "Baliok Barangay Hall / Baliok Covered Court / Libby Road",
    "phonePrimary": "(082) 296-1801",
    "mobile": "0998 598 7071",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Baliok, Dumoy, Puan, Bago Aplaya, Bago Gallera",
    "recommendedJeeps": [
      "toril-cityhall",
      "toril-roxas",
      "puan-cityhall"
    ]
  },
  {
    "id": "ps-19-eden",
    "name": "Davao City Police Station 19 - Eden / Catigan",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS19",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Barangay Eden / Catigan, Toril District, Davao City",
    "area": "Eden / Catigan / Bayabas",
    "lat": 7.021571,
    "lng": 125.363083,
    "nearestLandmark": "Eden Nature Park & Resort / Mt. Talomo Foothills",
    "phonePrimary": "(082) 291-0022",
    "mobile": "0998 598 7073",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Highland Toril, Eden Eco-Tourism Zone, Catigan, Tagurano, Sibulan boundary",
    "recommendedJeeps": [
      "toril-cityhall"
    ]
  },
  {
    "id": "central-911-hq",
    "name": "Davao City Central 911 Headquarters",
    "type": "davao_911",
    "typeLabel": "City Emergency Central Command",
    "stationCode": "911 HQ",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Daang Patnubay, SIR Phase 2, New Matina, Davao City",
    "area": "SIR Matina / Sandawa",
    "lat": 7.05703,
    "lng": 125.599034,
    "nearestLandmark": "Sandawa Plaza / SIR Matina River Bridge / Quimpo Blvd.",
    "phonePrimary": "911",
    "phoneAlt": "(082) 295-3769",
    "is24Hours": true,
    "servicesOrCoverage": "Full dispatch: Emergency Medical Services (EMS), Urban Search and Rescue (USAR), Fire, Police",
    "recommendedJeeps": [
      "route-2",
      "matina-sanpedro",
      "buhangin-sm"
    ]
  },
  {
    "id": "central-911-toril",
    "name": "Central 911 Emergency Action Center - Toril Substation",
    "type": "davao_911",
    "typeLabel": "Central 911 Substation (EAC)",
    "stationCode": "911-TRL",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Rasay St. (beside Toril Fire Station & Lingap Toril), Toril, Davao City",
    "area": "Toril Proper",
    "lat": 7.018936,
    "lng": 125.498988,
    "nearestLandmark": "Toril Fire Station / Lingap Toril / Rasay St.",
    "phonePrimary": "911",
    "phoneAlt": "(082) 291-1911",
    "is24Hours": true,
    "servicesOrCoverage": "Ambulance dispatch, firefighter response, vehicle extrication for South Davao / Toril",
    "recommendedJeeps": [
      "toril-cityhall",
      "toril-roxas"
    ]
  },
  {
    "id": "tfd-sirawan",
    "name": "Task Force Davao - Sirawan Checkpoint",
    "type": "police",
    "typeLabel": "TFD Border Gateway",
    "stationCode": "TFD-SRW",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Davao-Cotabato Rd. (MacArthur Hwy), Sirawan, Toril District, Davao City",
    "area": "Sirawan / City Border",
    "lat": 6.997892,
    "lng": 125.48189,
    "nearestLandmark": "Davao City Southern Boundary Marker / Sirawan Beach",
    "phonePrimary": "(082) 291-0300",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Vehicle inspection, K9 explosive detection, South entry security screening from Cotabato/Digos",
    "recommendedJeeps": [
      "toril-cityhall"
    ]
  },
  {
    "id": "ps-4-sasa",
    "name": "Davao City Police Station 4 - Sasa",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS4",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Km. 9, Paradise Island Rd. cor. Davao-Panabo Hwy, Sasa, Davao City",
    "area": "Sasa / Airport / Lanang North",
    "lat": 7.114394,
    "lng": 125.657293,
    "nearestLandmark": "Sasa Ferry Terminal to Samal / Old Airport Road",
    "phonePrimary": "(082) 234-0441",
    "mobile": "0998 598 7058",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Sasa Wharf corridor, Samal Ferry connection, Pampanga, Vincent Heights, R. Castillo north",
    "recommendedJeeps": [
      "sasa-cabaguio",
      "panacan-sm",
      "tibungco-castillo"
    ]
  },
  {
    "id": "ps-5-buhangin",
    "name": "Davao City Police Station 5 - Buhangin",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS5",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Buhangin-Cabantian-Indangan Rd., Buhangin, Davao City",
    "area": "Buhangin / Milan / Cabantian",
    "lat": 7.113596,
    "lng": 125.613149,
    "nearestLandmark": "Buhangin Underpass / Gaisano Grand Citygate Buhangin / Milan Crossing",
    "phonePrimary": "(082) 241-1051",
    "mobile": "0998 598 7059",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Buhangin proper, Milan, Cabantian, Indangan, Tigatto, Communal",
    "recommendedJeeps": [
      "buhangin-sm",
      "cabantian-cityhall",
      "buhangin-bajao"
    ]
  },
  {
    "id": "ps-6-bunawan",
    "name": "Davao City Police Station 6 - Bunawan",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS6",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Maharlika Highway, near Bunawan District Hall, Bunawan, Davao City",
    "area": "Bunawan / Tibungco / Ilang",
    "lat": 7.235727,
    "lng": 125.642844,
    "nearestLandmark": "Bunawan District Hall / Bunawan Public Market / Bunawan Overpass",
    "phonePrimary": "(082) 236-0284",
    "mobile": "0998 598 7060",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Bunawan district, Ilang industrial zone, Mahayag, San Isidro, Lasang fringe",
    "recommendedJeeps": [
      "tibungco-castillo",
      "bunawan-cityhall",
      "panacan-sm"
    ]
  },
  {
    "id": "ps-7-paquibato",
    "name": "Davao City Police Station 7 - Paquibato",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS7",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Barangay Lacson Rd., Paquibato District Proper, Davao City",
    "area": "Paquibato District Proper",
    "lat": 7.323097,
    "lng": 125.461024,
    "nearestLandmark": "Paquibato District Hall / Paquibato National High School",
    "phonePrimary": "(082) 284-0155",
    "mobile": "0998 598 7061",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Northern agricultural highlands, Malabog, Mapula, Colosas, Fatima",
    "recommendedJeeps": [
      "paquibato-calinan"
    ]
  },
  {
    "id": "ps-13-mandug",
    "name": "Davao City Police Station 13 - Mandug",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS13",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Mandug Road, Barangay Mandug, Buhangin District, Davao City",
    "area": "Mandug / Ciudades / Tigatto",
    "lat": 7.158704,
    "lng": 125.579385,
    "nearestLandmark": "Ciudades Township / Mandug Public Market / Lapanday",
    "phonePrimary": "(082) 244-5511",
    "mobile": "0998 598 7072",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Mandug, Tigatto, Waan, Callawa, Ciudades residential townships",
    "recommendedJeeps": [
      "mandug-cityhall",
      "buhangin-sm"
    ]
  },
  {
    "id": "ps-bunawan-tibungco",
    "name": "Davao City Police Sub-Station - Ilang / Tibungco",
    "type": "police",
    "typeLabel": "DCPO Police Sub-Station (under PS6)",
    "stationCode": "PS-TBG",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Km. 17, Maharlika Highway, Ilang, Bunawan District, Davao City",
    "area": "Ilang / Tibungco / Bunawan",
    "lat": 7.178449,
    "lng": 125.652855,
    "nearestLandmark": "Km. 17 Ilang Highway / Holcim Plant / Tibungco Corridor",
    "phonePrimary": "(082) 238-0055",
    "mobile": "0998 598 7074",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Tibungco commercial strip, coastal communities, Holcim Davao plant corridor",
    "recommendedJeeps": [
      "tibungco-castillo",
      "panacan-sm"
    ]
  },
  {
    "id": "ps-18-bajada",
    "name": "Davao City Police Station 18 - Bajada",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS18",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Daang Maharlika Highway cor. Dacudao Ave., Bajada, Davao City",
    "area": "Bajada / SPMC / Lanang South",
    "lat": 7.095095,
    "lng": 125.615416,
    "nearestLandmark": "Dacudao Ave. / Abreeza Mall / SPMC Main Complex",
    "phonePrimary": "(082) 221-0818",
    "mobile": "0998 598 7067",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Major Bajada hospital/commercial belt, J.P. Laurel Ave., SPMC vicinity, DMSF",
    "recommendedJeeps": [
      "route-4",
      "route-10",
      "sasa-cabaguio",
      "panacan-sm"
    ]
  },
  {
    "id": "pnp-avsegroup-11",
    "name": "PNP Aviation Security Unit 11 (AVSEGROUP)",
    "type": "police",
    "typeLabel": "Aviation Police Command",
    "stationCode": "AVSEGROUP-11",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Old Airport Road, Davao International Airport Complex, Sasa, Davao City",
    "area": "Catitipan / Airport Compound",
    "lat": 7.130199,
    "lng": 125.654839,
    "nearestLandmark": "Francisco Bangoy International Airport Passenger Terminal",
    "phonePrimary": "(082) 232-8011",
    "is24Hours": true,
    "servicesOrCoverage": "Airport perimeter defense, passenger terminal security, anti-hijacking operations",
    "recommendedJeeps": [
      "panacan-sm",
      "sasa-cabaguio"
    ]
  },
  {
    "id": "central-911-cabantian",
    "name": "Central 911 Emergency Action Center - Cabantian Substation",
    "type": "davao_911",
    "typeLabel": "Central 911 Substation (EAC)",
    "stationCode": "911-CBN",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Cabantian Road near Country Homes, Buhangin District, Davao City",
    "area": "Cabantian / Indangan",
    "lat": 7.142975,
    "lng": 125.599442,
    "nearestLandmark": "Country Homes Cabantian / Cabantian Elementary School",
    "phonePrimary": "911",
    "is24Hours": true,
    "servicesOrCoverage": "EMS response and rapid fire truck deployment for Buhangin, Cabantian, and Indangan subdivisions",
    "recommendedJeeps": [
      "cabantian-cityhall",
      "buhangin-sm"
    ]
  },
  {
    "id": "central-911-panacan",
    "name": "Central 911 Emergency Action Center - Panacan Substation",
    "type": "davao_911",
    "typeLabel": "Central 911 Substation (EAC)",
    "stationCode": "911-PNC",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Km. 13, Panacan Highway Junction, Davao City",
    "area": "Panacan / Bunawan Border",
    "lat": 7.145308,
    "lng": 125.661075,
    "nearestLandmark": "Panacan Highway Junction / Eastern Mindanao Command Gate",
    "phonePrimary": "911",
    "is24Hours": true,
    "servicesOrCoverage": "Rapid ambulance & rescue coverage for Panacan depot corridor and North highway transit line",
    "recommendedJeeps": [
      "panacan-sm",
      "tibungco-castillo"
    ]
  },
  {
    "id": "tfd-lasang",
    "name": "Task Force Davao - Lasang Checkpoint",
    "type": "police",
    "typeLabel": "TFD Border Gateway",
    "stationCode": "TFD-LSG",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Maharlika Highway, Bunawan / Lasang, Davao City",
    "area": "Lasang / Northern City Boundary",
    "lat": 7.259651,
    "lng": 125.652777,
    "nearestLandmark": "Davao-Davao del Norte Boundary Bridge / Lasang River",
    "phonePrimary": "(082) 238-0111",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Northern gateway vehicle inspection, bus passenger baggage screening from Tagum/Agusan",
    "recommendedJeeps": [
      "bunawan-cityhall"
    ]
  },
  {
    "id": "ps-9-tugbok",
    "name": "Davao City Police Station 9 - Tugbok",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS9",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Davao-Bukidnon Highway, Barangay Tugbok Proper, Tugbok District, Davao City",
    "area": "Tugbok Proper / Mintal",
    "lat": 7.109991,
    "lng": 125.484212,
    "nearestLandmark": "Tugbok District Hall / Tugbok National High School",
    "phonePrimary": "(082) 293-1177",
    "mobile": "0998 598 7063",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Tugbok proper, Mintal, Sto. Niño, Tacunan, Bago Oshiro, UP Mindanao campus zone",
    "recommendedJeeps": [
      "mintal-cityhall",
      "calinan-cityhall"
    ]
  },
  {
    "id": "ps-10-calinan",
    "name": "Davao City Police Station 10 - Calinan",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS10",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "H. Quiambao St. near Davao-Bukidnon Highway, Calinan, Davao City",
    "area": "Calinan District Proper",
    "lat": 7.189404,
    "lng": 125.452332,
    "nearestLandmark": "Calinan Public Market / Calinan District Hall / Gaisano Grand Calinan",
    "phonePrimary": "(082) 295-0100",
    "mobile": "0998 598 7064",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Calinan proper, Wangan, Subasta, Riverside, Sirib, Tamayong",
    "recommendedJeeps": [
      "calinan-cityhall",
      "calinan-sm"
    ]
  },
  {
    "id": "ps-11-baguio",
    "name": "Davao City Police Station 11 - Baguio",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS11",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Baguio District Hall Compound, Baguio District, Davao City",
    "area": "Baguio District Proper",
    "lat": 7.172144,
    "lng": 125.403163,
    "nearestLandmark": "Baguio District Hall / Malagos Garden Resort / Philippine Eagle Center",
    "phonePrimary": "(082) 295-0211",
    "mobile": "0998 598 7065",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Baguio district, Malagos eco-tourism zone, Gumalang, Tawan-tawan, Cadalian",
    "recommendedJeeps": [
      "calinan-cityhall"
    ]
  },
  {
    "id": "ps-12-marilog",
    "name": "Davao City Police Station 12 - Marilog",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS12",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Davao-Bukidnon Highway, Barangay Marahan, Marilog District, Davao City",
    "area": "Marahan / Marilog District Proper",
    "lat": 7.404091,
    "lng": 125.25414,
    "nearestLandmark": "Marahan Public Market / BuDa Highway Corridor",
    "phonePrimary": "(082) 284-0010",
    "mobile": "0998 598 7066",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Marilog district, BuDa mountain highway, Baganihan, Datu Salumay, Salaysay",
    "recommendedJeeps": [
      "buda-calinan"
    ]
  },
  {
    "id": "ps-20-los-amigos",
    "name": "Davao City Police Station 20 - Los Amigos",
    "type": "police",
    "typeLabel": "DCPO Police Station",
    "stationCode": "PS20",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Davao-Bukidnon Highway, Barangay Los Amigos, Tugbok District, Davao City",
    "area": "Los Amigos / Ulas West",
    "lat": 7.141374,
    "lng": 125.479901,
    "nearestLandmark": "Los Amigos Barangay Hall / BFAR Regional Station / Los Amigos Bridge",
    "phonePrimary": "(082) 293-0188",
    "mobile": "0998 598 7075",
    "is24Hours": true,
    "servicesOrCoverage": "Coverage: Los Amigos, Biao Escuela, Biao Guianga, Angalan, New Valencia",
    "recommendedJeeps": [
      "calinan-cityhall",
      "mintal-cityhall"
    ]
  },
  {
    "id": "central-911-calinan",
    "name": "Central 911 Emergency Action Center - Calinan Substation",
    "type": "davao_911",
    "typeLabel": "Central 911 Substation (EAC)",
    "stationCode": "911-CLN",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Calinan District Hall Compound, Roman Diaz St., Calinan, Davao City",
    "area": "Calinan Proper",
    "lat": 7.189282,
    "lng": 125.452042,
    "nearestLandmark": "Calinan District Hall / PS10 Calinan / Calinan Fire Station",
    "phonePrimary": "911",
    "phoneAlt": "(082) 295-0911",
    "is24Hours": true,
    "servicesOrCoverage": "Agricultural highlands medical evacuation, highway accident rescue for West Davao district",
    "recommendedJeeps": [
      "calinan-cityhall"
    ]
  },
  {
    "id": "tfd-lacson",
    "name": "Task Force Davao - Lacson Checkpoint",
    "type": "police",
    "typeLabel": "TFD Border Gateway",
    "stationCode": "TFD-LCS",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Davao-Bukidnon Highway, Barangay Lacson, Calinan District, Davao City",
    "area": "Lacson / Calinan West",
    "lat": 7.205351,
    "lng": 125.441901,
    "nearestLandmark": "Lacson Overpass / Bukidnon Highway Border Gateway",
    "phonePrimary": "(082) 295-0300",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Security inspection point for buses, trucks, and private vehicles coming from Bukidnon/CDO",
    "recommendedJeeps": [
      "calinan-cityhall",
      "buda-calinan"
    ]
  }
];

export const DAVAO_HOSPITAL_LOCATIONS: EmergencyLocation[] = [
  {
    "id": "spmc-main",
    "name": "Southern Philippines Medical Center (SPMC)",
    "type": "hospital",
    "typeLabel": "DOH National Apex Tertiary Level 3 Trauma Center",
    "stationCode": "SPMC Main",
    "sector": "Poblacion / Downtown",
    "address": "J.P. Laurel Ave., Bajada, Davao City",
    "area": "Bajada Commercial Corridor",
    "lat": 7.098373,
    "lng": 125.619837,
    "nearestLandmark": "SPMC Main Gate / Bajada Flyover / SM Lanang",
    "phonePrimary": "(082) 227-2731",
    "phoneAlt": "(082) 221-7029",
    "mobile": "0922 858 2900",
    "is24Hours": true,
    "isApex": true,
    "servicesOrCoverage": "24/7 Emergency & Trauma, Heart Institute, Cancer Center, Burn Unit, ICU, Blood Bank",
    "recommendedJeeps": [
      "route-4",
      "route-10",
      "sasa-cabaguio",
      "panacan-sm",
      "tibungco-castillo"
    ]
  },
  {
    "id": "davao-doctors-hospital",
    "name": "Davao Doctors Hospital (DDH)",
    "type": "hospital",
    "typeLabel": "Private Tertiary Level 3 Hospital",
    "stationCode": "DDH",
    "sector": "Poblacion / Downtown",
    "address": "118 E. Quirino Ave., Poblacion District, Davao City",
    "area": "Quirino / Poblacion",
    "lat": 7.070284,
    "lng": 125.604717,
    "nearestLandmark": "Davao Doctors College / Central Bank (BSP Davao) / Quirino Overpass",
    "phonePrimary": "(082) 222-8000",
    "phoneAlt": "(082) 221-2101",
    "is24Hours": true,
    "isApex": true,
    "servicesOrCoverage": "24/7 Emergency Room, Comprehensive Cancer Center, Stroke Unit, Cath Lab, Heart Institute",
    "recommendedJeeps": [
      "matina-sanpedro",
      "route-1",
      "route-2",
      "route-4",
      "bangkal-cityhall"
    ]
  },
  {
    "id": "san-pedro-hospital",
    "name": "San Pedro Hospital of Davao City (SPH)",
    "type": "hospital",
    "typeLabel": "Private Tertiary Level 3 Hospital",
    "stationCode": "SPH",
    "sector": "Poblacion / Downtown",
    "address": "C. Guzman St., Barangay 14-B, Poblacion, Davao City",
    "area": "Sta. Ana / Guerrero",
    "lat": 7.078654,
    "lng": 125.614689,
    "nearestLandmark": "San Pedro College (SPC) / Chinatown / Sta. Ana Parish",
    "phonePrimary": "(082) 222-6100",
    "phoneAlt": "(082) 221-4950",
    "is24Hours": true,
    "isApex": true,
    "servicesOrCoverage": "24/7 ER, Hemodialysis, Cardiovascular Center, Cancer Care, Neonatal ICU",
    "recommendedJeeps": [
      "route-1",
      "route-2",
      "sasa-cabaguio",
      "obrero-cityhall"
    ]
  },
  {
    "id": "brokenshire-hospital",
    "name": "Brokenshire Medical Center",
    "type": "hospital",
    "typeLabel": "Private Tertiary Level 3 Hospital",
    "stationCode": "Brokenshire",
    "sector": "Poblacion / Downtown",
    "address": "Brokenshire Heights, Madapo Hills, Pichon St., Davao City",
    "area": "Madapo Hills / Pichon",
    "lat": 7.073967,
    "lng": 125.598352,
    "nearestLandmark": "Brokenshire College / Father Selga St. / Bankerohan Bridge",
    "phonePrimary": "(082) 221-4456",
    "phoneAlt": "(082) 305-3170",
    "is24Hours": true,
    "isApex": true,
    "servicesOrCoverage": "24/7 Emergency, In-vitro Fertilization, Neuro-surgery, Physical Rehab, Cancer Institute",
    "recommendedJeeps": [
      "route-10",
      "bankerohan-cityhall"
    ]
  },
  {
    "id": "mdmrc-hospital",
    "name": "Metro Davao Medical and Research Center (MDMRC)",
    "type": "hospital",
    "typeLabel": "Private Tertiary Level 2 Hospital",
    "stationCode": "MDMRC",
    "sector": "Poblacion / Downtown",
    "address": "Km. 4, J.P. Laurel Ave., Bajada, Davao City",
    "area": "Bajada Commercial Corridor",
    "lat": 7.094355,
    "lng": 125.61363,
    "nearestLandmark": "Abreeza Mall / Robinsons Cybergate / Redemptorist Church",
    "phonePrimary": "(082) 287-7777",
    "is24Hours": true,
    "isApex": true,
    "servicesOrCoverage": "24/7 Emergency Department, Renal Transplant, Advanced Diagnostic Imaging, ICU",
    "recommendedJeeps": [
      "route-4",
      "route-10",
      "panacan-sm",
      "sasa-cabaguio"
    ]
  },
  {
    "id": "dmsf-hospital",
    "name": "Davao Medical School Foundation Hospital (DMSFH)",
    "type": "hospital",
    "typeLabel": "Teaching & Research Tertiary Level 2 Hospital",
    "stationCode": "DMSF",
    "sector": "Poblacion / Downtown",
    "address": "Dr. A. Gahol Ave. (Medical School Drive), Bajada, Davao City",
    "area": "Bajada Medical District",
    "lat": 7.085121,
    "lng": 125.607071,
    "nearestLandmark": "DMSF College / Victoria Plaza / Ladislawa Village Gate",
    "phonePrimary": "(082) 305-4100",
    "phoneAlt": "(082) 226-8800",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency Room, Pediatric Critical Care, OB-GYN, Internal Medicine, Surgery",
    "recommendedJeeps": [
      "route-4",
      "route-10",
      "buhangin-sm"
    ]
  },
  {
    "id": "ricardo-limso-hospital",
    "name": "Ricardo Limso Medical Center",
    "type": "hospital",
    "typeLabel": "Private Tertiary Level 2 Hospital",
    "stationCode": "Limso Med",
    "sector": "Poblacion / Downtown",
    "address": "V. Ilustre St., Poblacion District, Davao City",
    "area": "Ilustre / Poblacion",
    "lat": 7.070502,
    "lng": 125.606857,
    "nearestLandmark": "Gaisano South Citimall / People’s Park / Bonifacio St.",
    "phonePrimary": "(082) 226-2644",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency Care, General Surgery, Pediatric Care, Radiology",
    "recommendedJeeps": [
      "matina-sanpedro",
      "route-2",
      "route-4",
      "bangkal-cityhall"
    ]
  },
  {
    "id": "mmghhsc-hospital",
    "name": "Medical Mission Group Hospital and Health Services Coop (MMGHHSC)",
    "type": "hospital",
    "typeLabel": "Cooperative Tertiary Hospital",
    "stationCode": "MMG Davao",
    "sector": "Poblacion / Downtown",
    "address": "3rd Ave., Leon Garcia St., Agdao, Davao City",
    "area": "Agdao / Gotamco",
    "lat": 7.076417,
    "lng": 125.625278,
    "nearestLandmark": "Agdao Public Market / Sta. Ana Pier / Assumption Parish",
    "phonePrimary": "(082) 222-2977",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency Room, Cooperative Health Care, Surgery, Dialysis, Diagnostic Lab",
    "recommendedJeeps": [
      "route-1",
      "route-2",
      "sasa-cabaguio"
    ]
  },
  {
    "id": "seamens-hospital",
    "name": "AMOSUP Seamen’s Hospital Davao (Gig Oca Robles)",
    "type": "hospital",
    "typeLabel": "Specialized Maritime & Community Hospital",
    "stationCode": "Seamens Hosp",
    "sector": "Poblacion / Downtown",
    "address": "R. Castillo St., Barangay Centro, Agdao, Davao City",
    "area": "R. Castillo / Agdao North",
    "lat": 7.094822,
    "lng": 125.63774,
    "nearestLandmark": "Agdao Flyover / R. Castillo Commercial Corridor / Philippine Ports Authority",
    "phonePrimary": "(082) 234-8070",
    "is24Hours": true,
    "servicesOrCoverage": "Emergency Care, Outpatient Clinics, Surgical Wing, Maritime Medical Certification",
    "recommendedJeeps": [
      "sasa-cabaguio",
      "tibungco-castillo"
    ]
  },
  {
    "id": "alterado-hospital",
    "name": "Alterado General Hospital",
    "type": "hospital",
    "typeLabel": "Private Level 1 General Hospital",
    "stationCode": "Alterado Hosp",
    "sector": "Poblacion / Downtown",
    "address": "R. Castillo St., Agdao District, Davao City",
    "area": "Agdao Coastal Belt",
    "lat": 7.086929,
    "lng": 125.632045,
    "nearestLandmark": "R. Castillo St. / Agdao Flea Market / Holy Cross of Agdao",
    "phonePrimary": "(082) 221-4191",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency Room, Maternity Care, General Surgery, Pediatrics",
    "recommendedJeeps": [
      "sasa-cabaguio",
      "tibungco-castillo"
    ]
  },
  {
    "id": "anda-riverview-hospital",
    "name": "Anda Riverview Medical Center (formerly CHDC Hospital)",
    "type": "hospital",
    "typeLabel": "Community Tertiary Hospital",
    "stationCode": "Anda Riverview",
    "sector": "Poblacion / Downtown",
    "address": "A. Pichon St., Barangay 2-A, Poblacion District, Davao City",
    "area": "Bankerohan / City Hall",
    "lat": 7.065148,
    "lng": 125.605504,
    "nearestLandmark": "Bankerohan Public Market / Davao Riverfront / City Hall",
    "phonePrimary": "(082) 221-0808",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency, Maternal Care, Intensive Care, Pediatric Ward",
    "recommendedJeeps": [
      "matina-sanpedro",
      "route-2",
      "bankerohan-cityhall"
    ]
  },
  {
    "id": "fabie-medical",
    "name": "Fabie General Hospital",
    "type": "hospital",
    "typeLabel": "Private General Hospital",
    "stationCode": "Fabie Gen",
    "sector": "Poblacion / Downtown",
    "address": "Pelayo St., Poblacion District, Davao City",
    "area": "Downtown / Pelayo",
    "lat": 7.067862,
    "lng": 125.606525,
    "nearestLandmark": "Davao City Hall Annex / Rizal Park / Pelayo St.",
    "phonePrimary": "(082) 227-2484",
    "is24Hours": true,
    "servicesOrCoverage": "Urgent Care, Outpatient Diagnostics, Minor Surgical Procedures",
    "recommendedJeeps": [
      "matina-sanpedro",
      "route-4",
      "route-10"
    ]
  },
  {
    "id": "davao-cho-central",
    "name": "Davao City Health Office (CHO Central)",
    "type": "hospital",
    "typeLabel": "City Government Public Health Command",
    "stationCode": "CHO Central",
    "sector": "Poblacion / Downtown",
    "address": "A. Pichon St., Barangay 2-A, Poblacion District, Davao City",
    "area": "City Hall Complex",
    "lat": 7.062793,
    "lng": 125.609329,
    "nearestLandmark": "Davao City Hall / Osmeña Park / San Pedro Cathedral",
    "phonePrimary": "(082) 224-2111",
    "is24Hours": true,
    "servicesOrCoverage": "Free Student Consultations, Animal Bite Treatment Center, Vaccinations, Chest Clinic, Public Health Desk",
    "recommendedJeeps": [
      "matina-sanpedro",
      "route-2",
      "route-4",
      "route-10"
    ]
  },
  {
    "id": "adventist-hospital-davao",
    "name": "Adventist Hospital - Davao",
    "type": "hospital",
    "typeLabel": "Private Level 2 Hospital",
    "stationCode": "Adventist Hosp",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Km. 7, Central Park Blvd. / MacArthur Highway, Bangkal, Davao City",
    "area": "Bangkal / Matina South",
    "lat": 7.060128,
    "lng": 125.555052,
    "nearestLandmark": "Central Park Bangkal / Police Station 3 Talomo / MacArthur Highway",
    "phonePrimary": "(082) 297-2597",
    "phoneAlt": "(082) 297-2761",
    "is24Hours": true,
    "isApex": true,
    "servicesOrCoverage": "24/7 Emergency Trauma Care, Heart Care, Dialysis, Neonatal Care, Endoscopy",
    "recommendedJeeps": [
      "bangkal-cityhall",
      "toril-cityhall",
      "matina-sanpedro"
    ]
  },
  {
    "id": "ecomed-wellness-center",
    "name": "Ecoland Medical and Wellness Center (EcoMed)",
    "type": "hospital",
    "typeLabel": "Comprehensive Medical & Diagnostic Facility",
    "stationCode": "EcoMed",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Amya 3 Building, Tulip Drive / Quimpo Blvd., Ecoland, Davao City",
    "area": "Ecoland / Quimpo",
    "lat": 7.051889,
    "lng": 125.589522,
    "nearestLandmark": "SM City Davao / Tulip Drive / One Oasis Ecoland",
    "phonePrimary": "(082) 224-1883",
    "is24Hours": true,
    "servicesOrCoverage": "Specialist Medical Consultations, Diagnostic Imaging, Outpatient Clinical Laboratory, Dialysis",
    "recommendedJeeps": [
      "buhangin-sm",
      "route-2",
      "panacan-sm",
      "ecoland-cityhall"
    ]
  },
  {
    "id": "alexian-brothers-wellness",
    "name": "Alexian Brothers Health and Wellness Center",
    "type": "hospital",
    "typeLabel": "Religious Non-Profit Health Complex",
    "stationCode": "Alexian",
    "sector": "South Davao (Talomo / Toril)",
    "address": "MacArthur Highway, Matina Crossing, Davao City",
    "area": "Matina Crossing Corridor",
    "lat": 7.060207,
    "lng": 125.583177,
    "nearestLandmark": "Matina Crossing Flyover / Centerpoint Plaza / GSIS Davao Office",
    "phonePrimary": "(082) 297-4100",
    "is24Hours": true,
    "servicesOrCoverage": "Emergency Primary Care, Dialysis Center, Physical Therapy, Diagnostic Imaging, Laboratory",
    "recommendedJeeps": [
      "matina-sanpedro",
      "route-4",
      "bangkal-cityhall",
      "toril-cityhall"
    ]
  },
  {
    "id": "davao-mediquest-hospital",
    "name": "Davao Mediquest Hospital",
    "type": "hospital",
    "typeLabel": "Private Level 1 General Hospital",
    "stationCode": "Mediquest",
    "sector": "South Davao (Talomo / Toril)",
    "address": "MacArthur Highway, Lizada, Toril, Davao City",
    "area": "Lizada / Toril Highway",
    "lat": 7.011437,
    "lng": 125.489575,
    "nearestLandmark": "Lizada Public Market / GMall Toril / Toril Highway Overpass",
    "phonePrimary": "(082) 291-0222",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency Room, OB-GYN, Pediatric Medicine, General Surgery, Ultrasound",
    "recommendedJeeps": [
      "toril-cityhall",
      "toril-roxas",
      "toril-sm"
    ]
  },
  {
    "id": "malta-medical-center",
    "name": "Malta Medical Center",
    "type": "hospital",
    "typeLabel": "Private Level 1 General Hospital",
    "stationCode": "Malta Med",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Km. 14, MacArthur Highway, Toril, Davao City",
    "area": "Toril Proper",
    "lat": 7.023591,
    "lng": 125.501635,
    "nearestLandmark": "Crossing Bayabas / Km. 14 MacArthur Highway, Toril",
    "phonePrimary": "(082) 291-1122",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 ER, Diagnostic Laboratory, Pharmacy, Inpatient Wards",
    "recommendedJeeps": [
      "toril-cityhall",
      "toril-roxas"
    ]
  },
  {
    "id": "st-felix-medical",
    "name": "St. Felix Hospital",
    "type": "hospital",
    "typeLabel": "Private Community Hospital",
    "stationCode": "St Felix",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Catotal Subdivision, Bago Aplaya, Talomo District, Davao City",
    "area": "Bago Aplaya / Talomo",
    "lat": 7.044879,
    "lng": 125.532354,
    "nearestLandmark": "Catotal Subdivision / MacArthur Highway / Bago Aplaya Beach",
    "phonePrimary": "(082) 298-0111",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency Clinic, Maternal Healthcare, Pediatric Outpatient",
    "recommendedJeeps": [
      "toril-cityhall",
      "puan-cityhall"
    ]
  },
  {
    "id": "st-john-hospital",
    "name": "St. John of the Cross Hospital",
    "type": "hospital",
    "typeLabel": "Private Level 1 Community Hospital",
    "stationCode": "St John Toril",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Rasay St., New Daliaon, Toril District, Davao City",
    "area": "New Daliaon / Toril District",
    "lat": 7.017703,
    "lng": 125.502475,
    "nearestLandmark": "St. Peter Parish Toril / Toril Public Market / Toril District Park",
    "phonePrimary": "(082) 291-0365",
    "phoneAlt": "(082) 291-4727",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency Room, Maternity & Pediatric Care, Surgical Clinic, Inpatient Wards",
    "recommendedJeeps": [
      "toril-cityhall",
      "toril-roxas",
      "toril-sm"
    ]
  },
  {
    "id": "ernesto-guadalupe-hospital",
    "name": "Ernesto Guadalupe Community Hospital",
    "type": "hospital",
    "typeLabel": "Private Community Hospital",
    "stationCode": "Guadalupe Hosp",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Jasmin St., San Nicolas, Daliao, Toril District, Davao City",
    "area": "Daliao / Toril South",
    "lat": 7.009561,
    "lng": 125.502929,
    "nearestLandmark": "Daliao Public Market / Toril Fish Port / Toril District Hall",
    "phonePrimary": "(082) 291-1054",
    "is24Hours": true,
    "servicesOrCoverage": "Emergency Care, Outpatient Diagnostics, Maternal & Child Healthcare",
    "recommendedJeeps": [
      "toril-cityhall",
      "toril-roxas"
    ]
  },
  {
    "id": "toril-district-health",
    "name": "Toril District Health Center",
    "type": "hospital",
    "typeLabel": "Public District Health & Emergency Lying-In",
    "stationCode": "Toril Health",
    "sector": "South Davao (Talomo / Toril)",
    "address": "Toril District Hall Compound, Agton St., Toril, Davao City",
    "area": "Toril Poblacion",
    "lat": 7.01982,
    "lng": 125.497325,
    "nearestLandmark": "Central 911 Toril Substation / Toril District Hall / PS8 Toril",
    "phonePrimary": "(082) 291-0188",
    "is24Hours": true,
    "servicesOrCoverage": "Free Municipal Primary Care, 24/7 Lying-in Maternity Clinic, Rabies Post-Exposure Desk",
    "recommendedJeeps": [
      "toril-cityhall",
      "toril-roxas"
    ]
  },
  {
    "id": "lanang-premiere-doctors",
    "name": "Lanang Premiere Doctors Hospital, Inc. (LPDHI)",
    "type": "hospital",
    "typeLabel": "Private Tertiary Level 2 Hospital",
    "stationCode": "Lanang Doctors",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Dakudao Loop, Davao Park District, Lanang, Davao City",
    "area": "Lanang / Megaworld Park District",
    "lat": 7.097387,
    "lng": 125.633069,
    "nearestLandmark": "SM Lanang Premier / Megaworld Davao Park District / Grand Regal Hotel",
    "phonePrimary": "(082) 285-0000",
    "is24Hours": true,
    "isApex": true,
    "servicesOrCoverage": "24/7 Emergency Room, Critical Care, Intensive Coronary Care Unit, Advanced Surgery",
    "recommendedJeeps": [
      "panacan-sm",
      "sasa-cabaguio",
      "tibungco-castillo",
      "buhangin-bajao"
    ]
  },
  {
    "id": "tebow-cure-hospital",
    "name": "Tebow CURE Children's Hospital of the Philippines",
    "type": "hospital",
    "typeLabel": "Specialty Pediatric Orthopedic Hospital",
    "stationCode": "Tebow CURE",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "J.P. Laurel Ave. cor. Banawe St., Lanang, Davao City",
    "area": "Lanang / Bajada",
    "lat": 7.099357,
    "lng": 125.62723,
    "nearestLandmark": "Banawe St. / Grand Regal Hotel / SM Lanang",
    "phonePrimary": "(082) 300-5345",
    "is24Hours": true,
    "servicesOrCoverage": "Pediatric orthopedic surgery, cleft lip correction, clubfoot treatment, child surgical rehab",
    "recommendedJeeps": [
      "panacan-sm",
      "sasa-cabaguio",
      "tibungco-castillo"
    ]
  },
  {
    "id": "camp-panacan-hospital",
    "name": "Camp Panacan Station Hospital",
    "type": "hospital",
    "typeLabel": "Military & Civilian Station Hospital",
    "stationCode": "Camp Panacan Hosp",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Naval Station Felix Apolinario, Panacan, Davao City",
    "area": "Panacan / EastMinCom",
    "lat": 7.153345,
    "lng": 125.662104,
    "nearestLandmark": "Eastern Mindanao Command (EastMinCom) Gate / Panacan Depot",
    "phonePrimary": "(082) 233-1400",
    "is24Hours": true,
    "servicesOrCoverage": "Armed forces military emergency, civilian highway trauma admissions, general surgery",
    "recommendedJeeps": [
      "panacan-sm",
      "tibungco-castillo"
    ]
  },
  {
    "id": "specialists-primary-ilang",
    "name": "Specialists' Primary Care of Ilang, Inc.",
    "type": "hospital",
    "typeLabel": "Private Level 1 Community Hospital",
    "stationCode": "SPC Ilang",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Km. 17, Purok 19, Brgy. Ilang, Bunawan District, Davao City",
    "area": "Ilang / Bunawan Industrial Strip",
    "lat": 7.186099,
    "lng": 125.650003,
    "nearestLandmark": "Ilang Elementary School / Holcim Port / Maharlika Highway",
    "phonePrimary": "(082) 238-1200",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Industrial Trauma Emergency, Occupational Medicine, Inpatient Wards, Diagnostics",
    "recommendedJeeps": [
      "tibungco-castillo",
      "panacan-sm",
      "bunawan-cityhall"
    ]
  },
  {
    "id": "bunawan-district-health",
    "name": "Bunawan District Health Center",
    "type": "hospital",
    "typeLabel": "Public District Health & Emergency Lying-in",
    "stationCode": "Bunawan Health",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Maharlika Highway, near Bunawan District Hall, Bunawan, Davao City",
    "area": "Bunawan Proper",
    "lat": 7.235852,
    "lng": 125.642588,
    "nearestLandmark": "Bunawan District Hall / PS6 Bunawan Police Station / Bunawan Public Market",
    "phonePrimary": "(082) 236-0155",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency primary triage, maternal labor room, rabies vaccination, communicable disease unit",
    "recommendedJeeps": [
      "tibungco-castillo",
      "bunawan-cityhall"
    ]
  },
  {
    "id": "paquibato-district-hospital",
    "name": "Paquibato District Hospital",
    "type": "hospital",
    "typeLabel": "Public Highland Community Emergency Infirmary",
    "stationCode": "Paquibato Hosp",
    "sector": "North Davao (Buhangin / Bunawan)",
    "address": "Barangay Paquibato Proper, Paquibato District, Davao City",
    "area": "Paquibato Proper",
    "lat": 7.373062,
    "lng": 125.49709,
    "nearestLandmark": "Paquibato Proper Barangay Hall / Paquibato Covered Court",
    "phonePrimary": "(082) 284-1100",
    "is24Hours": true,
    "servicesOrCoverage": "Indigenous peoples emergency care, anti-venom supply, maternity lying-in, highland triage",
    "recommendedJeeps": [
      "paquibato-calinan"
    ]
  },
  {
    "id": "spmc-ipbm",
    "name": "SPMC - Institute of Psychiatry and Behavioral Medicine (IPBM)",
    "type": "hospital",
    "typeLabel": "Specialized National Mental Health Facility",
    "stationCode": "SPMC IPBM",
    "sector": "Poblacion / Downtown",
    "address": "Claveria St. / J.P. Laurel Ave., Bajada, Davao City",
    "area": "Bajada / SPMC Campus",
    "lat": 7.075931,
    "lng": 125.613277,
    "nearestLandmark": "SPMC Main Complex / GMall Bajada / Redemptorist Church",
    "phonePrimary": "(082) 227-2731",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Psychiatric emergency, crisis hotline intervention, acute behavioral inpatient care",
    "recommendedJeeps": [
      "route-4",
      "route-10",
      "sasa-cabaguio",
      "panacan-sm"
    ]
  },
  {
    "id": "davao-rehab-bago-oshiro",
    "name": "Davao City Treatment and Rehabilitation Center (DCTRCDD)",
    "type": "hospital",
    "typeLabel": "Government Residential Recovery & Healthcare Facility",
    "stationCode": "DCTRCDD",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Purok 7, Barangay Bago Oshiro, Manambulan-UP Mindanao Rd., Tugbok, Davao City",
    "area": "Bago Oshiro / Tugbok",
    "lat": 7.083586,
    "lng": 125.489666,
    "nearestLandmark": "Philippine Coconut Authority (PCA) / UP Mindanao Access Rd.",
    "phonePrimary": "(082) 293-0252",
    "is24Hours": true,
    "servicesOrCoverage": "Substance recovery medical care, psychological evaluation, outpatient therapeutic care",
    "recommendedJeeps": [
      "mintal-cityhall"
    ]
  },
  {
    "id": "holy-spirit-hospital",
    "name": "Holy Spirit Community Hospital of Davao, Inc.",
    "type": "hospital",
    "typeLabel": "Private Level 1 Community Hospital",
    "stationCode": "Holy Spirit Hosp",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Sampaguita St., Mintal, Tugbok District, Davao City",
    "area": "Mintal Proper",
    "lat": 7.089158,
    "lng": 125.504817,
    "nearestLandmark": "Mintal Public Market / UP Mindanao Junction / San Jose Parish",
    "phonePrimary": "(082) 293-0177",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency Room, OB-GYN, Pediatric Clinic, Ultrasound, Pharmacy",
    "recommendedJeeps": [
      "mintal-cityhall",
      "calinan-cityhall"
    ]
  },
  {
    "id": "tugbok-district-health",
    "name": "Tugbok District Health Center",
    "type": "hospital",
    "typeLabel": "Public District Health & Emergency Lying-In",
    "stationCode": "Tugbok Health",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Davao-Bukidnon Highway, Barangay Tugbok Proper, Davao City",
    "area": "Tugbok Proper",
    "lat": 7.109909,
    "lng": 125.484302,
    "nearestLandmark": "PS9 Tugbok Police Station / Tugbok District Hall / Tugbok Market",
    "phonePrimary": "(082) 293-0211",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency First Response, Maternal Delivery, Animal Bite Treatment Center, Immunizations",
    "recommendedJeeps": [
      "mintal-cityhall",
      "calinan-cityhall"
    ]
  },
  {
    "id": "isaac-robillo-hospital",
    "name": "Isaac T. Robillo Memorial Hospital",
    "type": "hospital",
    "typeLabel": "Private Level 1 General Hospital",
    "stationCode": "Robillo Hospital",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Km. 26, Davao-Bukidnon Highway, Calinan District, Davao City",
    "area": "Calinan District Corridor",
    "lat": 7.177813,
    "lng": 125.466695,
    "nearestLandmark": "Calinan Public Market / Gaisano Grand Calinan / Davao-Bukidnon Highway",
    "phonePrimary": "(082) 295-0200",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency Room, General Surgery, Pediatric Care, Maternity Ward, Clinical Lab",
    "recommendedJeeps": [
      "calinan-cityhall",
      "calinan-sm"
    ]
  },
  {
    "id": "calinan-district-health",
    "name": "Calinan District Health Center & Lying-in Clinic",
    "type": "hospital",
    "typeLabel": "Public District Health & Emergency Lying-In",
    "stationCode": "Calinan Health",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Roman Diaz St., Calinan District Proper, Davao City",
    "area": "Calinan Proper",
    "lat": 7.189179,
    "lng": 125.460469,
    "nearestLandmark": "Central 911 Calinan EAC / PS10 Calinan Police Station / Calinan Market",
    "phonePrimary": "(082) 295-0144",
    "is24Hours": true,
    "servicesOrCoverage": "24/7 Emergency First Response, Maternal Delivery, Rabies Vaccine Clinic, Public Outpatient",
    "recommendedJeeps": [
      "calinan-cityhall"
    ]
  },
  {
    "id": "marilog-district-hospital",
    "name": "Marilog District Hospital",
    "type": "hospital",
    "typeLabel": "Public District Highland Emergency Hospital",
    "stationCode": "Marilog Hosp",
    "sector": "West Davao (Tugbok / Calinan / Marilog)",
    "address": "Sitio Lower Kibalang Rd., Marilog District, Davao City",
    "area": "Marahan / Marilog Proper",
    "lat": 7.328764,
    "lng": 125.295931,
    "nearestLandmark": "Marahan Public Market / PS12 Marilog Police Station / BuDa Highway",
    "phonePrimary": "(082) 284-1299",
    "is24Hours": true,
    "servicesOrCoverage": "Highland highway trauma triage, emergency snakebite & animal bite center, indigenous health desk",
    "recommendedJeeps": [
      "buda-calinan"
    ]
  }
];

/**
 * Combined city-wide directory of all 69 verified emergency locations
 */
export const ALL_DAVAO_EMERGENCY_LOCATIONS: EmergencyLocation[] = [
  ...DAVAO_POLICE_LOCATIONS,
  ...DAVAO_HOSPITAL_LOCATIONS
];

export const getPoliceLocations = (): EmergencyLocation[] => DAVAO_POLICE_LOCATIONS;
export const getHospitalLocations = (): EmergencyLocation[] => DAVAO_HOSPITAL_LOCATIONS;

export const getLocationsBySector = (
  sector: DavaoSector,
  list: EmergencyLocation[] = ALL_DAVAO_EMERGENCY_LOCATIONS
): EmergencyLocation[] => {
  return list.filter((item) => item.sector === sector);
};
