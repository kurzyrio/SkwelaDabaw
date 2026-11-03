import { DAVAO_CAMPUSES } from './davaoCampuses';
import { DAVAO_POLICE_LOCATIONS, DAVAO_HOSPITAL_LOCATIONS } from './davaoEmergencyLocations';

export type DavaoPlaceCategory = 'mall' | 'park' | 'school' | 'hub' | 'landmark' | 'hospital' | 'police';

export interface DavaoPlace {
  id: string;
  name: string;
  shortName: string;
  category: DavaoPlaceCategory;
  categoryLabel: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  nearestLandmark: string;
  recommendedJeeps: string[];
  dropOffPoints: string[];
  googleMapsUrl?: string;
  isPopular?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ALL DAVAO CITY MALLS & MAJOR SHOPPING CENTERS (25 Centers)
// ─────────────────────────────────────────────────────────────────────────────
export const DAVAO_MALLS: DavaoPlace[] = [
  {
    id: 'sm-city-davao',
    name: 'SM City Davao (Ecoland)',
    shortName: 'SM Ecoland',
    category: 'mall',
    categoryLabel: 'Shopping Mall',
    address: 'Quimpo Boulevard cor. Eco West Drive, Ecoland, Matina, Davao City',
    area: 'Ecoland / Matina',
    lat: 7.0492,
    lng: 125.5883,
    nearestLandmark: 'Ecoland Bus Terminal / Quimpo Blvd',
    recommendedJeeps: ['panacan-sm', 'sasa-sm', 'tibungco-sm', 'route-4', 'matina-sanpedro'],
    dropOffPoints: ['SM Ecoland Main Entrance', 'Quimpo Blvd Overpass Terminal'],
    googleMapsUrl: 'https://maps.google.com/?q=SM+City+Davao+Ecoland',
    isPopular: true
  },
  {
    id: 'sm-lanang-premier',
    name: 'SM Lanang Premier',
    shortName: 'SM Lanang',
    category: 'mall',
    categoryLabel: 'Premier Mall',
    address: 'J.P. Laurel Avenue, Lanang, Davao City',
    area: 'Lanang / Bajada',
    lat: 7.0988,
    lng: 125.6310,
    nearestLandmark: 'SMX Convention Center / Lanang Premiere Doctors',
    recommendedJeeps: ['panacan-sm', 'sasa-cabaguio', 'tibungco-castillo', 'buhangin-bajao'],
    dropOffPoints: ['SM Lanang Drop-off Bay', 'J.P. Laurel Sky Garden Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=SM+Lanang+Premier+Davao',
    isPopular: true
  },
  {
    id: 'abreeza-mall',
    name: 'Abreeza Mall (Ayala Malls)',
    shortName: 'Abreeza',
    category: 'mall',
    categoryLabel: 'Ayala Shopping Mall',
    address: 'J.P. Laurel Avenue, Bajada, Davao City',
    area: 'Bajada',
    lat: 7.0945,
    lng: 125.6121,
    nearestLandmark: 'Seda Abreeza Hotel / Redemptorist Church',
    recommendedJeeps: ['panacan-sm', 'sasa-cabaguio', 'buhangin-sm', 'route-10', 'route-4'],
    dropOffPoints: ['Abreeza Transport Terminal', 'J.P. Laurel North Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Abreeza+Mall+Davao',
    isPopular: true
  },
  {
    id: 'gaisano-mall-davao',
    name: 'Gaisano Mall of Davao (GMall Bajada)',
    shortName: 'GMall Bajada',
    category: 'mall',
    categoryLabel: 'Department Store & Mall',
    address: 'J.P. Laurel Avenue, Bajada, Davao City',
    area: 'Bajada / Poblacion',
    lat: 7.0792,
    lng: 125.6133,
    nearestLandmark: 'Davao Doctors Hospital Clinic / San Pedro College',
    recommendedJeeps: ['buhangin-sm', 'panacan-sm', 'sasa-cabaguio', 'route-2', 'route-4', 'route-10'],
    dropOffPoints: ['GMall Overpass Entrance', 'Peak Rooftop Entrance'],
    googleMapsUrl: 'https://maps.google.com/?q=Gaisano+Mall+of+Davao',
    isPopular: true
  },
  {
    id: 'nccc-mall-victoria-plaza',
    name: 'NCCC Mall Victoria Plaza (VP)',
    shortName: 'NCCC VP',
    category: 'mall',
    categoryLabel: 'Shopping Center',
    address: 'J.P. Laurel Avenue, Bajada, Davao City',
    area: 'Bajada',
    lat: 7.0854,
    lng: 125.6139,
    nearestLandmark: 'Davao Light Substation / Obrero Junction',
    recommendedJeeps: ['panacan-sm', 'sasa-cabaguio', 'buhangin-sm', 'route-10'],
    dropOffPoints: ['Victoria Plaza Main Gate', 'NCCC Supermarket Bay'],
    googleMapsUrl: 'https://maps.google.com/?q=NCCC+Mall+Victoria+Plaza+Davao',
    isPopular: true
  },
  {
    id: 'nccc-mall-buhangin',
    name: 'NCCC Mall Buhangin',
    shortName: 'NCCC Buhangin',
    category: 'mall',
    categoryLabel: 'Shopping Mall',
    address: 'Km 6, Tigatto Road, Buhangin, Davao City',
    area: 'Buhangin',
    lat: 7.1039,
    lng: 125.6033,
    nearestLandmark: 'Buhangin Underpass / Tigatto Crossing',
    recommendedJeeps: ['buhangin-sm', 'tigatto-cityhall', 'mandug-cityhall', 'acacia-cityhall'],
    dropOffPoints: ['NCCC Buhangin Main Lobby', 'Tigatto Road Terminal'],
    googleMapsUrl: 'https://maps.google.com/?q=NCCC+Mall+Buhangin+Davao',
    isPopular: true
  },
  {
    id: 'nccc-mall-toril',
    name: 'NCCC Mall of Toril',
    shortName: 'NCCC Toril',
    category: 'mall',
    categoryLabel: 'Community Mall',
    address: 'Crossing Bayabas, McArthur Highway, Toril, Davao City',
    area: 'Toril',
    lat: 7.0224,
    lng: 125.5078,
    nearestLandmark: 'Crossing Bayabas / McArthur Highway',
    recommendedJeeps: ['toril-cityhall', 'toril-claveria', 'toril-meralco', 'daliao-cityhall'],
    dropOffPoints: ['NCCC Toril Highway Entrance', 'Bayabas Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=NCCC+Mall+of+Toril',
    isPopular: true
  },
  {
    id: 'gaisano-mall-toril',
    name: 'Gaisano Mall of Toril (GMall Toril)',
    shortName: 'GMall Toril',
    category: 'mall',
    categoryLabel: 'Shopping Mall',
    address: 'Lim Street corner Saavedra, Toril, Davao City',
    area: 'Toril Central',
    lat: 7.0175,
    lng: 125.5029,
    nearestLandmark: 'Toril Public Market / Toril Police Station',
    recommendedJeeps: ['toril-cityhall', 'toril-claveria', 'toril-agdao', 'sirawan-toril'],
    dropOffPoints: ['GMall Toril Main Gate', 'Toril Public Park Crossing'],
    googleMapsUrl: 'https://maps.google.com/?q=Gaisano+Mall+of+Toril',
    isPopular: true
  },
  {
    id: 'gaisano-grand-citygate',
    name: 'Gaisano Grand Citygate Mall (Buhangin)',
    shortName: 'Citygate Buhangin',
    category: 'mall',
    categoryLabel: 'Grand Mall',
    address: 'Buhangin-Cabantian-Indangan Road, Buhangin, Davao City',
    area: 'Buhangin / Cabantian',
    lat: 7.1264,
    lng: 125.6122,
    nearestLandmark: 'Milan Buhangin / Commtalk Center',
    recommendedJeeps: ['buhangin-sm', 'cabantian-cityhall', 'indangan-cityhall'],
    dropOffPoints: ['Citygate Main Rotonda Gate', 'Cabantian Terminal'],
    googleMapsUrl: 'https://maps.google.com/?q=Gaisano+Grand+Citygate+Mall+Davao'
  },
  {
    id: 'gaisano-grand-calinan',
    name: 'Gaisano Grand Mall Calinan',
    shortName: 'GMall Calinan',
    category: 'mall',
    categoryLabel: 'District Mall',
    address: 'Davao-Bukidnon Highway, Calinan, Davao City',
    area: 'Calinan',
    lat: 7.1852,
    lng: 125.4578,
    nearestLandmark: 'Calinan Public Market / Bus Terminal',
    recommendedJeeps: ['calinan-cityhall', 'calinan-agdao', 'baguio-calinan'],
    dropOffPoints: ['Calinan Highway Entrance', 'Calinan Market Crossing'],
    googleMapsUrl: 'https://maps.google.com/?q=Gaisano+Grand+Mall+Calinan'
  },
  {
    id: 'gaisano-grand-tibungco',
    name: 'Gaisano Grand Mall Tibungco',
    shortName: 'GMall Tibungco',
    category: 'mall',
    categoryLabel: 'Suburban Mall',
    address: 'Km 18, Davao-Agusan Highway, Tibungco, Davao City',
    area: 'Tibungco / Bunawan',
    lat: 7.1878,
    lng: 125.6592,
    nearestLandmark: 'Tibungco Public Market / Bunawan District',
    recommendedJeeps: ['tibungco-sm', 'tibungco-castillo', 'bunawan-cityhall', 'panacan-sm'],
    dropOffPoints: ['Tibungco Highway Terminal Gate', 'Gaisano Tibungco Front'],
    googleMapsUrl: 'https://maps.google.com/?q=Gaisano+Grand+Mall+Tibungco'
  },
  {
    id: 'gaisano-grand-toril',
    name: 'Gaisano Grand Mall Toril',
    shortName: 'GGrand Toril',
    category: 'mall',
    categoryLabel: 'Shopping Center',
    address: 'Saavedra Street, Toril, Davao City',
    area: 'Toril',
    lat: 7.0189,
    lng: 125.5052,
    nearestLandmark: 'Toril District Hospital',
    recommendedJeeps: ['toril-cityhall', 'toril-claveria'],
    dropOffPoints: ['Saavedra St Entrance'],
    googleMapsUrl: 'https://maps.google.com/?q=Gaisano+Grand+Toril'
  },
  {
    id: 'gaisano-grand-panacan',
    name: 'Gaisano Grand Mall Panacan',
    shortName: 'GMall Panacan',
    category: 'mall',
    categoryLabel: 'Commercial Mall',
    address: 'Km 13, Davao-Agusan Highway, Panacan, Davao City',
    area: 'Panacan',
    lat: 7.1478,
    lng: 125.6521,
    nearestLandmark: 'Panacan Overpass / DPWH Panacan Depot',
    recommendedJeeps: ['panacan-sm', 'panacan-claveria', 'tibungco-sm'],
    dropOffPoints: ['Panacan Overpass Front'],
    googleMapsUrl: 'https://maps.google.com/?q=Gaisano+Grand+Panacan'
  },
  {
    id: 'gaisano-south-citimall',
    name: 'Gaisano Mall of Ilustre (Gaisano South Citimall)',
    shortName: 'GMall Ilustre',
    category: 'mall',
    categoryLabel: 'Downtown Mall',
    address: 'Ilustre Street, Poblacion, Davao City',
    area: 'Downtown / Poblacion',
    lat: 7.0673,
    lng: 125.6074,
    nearestLandmark: 'Davao Doctors Hospital / UIC Bonifacio',
    recommendedJeeps: ['matina-sanpedro', 'route-4', 'route-2', 'bangkal-cityhall', 'buhangin-sm'],
    dropOffPoints: ['Ilustre St Front Bay', 'Pelayo St Exit'],
    googleMapsUrl: 'https://maps.google.com/?q=Gaisano+Mall+Ilustre+Davao',
    isPopular: true
  },
  {
    id: 'felcris-centrale',
    name: 'Felcris Centrale',
    shortName: 'Felcris Centrale',
    category: 'mall',
    categoryLabel: 'Lifestyle Mall & Supermarket',
    address: 'Quimpo Boulevard, Bucana, Davao City',
    area: 'Bucana / Quimpo',
    lat: 7.0631,
    lng: 125.6063,
    nearestLandmark: 'Bolton Bridge / Land Transportation Office (LTO)',
    recommendedJeeps: ['matina-sanpedro', 'route-4', 'maa-cityhall', 'quimpo-sanpedro'],
    dropOffPoints: ['Felcris Centrale Main Courtyard'],
    googleMapsUrl: 'https://maps.google.com/?q=Felcris+Centrale+Davao'
  },
  {
    id: 'centerpoint-plaza-matina',
    name: 'Centerpoint Plaza (Matina Crossing)',
    shortName: 'Centerpoint Matina',
    category: 'mall',
    categoryLabel: 'Commercial Shopping Center',
    address: 'McArthur Highway corner Maa Road, Matina, Davao City',
    area: 'Matina Crossing',
    lat: 7.0589,
    lng: 125.5867,
    nearestLandmark: 'Matina Gallera / Maa Road Junction',
    recommendedJeeps: ['matina-sanpedro', 'bangkal-cityhall', 'toril-cityhall', 'maa-cityhall'],
    dropOffPoints: ['Centerpoint Overpass Front', 'Maa Road Crossing Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Centerpoint+Plaza+Matina+Davao'
  },
  {
    id: 'azuela-cove',
    name: 'Ayala Malls Azuela Cove',
    shortName: 'Azuela Cove',
    category: 'mall',
    categoryLabel: 'Waterfront Commercial Mall',
    address: 'R. Castillo Street corner J.P. Laurel Avenue, Lanang, Davao City',
    area: 'Lanang / Coastal',
    lat: 7.1086,
    lng: 125.6425,
    nearestLandmark: 'St. Luke’s Medical Center Site / Davao Gulf Esplanade',
    recommendedJeeps: ['sasa-cabaguio', 'panacan-sm', 'tibungco-castillo'],
    dropOffPoints: ['Azuela Cove Main Entrance Gate', 'The Shops at Azuela'],
    googleMapsUrl: 'https://maps.google.com/?q=Azuela+Cove+Davao'
  },
  {
    id: 'snr-membership-shopping',
    name: 'S&R Membership Shopping Davao',
    shortName: 'S&R Davao',
    category: 'mall',
    categoryLabel: 'Warehouse Club & Shopping',
    address: 'McArthur Highway, Matina, Davao City',
    area: 'Matina',
    lat: 7.0538,
    lng: 125.5901,
    nearestLandmark: 'Ateneo Junior High Matina / ABS-CBN Davao',
    recommendedJeeps: ['matina-sanpedro', 'toril-cityhall', 'bangkal-cityhall', 'calinan-cityhall'],
    dropOffPoints: ['S&R McArthur Highway Bay'],
    googleMapsUrl: 'https://maps.google.com/?q=S%26R+Membership+Shopping+Davao'
  },
  {
    id: 'damosa-gateway',
    name: 'Damosa Gateway & Market Basket',
    shortName: 'Damosa Gateway',
    category: 'mall',
    categoryLabel: 'Commercial Strip & Market',
    address: 'Angliongto / Mamay Road, Lanang, Davao City',
    area: 'Lanang',
    lat: 7.1022,
    lng: 125.6358,
    nearestLandmark: 'Damosa IT Park / Anflocor Building',
    recommendedJeeps: ['panacan-sm', 'sasa-cabaguio', 'tibungco-sm'],
    dropOffPoints: ['Damosa Gateway Entrance', 'Market Basket Plaza'],
    googleMapsUrl: 'https://maps.google.com/?q=Damosa+Gateway+Davao'
  },
  {
    id: 'victoria-plaza-mall-complex',
    name: 'Victoria Plaza Commercial Complex',
    shortName: 'Victoria Plaza',
    category: 'mall',
    categoryLabel: 'Commercial Complex',
    address: 'Bajada, Davao City',
    area: 'Bajada',
    lat: 7.0850,
    lng: 125.6135,
    nearestLandmark: 'Poblacion Bajada Boundary',
    recommendedJeeps: ['panacan-sm', 'sasa-cabaguio', 'route-10'],
    dropOffPoints: ['Victoria Plaza Front Bay'],
    googleMapsUrl: 'https://maps.google.com/?q=Victoria+Plaza+Davao'
  },
  {
    id: 'chimes-boutiques-sales',
    name: 'Chimes Boutiques (Gov. Sales & Felcris)',
    shortName: 'Chimes Boutiques',
    category: 'mall',
    categoryLabel: 'Luxury Department Store',
    address: 'Gov. Sales Street / Felcris Centrale, Davao City',
    area: 'Poblacion',
    lat: 7.0728,
    lng: 125.6138,
    nearestLandmark: 'Uyanguren Chinatown / Magsaysay Ave',
    recommendedJeeps: ['route-2', 'route-4', 'sasa-claveria'],
    dropOffPoints: ['Gov Sales Entrance'],
    googleMapsUrl: 'https://maps.google.com/?q=Chimes+Specialty+Store+Davao'
  },
  {
    id: 'plaza-del-carmen',
    name: 'Plaza del Carmen Commercial Mall',
    shortName: 'Plaza del Carmen',
    category: 'mall',
    categoryLabel: 'Commercial Complex',
    address: 'Loyola Street, Obrero, Davao City',
    area: 'Obrero',
    lat: 7.0841,
    lng: 125.6163,
    nearestLandmark: 'USEP Obrero / Stella Maris Academy',
    recommendedJeeps: ['route-10', 'sasa-cabaguio', 'obrero-cityhall'],
    dropOffPoints: ['Loyola St Front Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Plaza+Del+Carmen+Obrero'
  },
  {
    id: 'nccc-centerpoint-matina',
    name: 'NCCC Centerpoint (Matina)',
    shortName: 'NCCC Matina',
    category: 'mall',
    categoryLabel: 'Supermarket & Retail Center',
    address: 'Matina Crossing, McArthur Highway, Davao City',
    area: 'Matina Crossing',
    lat: 7.0543,
    lng: 125.5863,
    nearestLandmark: 'Matina Crossing Flyover',
    recommendedJeeps: ['matina-sanpedro', 'toril-cityhall', 'bangkal-cityhall'],
    dropOffPoints: ['Matina Crossing Stop'],
    googleMapsUrl: 'https://maps.google.com/?q=NCCC+Centerpoint+Matina'
  },
  {
    id: 'gaisano-grand-buhangin',
    name: 'Gaisano Grand Mall Buhangin (Milan)',
    shortName: 'GGrand Buhangin',
    category: 'mall',
    categoryLabel: 'Shopping Center',
    address: 'Milan, Buhangin, Davao City',
    area: 'Buhangin',
    lat: 7.1120,
    lng: 125.6065,
    nearestLandmark: 'Milan Buhangin Elementary School',
    recommendedJeeps: ['buhangin-sm', 'cabantian-cityhall'],
    dropOffPoints: ['Milan Buhangin Front Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Gaisano+Buhangin+Milan'
  },
  {
    id: 'davao-trade-center',
    name: 'Almendras Gym / DCCCII Trade Center',
    shortName: 'Davao Trade Center',
    category: 'mall',
    categoryLabel: 'Exhibition & Trade Center',
    address: 'Quimpo Boulevard, Davao City',
    area: 'Poblacion / Quimpo',
    lat: 7.0645,
    lng: 125.6081,
    nearestLandmark: 'Davao City Recreation Center (Almendras Gym)',
    recommendedJeeps: ['quimpo-sanpedro', 'matina-sanpedro', 'route-4'],
    dropOffPoints: ['Almendras Gym Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Davao+City+Recreation+Center'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. ALL DAVAO CITY PARKS, PLAZAS & NATURE DESTINATIONS (25 Parks)
// ─────────────────────────────────────────────────────────────────────────────
export const DAVAO_PARKS: DavaoPlace[] = [
  {
    id: 'peoples-park-davao',
    name: "People's Park Davao",
    shortName: "People's Park",
    category: 'park',
    categoryLabel: 'Urban Cultural Park',
    address: 'Palma Gil Street, Poblacion District, Davao City',
    area: 'Downtown Poblacion',
    lat: 7.0709,
    lng: 125.6083,
    nearestLandmark: 'Casa Silva / Philippine Women’s College / Pelayo St',
    recommendedJeeps: ['matina-sanpedro', 'route-4', 'route-2', 'buhangin-sm', 'panacan-sm'],
    dropOffPoints: ['People\'s Park Main Gate (Palma Gil)', 'Camus Street Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=People%27s+Park+Davao',
    isPopular: true
  },
  {
    id: 'ramon-magsaysay-park',
    name: 'Ramon Magsaysay Park (Chinatown)',
    shortName: 'Magsaysay Park',
    category: 'park',
    categoryLabel: 'Waterfront Cultural Park',
    address: 'R. Castillo Street / Leon Garcia Street, Chinatown, Davao City',
    area: 'Chinatown / Santa Ana',
    lat: 7.0759,
    lng: 125.6234,
    nearestLandmark: 'Chinatown Arch / Santa Ana Wharf / Fruit Vendors',
    recommendedJeeps: ['route-1', 'route-2', 'sasa-claveria', 'tibungco-castillo', 'panacan-sm'],
    dropOffPoints: ['Magsaysay Park Main Arc Gate', 'Santa Ana Wharf Terminal'],
    googleMapsUrl: 'https://maps.google.com/?q=Ramon+Magsaysay+Park+Davao',
    isPopular: true
  },
  {
    id: 'rizal-park-san-pedro',
    name: 'Rizal Park & San Pedro Square',
    shortName: 'Rizal Park',
    category: 'park',
    categoryLabel: 'Historic City Plaza',
    address: 'San Pedro Street, Poblacion, Davao City',
    area: 'San Pedro / City Hall',
    lat: 7.0652,
    lng: 125.6089,
    nearestLandmark: 'Davao City Hall / San Pedro Cathedral / SP Building',
    recommendedJeeps: ['matina-sanpedro', 'toril-cityhall', 'bangkal-cityhall', 'calinan-cityhall', 'route-4'],
    dropOffPoints: ['San Pedro Cathedral Cross', 'Rizal Monument Flagpole'],
    googleMapsUrl: 'https://maps.google.com/?q=Rizal+Park+San+Pedro+Davao',
    isPopular: true
  },
  {
    id: 'osmena-park',
    name: 'Osmeña Park (Heritage Garden)',
    shortName: 'Osmeña Park',
    category: 'park',
    categoryLabel: 'Botanical Heritage Park',
    address: 'C.M. Recto Street / San Pedro Street, Poblacion, Davao City',
    area: 'Downtown Poblacion',
    lat: 7.0664,
    lng: 125.6095,
    nearestLandmark: 'Sangguniang Panlungsod / Old Settlement Cemetery',
    recommendedJeeps: ['matina-sanpedro', 'route-2', 'route-4', 'calinan-cityhall'],
    dropOffPoints: ['C.M. Recto Corner Entrance'],
    googleMapsUrl: 'https://maps.google.com/?q=Osmena+Park+Davao'
  },
  {
    id: 'davao-coastal-baywalk',
    name: 'Davao City Coastal Road Baywalk & Esplanade',
    shortName: 'Coastal Baywalk',
    category: 'park',
    categoryLabel: 'Seaside Promenade Park',
    address: 'Bago Aplaya to Times Beach / Bucana, Davao City',
    area: 'Bago Aplaya / Talomo Coastal',
    lat: 7.0392,
    lng: 125.5684,
    nearestLandmark: 'Bago Aplaya Coastal Bridge / Times Beach Baywalk',
    recommendedJeeps: ['toril-cityhall', 'matina-sanpedro', 'bago-aplayo-cityhall'],
    dropOffPoints: ['Bago Aplaya Rotonda Esplanade', 'Times Beach Viewing Deck'],
    googleMapsUrl: 'https://maps.google.com/?q=Davao+City+Coastal+Road+Baywalk',
    isPopular: true
  },
  {
    id: 'crocodile-park-grounds',
    name: 'Davao Crocodile Park & Riverfront Complex',
    shortName: 'Crocodile Park',
    category: 'park',
    categoryLabel: 'Wildlife & Nature Park',
    address: 'Diversion Road, Ma-a, Davao City',
    area: 'Ma-a / Riverfront',
    lat: 7.1065,
    lng: 125.5898,
    nearestLandmark: 'Riverfront Corporate City / Tribu K’Mindanawan',
    recommendedJeeps: ['maa-cityhall', 'diversion-jeep'],
    dropOffPoints: ['Crocodile Park Main Entrance Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Davao+Crocodile+Park',
    isPopular: true
  },
  {
    id: 'quezon-park-city-hall',
    name: 'Quezon Park (City Hall Grounds)',
    shortName: 'Quezon Park',
    category: 'park',
    categoryLabel: 'Civic Plaza',
    address: 'San Pedro Street, Poblacion, Davao City',
    area: 'City Hall',
    lat: 7.0645,
    lng: 125.6086,
    nearestLandmark: 'Durian Monument Fountain / Davao City Hall Front',
    recommendedJeeps: ['matina-sanpedro', 'toril-cityhall', 'bangkal-cityhall', 'route-4'],
    dropOffPoints: ['City Hall Steps Entrance'],
    googleMapsUrl: 'https://maps.google.com/?q=Quezon+Park+Davao+City+Hall'
  },
  {
    id: 'freedom-park-clifford',
    name: 'Freedom Park (Millennium / Clifford Park)',
    shortName: 'Freedom Park',
    category: 'park',
    categoryLabel: 'Public Assembly Park',
    address: 'Roxas Avenue, Poblacion, Davao City',
    area: 'Roxas / Downtown',
    lat: 7.0697,
    lng: 125.6134,
    nearestLandmark: 'Ateneo de Davao Jacinto / Marco Polo Hotel',
    recommendedJeeps: ['route-2', 'route-4', 'route-10', 'sasa-claveria', 'panacan-sm'],
    dropOffPoints: ['Roxas Post Office Corner', 'Freedom Park Rotonda'],
    googleMapsUrl: 'https://maps.google.com/?q=Freedom+Park+Roxas+Davao'
  },
  {
    id: 'roxas-night-market',
    name: 'Roxas Avenue Night Market Promenade',
    shortName: 'Roxas Night Market',
    category: 'park',
    categoryLabel: 'Evening Pedestrian Promenade',
    address: 'Roxas Avenue, Poblacion, Davao City',
    area: 'Roxas / Poblacion',
    lat: 7.0715,
    lng: 125.6142,
    nearestLandmark: 'AdDU Jacinto Gate / Aldevinco Heritage Shopping',
    recommendedJeeps: ['route-2', 'route-4', 'route-10', 'sasa-claveria', 'panacan-sm'],
    dropOffPoints: ['Roxas / Padre Gomez Crossing', 'Ateneo Jacinto Canopy'],
    googleMapsUrl: 'https://maps.google.com/?q=Roxas+Night+Market+Davao',
    isPopular: true
  },
  {
    id: 'shrine-hills-matina',
    name: 'Shrine Hills (Holy Infant Jesus of Prague)',
    shortName: 'Shrine Hills',
    category: 'park',
    categoryLabel: 'Panoramic Hilltop Sanctuary Park',
    address: 'Shrine Hills Road, Matina, Davao City',
    area: 'Shrine Hills / Matina',
    lat: 7.0601,
    lng: 125.5788,
    nearestLandmark: 'Radio Maria / Matina Crossing Viewpoint',
    recommendedJeeps: ['matina-sanpedro', 'toril-cityhall', 'bangkal-cityhall'],
    dropOffPoints: ['Shrine Hills Archway (McArthur)', 'Chapel Hilltop Plaza'],
    googleMapsUrl: 'https://maps.google.com/?q=Shrine+of+the+Holy+Infant+Jesus+of+Prague+Davao',
    isPopular: true
  },
  {
    id: 'jacks-ridge-heritage-park',
    name: "Jack's Ridge Heritage Park",
    shortName: "Jack's Ridge",
    category: 'park',
    categoryLabel: 'Historical Scenic Park',
    address: 'Shrine Hills Road, Matina, Davao City',
    area: 'Shrine Hills / Matina',
    lat: 7.0618,
    lng: 125.5815,
    nearestLandmark: 'WWII Memorial Tunnels / Davao Gulf Overlook',
    recommendedJeeps: ['matina-sanpedro', 'bangkal-cityhall', 'maa-cityhall'],
    dropOffPoints: ['Jack’s Ridge Main Arch Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Jack%27s+Ridge+Davao',
    isPopular: true
  },
  {
    id: 'eden-nature-park',
    name: 'Eden Nature Park & Resort',
    shortName: 'Eden Nature Park',
    category: 'park',
    categoryLabel: 'Mountain Eco-Tourism Park',
    address: 'Barangay Eden, Toril District, Davao City',
    area: 'Toril / Mt. Apo Foothills',
    lat: 7.0142,
    lng: 125.4128,
    nearestLandmark: 'Bayabas Toril / Mountain Pines',
    recommendedJeeps: ['toril-cityhall', 'eden-toril-tricycle'],
    dropOffPoints: ['Eden Main Reception Lodge Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Eden+Nature+Park+Davao',
    isPopular: true
  },
  {
    id: 'malagos-garden-resort',
    name: 'Malagos Garden Resort & Chocolate Park',
    shortName: 'Malagos Garden',
    category: 'park',
    categoryLabel: 'Botanical & Eco Park',
    address: 'Malagos, Baguio District, Calinan, Davao City',
    area: 'Calinan / Baguio District',
    lat: 7.1843,
    lng: 125.4168,
    nearestLandmark: 'Malagos Watershed / Chocolate Museum',
    recommendedJeeps: ['calinan-cityhall', 'baguio-calinan'],
    dropOffPoints: ['Malagos Resort Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Malagos+Garden+Resort+Davao'
  },
  {
    id: 'philippine-eagle-center',
    name: 'Philippine Eagle Center Nature Reserve',
    shortName: 'Philippine Eagle Center',
    category: 'park',
    categoryLabel: 'National Wildlife Conservation Park',
    address: 'Malagos, Baguio District, Calinan, Davao City',
    area: 'Calinan / Malagos',
    lat: 7.1868,
    lng: 125.4140,
    nearestLandmark: 'Davao City Water District Watershed Reserve',
    recommendedJeeps: ['calinan-cityhall', 'malagos-calinan-tricycle'],
    dropOffPoints: ['Philippine Eagle Reserve Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Philippine+Eagle+Center+Davao',
    isPopular: true
  },
  {
    id: 'toril-public-park',
    name: 'Toril Public Park & Freedom Square',
    shortName: 'Toril Public Park',
    category: 'park',
    categoryLabel: 'Community Plaza Park',
    address: 'De Guzman Street corner Saavedra, Toril, Davao City',
    area: 'Toril Central',
    lat: 7.0180,
    lng: 125.5042,
    nearestLandmark: 'Toril Police Station / Toril District Hall',
    recommendedJeeps: ['toril-cityhall', 'toril-claveria', 'daliao-cityhall'],
    dropOffPoints: ['Toril Plaza Bandstand'],
    googleMapsUrl: 'https://maps.google.com/?q=Toril+Public+Park'
  },
  {
    id: 'calinan-public-park',
    name: 'Calinan Public Park & Playground',
    shortName: 'Calinan Park',
    category: 'park',
    categoryLabel: 'District Public Plaza',
    address: 'Roman Diaz Street, Calinan, Davao City',
    area: 'Calinan Central',
    lat: 7.1835,
    lng: 125.4590,
    nearestLandmark: 'Calinan District Hall / Calinan Police Station',
    recommendedJeeps: ['calinan-cityhall', 'calinan-agdao'],
    dropOffPoints: ['Calinan Plaza Center'],
    googleMapsUrl: 'https://maps.google.com/?q=Calinan+Public+Park'
  },
  {
    id: 'mintal-public-park',
    name: 'Mintal Public Park & Peace Memorial (Little Tokyo)',
    shortName: 'Mintal Peace Park',
    category: 'park',
    categoryLabel: 'Historic Peace Memorial Park',
    address: 'Mintal Highway, Tugbok District, Davao City',
    area: 'Mintal / Tugbok',
    lat: 7.0911,
    lng: 125.5342,
    nearestLandmark: 'UP Mindanao Junction / Ohta Kyosaburo Monument',
    recommendedJeeps: ['mintal-cityhall', 'calinan-cityhall', 'upmin-mintal'],
    dropOffPoints: ['Mintal Public Plaza Monument'],
    googleMapsUrl: 'https://maps.google.com/?q=Mintal+Public+Park'
  },
  {
    id: 'tibungco-public-park',
    name: 'Tibungco Public Park & Baywalk',
    shortName: 'Tibungco Park',
    category: 'park',
    categoryLabel: 'Coastal Community Park',
    address: 'Davao-Agusan Highway, Tibungco, Davao City',
    area: 'Tibungco / Bunawan',
    lat: 7.1865,
    lng: 125.6608,
    nearestLandmark: 'Tibungco Fish Port / Tibungco Public Market',
    recommendedJeeps: ['tibungco-sm', 'tibungco-castillo', 'panacan-sm'],
    dropOffPoints: ['Tibungco Baywalk Viewdeck'],
    googleMapsUrl: 'https://maps.google.com/?q=Tibungco+Park'
  },
  {
    id: 'gap-farming-resort-grounds',
    name: 'GAP Farming Resort Heritage Grounds',
    shortName: 'GAP Farming Grounds',
    category: 'park',
    categoryLabel: 'Agro-Cultural Heritage Park',
    address: 'Green Meadows, Ma-a, Davao City',
    area: 'Ma-a / Diversion',
    lat: 7.0862,
    lng: 125.5745,
    nearestLandmark: 'Diversion Road / Ma-a Slaughterhouse Crossing',
    recommendedJeeps: ['maa-cityhall', 'diversion-jeep'],
    dropOffPoints: ['GAP Farming Entrance'],
    googleMapsUrl: 'https://maps.google.com/?q=GAP+Farming+Resort+Davao'
  },
  {
    id: 'bone-collector-museum-park',
    name: "D' Bone Collector Museum Grounds & Bucana Walk",
    shortName: "D' Bone Grounds",
    category: 'park',
    categoryLabel: 'Natural History Grounds',
    address: 'San Pedro Extension, Bucana, Davao City',
    area: 'Bucana / Riverside',
    lat: 7.0594,
    lng: 125.6083,
    nearestLandmark: 'Bolton Bridge Riverside / Davao River Mouth',
    recommendedJeeps: ['matina-sanpedro', 'route-4'],
    dropOffPoints: ['San Pedro Ext Museum Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=D+Bone+Collector+Museum+Davao'
  },
  {
    id: 'times-beach-sunset-promenade',
    name: 'Times Beach Sunset Promenade (Ecoland)',
    shortName: 'Times Beach Walk',
    category: 'park',
    categoryLabel: 'Public Beach Promenade',
    address: 'Ecoland, Matina Aplaya, Davao City',
    area: 'Ecoland / Matina Aplaya',
    lat: 7.0423,
    lng: 125.5902,
    nearestLandmark: 'Ecoland Phase 7 / Coastal Road Junction',
    recommendedJeeps: ['matina-sanpedro', 'route-4', 'panacan-sm'],
    dropOffPoints: ['Times Beach Sea Wall'],
    googleMapsUrl: 'https://maps.google.com/?q=Times+Beach+Davao'
  },
  {
    id: 'marfori-heights-park',
    name: 'Marfori Heights Botanical Pocket Park',
    shortName: 'Marfori Pocket Park',
    category: 'park',
    categoryLabel: 'Residential Garden Greenway',
    address: 'Circumferential Road, Marfori Heights, Davao City',
    area: 'Marfori Heights',
    lat: 7.0811,
    lng: 125.6035,
    nearestLandmark: 'Brokenshire College / Circumferential Road',
    recommendedJeeps: ['marfori-cityhall', 'route-4'],
    dropOffPoints: ['Marfori Park Island'],
    googleMapsUrl: 'https://maps.google.com/?q=Marfori+Heights+Davao'
  },
  {
    id: 'dona-vicenta-buhangin-park',
    name: 'Doña Vicenta Park (Buhangin Eco-Park)',
    shortName: 'Doña Vicenta Park',
    category: 'park',
    categoryLabel: 'Urban Nature Greenway',
    address: 'J.P. Laurel Avenue / Bajada Boundary, Davao City',
    area: 'Bajada / Buhangin',
    lat: 7.0898,
    lng: 125.6115,
    nearestLandmark: 'Victoria Plaza / Bajada Flyover',
    recommendedJeeps: ['buhangin-sm', 'panacan-sm', 'sasa-cabaguio'],
    dropOffPoints: ['Doña Vicenta Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Dona+Vicenta+Park+Davao'
  },
  {
    id: 'st-jude-park-shrine',
    name: 'St. Jude Park & Shrine Courtyard',
    shortName: 'St. Jude Park',
    category: 'park',
    categoryLabel: 'Spiritual Courtyard Park',
    address: 'Malvar Street, Poblacion, Davao City',
    area: 'Poblacion',
    lat: 7.0782,
    lng: 125.6071,
    nearestLandmark: 'St. Jude Parish / Bangko Sentral ng Pilipinas',
    recommendedJeeps: ['route-4', 'route-2', 'matina-sanpedro'],
    dropOffPoints: ['Malvar Street St Jude Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=St+Jude+Parish+Davao'
  },
  {
    id: 'mabini-chinatown-walk',
    name: 'Mabini Park & Chinatown Walk',
    shortName: 'Chinatown Walk',
    category: 'park',
    categoryLabel: 'Chinatown Heritage Corridor',
    address: 'Monteverde Avenue / Mabini Street, Davao City',
    area: 'Chinatown / Santa Ana',
    lat: 7.0744,
    lng: 125.6190,
    nearestLandmark: 'Unity Arch / Long Hua Temple Corridor',
    recommendedJeeps: ['route-1', 'route-2', 'sasa-claveria'],
    dropOffPoints: ['Monteverde Chinatown Arch'],
    googleMapsUrl: 'https://maps.google.com/?q=Davao+Chinatown'
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. MAJOR TRANSIT HUBS & TERMINALS (8 Hubs)
// ─────────────────────────────────────────────────────────────────────────────
export const DAVAO_TRANSIT_HUBS: DavaoPlace[] = [
  {
    id: 'hub-ecoland-dcott',
    name: 'Ecoland Bus Terminal (DCOTT)',
    shortName: 'DCOTT Ecoland',
    category: 'hub',
    categoryLabel: 'Overland Bus Terminal',
    address: 'Candelaria Street, Ecoland, Matina, Davao City',
    area: 'Ecoland / Matina',
    lat: 7.0558,
    lng: 125.6015,
    nearestLandmark: 'SM City Davao / Ecoland Police Station',
    recommendedJeeps: ['panacan-sm', 'sasa-sm', 'tibungco-sm', 'matina-sanpedro', 'route-4'],
    dropOffPoints: ['DCOTT Passenger Arrival Bay', 'Candelaria Street Gate'],
    googleMapsUrl: 'https://maps.google.com/?q=Davao+City+Overland+Transport+Terminal',
    isPopular: true
  },
  {
    id: 'hub-toril-market',
    name: 'Toril Public Market Transit Hub',
    shortName: 'Toril Market Hub',
    category: 'hub',
    categoryLabel: 'Southern Terminal Hub',
    address: 'Saavedra Street, Toril, Davao City',
    area: 'Toril Central',
    lat: 7.0185,
    lng: 125.5034,
    nearestLandmark: 'GMall Toril / Toril Police Station',
    recommendedJeeps: ['toril-cityhall', 'toril-claveria', 'toril-agdao', 'sirawan-toril'],
    dropOffPoints: ['Toril Market PUJ Terminal Bay'],
    googleMapsUrl: 'https://maps.google.com/?q=Toril+Public+Market',
    isPopular: true
  },
  {
    id: 'hub-bunawan',
    name: 'Bunawan Highway Transit Terminal',
    shortName: 'Bunawan Hub',
    category: 'hub',
    categoryLabel: 'Northern Highway Hub',
    address: 'Davao-Agusan Highway, Bunawan, Davao City',
    area: 'Bunawan',
    lat: 7.2275,
    lng: 125.6486,
    nearestLandmark: 'Bunawan Overpass / Bunawan Police Station',
    recommendedJeeps: ['bunawan-cityhall', 'tibungco-sm', 'panacan-sm'],
    dropOffPoints: ['Bunawan Overpass PUJ Stop'],
    googleMapsUrl: 'https://maps.google.com/?q=Bunawan+Davao+City',
    isPopular: true
  },
  {
    id: 'hub-calinan-bus',
    name: 'Calinan Bus & PUJ Terminal',
    shortName: 'Calinan Hub',
    category: 'hub',
    categoryLabel: 'Western District Terminal',
    address: 'Davao-Bukidnon Highway, Calinan, Davao City',
    area: 'Calinan',
    lat: 7.1856,
    lng: 125.4568,
    nearestLandmark: 'Calinan Public Market / GMall Calinan',
    recommendedJeeps: ['calinan-cityhall', 'calinan-agdao', 'baguio-calinan'],
    dropOffPoints: ['Calinan Terminal Dispatch Area'],
    googleMapsUrl: 'https://maps.google.com/?q=Calinan+Bus+Terminal',
    isPopular: true
  },
  {
    id: 'hub-panacan-junction',
    name: 'Panacan Highway Junction Hub',
    shortName: 'Panacan Hub',
    category: 'hub',
    categoryLabel: 'Industrial Corridor Hub',
    address: 'Km 13, Davao-Agusan Highway, Panacan, Davao City',
    area: 'Panacan',
    lat: 7.1485,
    lng: 125.6534,
    nearestLandmark: 'Panacan Overpass / DPWH',
    recommendedJeeps: ['panacan-sm', 'panacan-claveria', 'sasa-cabaguio', 'tibungco-sm'],
    dropOffPoints: ['Panacan Overpass Loading Bay'],
    googleMapsUrl: 'https://maps.google.com/?q=Panacan+Davao+City',
    isPopular: true
  },
  {
    id: 'hub-bangkal-overpass',
    name: 'Bangkal Overpass Transit Hub',
    shortName: 'Bangkal Hub',
    category: 'hub',
    categoryLabel: 'South Corridor Hub',
    address: 'McArthur Highway corner Central Park, Bangkal, Davao City',
    area: 'Bangkal / Talomo',
    lat: 7.0583,
    lng: 125.5678,
    nearestLandmark: 'Bangkal Overpass / Central Park Entrance',
    recommendedJeeps: ['bangkal-cityhall', 'matina-sanpedro', 'toril-cityhall', 'calinan-cityhall'],
    dropOffPoints: ['Bangkal Overpass Footbridge Bay'],
    googleMapsUrl: 'https://maps.google.com/?q=Bangkal+Davao+City',
    isPopular: true
  },
  {
    id: 'hub-matina-crossing',
    name: 'Matina Crossing Commercial Hub',
    shortName: 'Matina Crossing Hub',
    category: 'hub',
    categoryLabel: 'Central South Interchange',
    address: 'McArthur Highway corner Maa Road, Matina, Davao City',
    area: 'Matina Crossing',
    lat: 7.0542,
    lng: 125.5861,
    nearestLandmark: 'Matina Centerpoint / Matina Gallera',
    recommendedJeeps: ['matina-sanpedro', 'toril-cityhall', 'bangkal-cityhall', 'maa-cityhall', 'route-4'],
    dropOffPoints: ['Matina Crossing Flyover Stop'],
    googleMapsUrl: 'https://maps.google.com/?q=Matina+Crossing+Davao',
    isPopular: true
  },
  {
    id: 'hub-agdao-market',
    name: 'Agdao Public Market & Terminal',
    shortName: 'Agdao Market Hub',
    category: 'hub',
    categoryLabel: 'East Urban Terminal',
    address: 'Lapu-Lapu Street, Agdao, Davao City',
    area: 'Agdao District',
    lat: 7.0858,
    lng: 125.6264,
    nearestLandmark: 'Agdao Public Market / San Antonio de Padua Parish',
    recommendedJeeps: ['agdao-claveria', 'agdao-sanpedro', 'sasa-claveria', 'panacan-sm'],
    dropOffPoints: ['Agdao Market PUJ Loading Zone'],
    googleMapsUrl: 'https://maps.google.com/?q=Agdao+Public+Market',
    isPopular: true
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. VERIFIED 54 DAVAO CAMPUSES (Converted into unified DavaoPlace format)
// ─────────────────────────────────────────────────────────────────────────────
export const DAVAO_SCHOOL_PLACES: DavaoPlace[] = DAVAO_CAMPUSES.map((c) => ({
  id: c.id,
  name: c.name,
  shortName: c.shortName,
  category: 'school',
  categoryLabel: c.type || 'University / College',
  address: c.address,
  area: c.area || 'Davao City',
  lat: c.lat,
  lng: c.lng,
  nearestLandmark: c.nearestLandmark,
  recommendedJeeps: c.recommendedJeeps,
  dropOffPoints: c.dropOffPoints,
  googleMapsUrl: c.googleMapsUrl,
  isPopular: ['addu-jacinto', 'usep-obrero', 'um-matina', 'uic-bonifacio', 'davao-doctors-college', 'spc-guzman'].includes(c.id)
}));

export const DAVAO_POLICE_PLACES: DavaoPlace[] = DAVAO_POLICE_LOCATIONS.map((p) => ({
  id: p.id,
  name: p.name,
  shortName: p.stationCode || p.name,
  category: 'police',
  categoryLabel: p.typeLabel,
  address: p.address,
  area: p.area,
  lat: p.lat,
  lng: p.lng,
  nearestLandmark: p.nearestLandmark,
  recommendedJeeps: p.recommendedJeeps || [],
  dropOffPoints: [p.name, p.nearestLandmark],
  googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(p.name)}+Davao+City`,
  isPopular: ['dcpo-hq', 'ps-1-sta-ana', 'ps-2-san-pedro', 'ps-3-talomo', 'ps-15-ecoland'].includes(p.id)
}));

export const DAVAO_HOSPITAL_PLACES: DavaoPlace[] = DAVAO_HOSPITAL_LOCATIONS.map((h) => ({
  id: h.id,
  name: h.name,
  shortName: h.stationCode || h.name,
  category: 'hospital',
  categoryLabel: h.typeLabel,
  address: h.address,
  area: h.area,
  lat: h.lat,
  lng: h.lng,
  nearestLandmark: h.nearestLandmark,
  recommendedJeeps: h.recommendedJeeps || [],
  dropOffPoints: [h.name, h.nearestLandmark],
  googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(h.name)}+Davao+City`,
  isPopular: Boolean(h.isApex)
}));

// ─────────────────────────────────────────────────────────────────────────────
// 5. UNIFIED DAVAO PLACES CATALOG (EXHAUSTIVE CITY-WIDE POIS & EMERGENCY SITES)
// ─────────────────────────────────────────────────────────────────────────────
export const DAVAO_PLACES: DavaoPlace[] = [
  ...DAVAO_MALLS,
  ...DAVAO_PARKS,
  ...DAVAO_TRANSIT_HUBS,
  ...DAVAO_SCHOOL_PLACES,
  ...DAVAO_POLICE_PLACES,
  ...DAVAO_HOSPITAL_PLACES
];

/**
 * Fast search index helper across all Davao places
 */
export function searchDavaoPlaces(
  query: string, 
  categoryFilter?: DavaoPlaceCategory | 'all',
  limit: number = 30
): DavaoPlace[] {
  const q = query.trim().toLowerCase();
  
  return DAVAO_PLACES.filter(place => {
    if (categoryFilter && categoryFilter !== 'all' && place.category !== categoryFilter) {
      return false;
    }
    if (!q) return true;
    
    return (
      place.name.toLowerCase().includes(q) ||
      place.shortName.toLowerCase().includes(q) ||
      place.address.toLowerCase().includes(q) ||
      place.area.toLowerCase().includes(q) ||
      place.nearestLandmark.toLowerCase().includes(q) ||
      place.categoryLabel.toLowerCase().includes(q)
    );
  }).slice(0, limit);
}
