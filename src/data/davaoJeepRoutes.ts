import { DavaoJeepRoute } from '../types';

/**
 * Authentic Davao City Jeepney Routes & LTFRB Fare Matrix
 * Curated for Davao College Students by Kurzyrio
 */
export const DAVAO_JEEP_ROUTES: DavaoJeepRoute[] = [
  {
    id: 'route-4',
    routeCode: 'ROUTE 4',
    routeName: 'Bangkal / Matina ➔ C.M. Recto (Claveria) ➔ Agdao',
    color: '#e11d48', // Crimson Red
    origin: 'Bangkal / Matina Crossing Terminal',
    destination: 'Agdao Public Market / Roxas Ave',
    campusesServed: ['addu-jacinto', 'addu-matina', 'um-matina', 'um-bolton', 'uic-bonifacio', 'ddc-davao', 'mmcm-davao'],
    landmarks: [
      'Bangkal Terminal',
      'Matina Crossing (McArthur Hwy)',
      'UM Matina Overpass',
      'AdDU Matina Frontage',
      'Bankerohan River Bridge',
      'Magallanes St (San Pedro Cathedral)',
      'C.M. Recto Ave (AdDU Jacinto Finster Gate)',
      'Aldevinco / Roxas Night Market',
      'Sta. Ana Ave (Holy Cross HCDC)',
      'Agdao Public Market'
    ],
    estimatedTravelTime: '25 - 40 mins',
    baseFareStudent: 12.00,
    regularBaseFare: 15.00,
    tags: ['Matina Corridor', 'High Frequency', 'Downtown Core', 'AdDU Direct'],
    directionsNotes: 'The primary commuter line connecting South Davao to Downtown. Drops right at AdDU Jacinto, AdDU Matina, UM Matina, and walking distance to UM Bolton & DDC.',
    peakHours: '6:30 AM - 8:30 AM (Inbound Downtown), 4:30 PM - 7:30 PM (Outbound Matina/Bangkal)'
  },
  {
    id: 'toril-claveria',
    routeCode: 'TORIL - CLAVERIA',
    routeName: 'Toril ➔ Matina Crossing ➔ Roxas Blvd ➔ Aldevinco',
    color: '#ea580c', // Bright Orange
    origin: 'Toril Public Market / Gaisano Grand Toril',
    destination: 'Roxas Ave / C.M. Recto (AdDU Jacinto)',
    campusesServed: ['addu-jacinto', 'addu-matina', 'um-matina', 'ddc-davao', 'uic-bonifacio'],
    landmarks: [
      'Toril District Market',
      'Puan Junction',
      'Ulas Crossing',
      'Bangkal Central',
      'Matina Gallera / Crossing',
      'Bankerohan Flyover',
      'Poblacion District',
      'Aldevinco Shopping Center',
      'Roxas Night Market Entrance',
      'AdDU Jacinto (Post Office Gate)'
    ],
    estimatedTravelTime: '40 - 55 mins',
    baseFareStudent: 12.00,
    regularBaseFare: 15.00,
    tags: ['South Davao', 'Toril Direct', 'Express Commute'],
    directionsNotes: 'Major transit for Toril & Puan students heading straight to downtown colleges without needing multiple transfers.',
    peakHours: '6:00 AM - 8:00 AM, 5:00 PM - 8:00 PM'
  },
  {
    id: 'mintal-roxas',
    routeCode: 'MINTAL - ROXAS',
    routeName: 'UP Mindanao / Mintal ➔ Bangkal ➔ Bankerohan ➔ Roxas',
    color: '#059669', // Emerald Green
    origin: 'Mintal Public Market / Tugbok Terminal',
    destination: 'Roxas Ave / C.M. Recto Downtown',
    campusesServed: ['upmin-mintal', 'addu-jacinto', 'um-matina', 'uic-bonifacio'],
    landmarks: [
      'UP Mindanao Junction',
      'Mintal Public Market',
      'Green Meadows / Catalunan Grande Junction',
      'Ulas Junction',
      'Bangkal Crossing',
      'UM Matina',
      'Bankerohan Market',
      'Roxas Ave (Ateneo Gate)'
    ],
    estimatedTravelTime: '35 - 50 mins',
    baseFareStudent: 12.00,
    regularBaseFare: 15.00,
    tags: ['UPMin Gateway', 'Tugbok-Mintal', 'Southwest Line'],
    directionsNotes: 'Serves UP Mindanao students, Mintal residents, and western Davao college commuters.',
    peakHours: '6:30 AM - 8:30 AM, 4:30 PM - 7:00 PM'
  },
  {
    id: 'matina-sanpedro',
    routeCode: 'MATINA APLAYA - SAN PEDRO',
    routeName: 'Matina Aplaya ➔ UM Matina ➔ San Pedro Cathedral ➔ DDC',
    color: '#7c3aed', // Purple
    origin: 'Matina Aplaya Seawall / Shrine Hills',
    destination: 'San Pedro St (City Hall & San Pedro Hospital)',
    campusesServed: ['um-matina', 'um-bolton', 'ddc-davao', 'addu-jacinto'],
    landmarks: [
      'Matina Aplaya Center',
      'Shanghai Beach Road',
      'Matina Gallera',
      'UM Matina (Main Gate)',
      'Sandawa Crossing',
      'Bankerohan Bridge',
      'Magallanes St',
      'San Pedro Cathedral',
      'Davao Doctors College (DDC Gate)',
      'City Hall of Davao'
    ],
    estimatedTravelTime: '20 - 35 mins',
    baseFareStudent: 12.00,
    regularBaseFare: 15.00,
    tags: ['UM Direct', 'DDC Direct', 'Matina Coastal'],
    directionsNotes: 'Direct drop-off at UM Matina Gate and Davao Doctors College (DDC). Fastest route for Matina residential areas.',
    peakHours: '7:00 AM - 9:00 AM, 4:30 PM - 6:30 PM'
  },
  {
    id: 'route-2',
    routeCode: 'ROUTE 2',
    routeName: 'USEP Obrero ➔ G-Mall Bajada ➔ SPC ➔ Magsaysay ➔ San Pedro',
    color: '#2563eb', // Royal Blue
    origin: 'Bo. Obrero (USEP Main Gate)',
    destination: 'San Pedro St / City Hall / Boulevard',
    campusesServed: ['usep-obrero', 'spc-davao', 'hcdc-davao', 'addu-jacinto', 'uic-bonifacio'],
    landmarks: [
      'USEP Iñigo Gate (Bo. Obrero)',
      'Stella Maris Academy',
      'Gaisano Mall of Davao (Bajada Overpass)',
      'San Pedro Hospital / SPC Guzman Gate',
      'Guerrero St',
      'Sta. Ana Shrine (HCDC Gate)',
      'Magsaysay Park (Chinatown Arch)',
      'San Pedro Cathedral (City Hall)'
    ],
    estimatedTravelTime: '20 - 30 mins',
    baseFareStudent: 12.00,
    regularBaseFare: 15.00,
    tags: ['USEP Direct', 'SPC Direct', 'Downtown Loop'],
    directionsNotes: 'The definitive route for USEP Obrero and San Pedro College (SPC) students. Connects directly to G-Mall and downtown.',
    peakHours: '7:00 AM - 9:00 AM, 5:00 PM - 7:30 PM'
  },
  {
    id: 'buhangin-bajada',
    routeCode: 'BUHANGIN - BAJADA',
    routeName: 'Buhangin Milan ➔ SPMC ➔ Abreeza ➔ G-Mall ➔ C.M. Recto',
    color: '#d97706', // Amber Gold
    origin: 'Buhangin Milan / Cabantian Crossing',
    destination: 'C.M. Recto / Aldevinco / Roxas Ave',
    campusesServed: ['uic-bajada', 'usep-obrero', 'spc-davao', 'addu-jacinto', 'brokenshire-davao'],
    landmarks: [
      'Buhangin Milan Gym',
      'Buhangin Underpass',
      'SPMC Hospital',
      'Abreeza Ayala Mall',
      'Redemptorist Church (UIC Bajada)',
      'Victoria Plaza (NCCC VP)',
      'Gaisano Mall Bajada',
      'AdDU Jacinto (Finster Gate)'
    ],
    estimatedTravelTime: '25 - 40 mins',
    baseFareStudent: 12.00,
    regularBaseFare: 15.00,
    tags: ['North Davao', 'Bajada Commercial', 'Hospital Corridor'],
    directionsNotes: 'Main north artery serving Buhangin, Cabantian, and Mandug students commuting through the Bajada commercial corridor.',
    peakHours: '6:30 AM - 8:30 AM (Buhangin traffic), 5:00 PM - 7:30 PM'
  },
  {
    id: 'route-1',
    routeCode: 'ROUTE 1',
    routeName: 'Agdao ➔ Sta. Ana (HCDC) ➔ C.M. Recto ➔ Bolton (UM)',
    color: '#0891b2', // Cyan
    origin: 'Agdao Public Market / Lapu-Lapu St',
    destination: 'Bolton St (UM Bolton) / Quezon Blvd',
    campusesServed: ['hcdc-davao', 'um-bolton', 'uic-bonifacio', 'addu-jacinto'],
    landmarks: [
      'Agdao Public Market',
      'Lapu-Lapu St',
      'Sta. Ana Ave (Holy Cross HCDC Gate)',
      'R. Magsaysay Ave',
      'C.M. Recto Ave (AdDU Jacinto)',
      'San Pedro St',
      'Bolton St (UM Bolton Campus)',
      'Quezon Boulevard'
    ],
    estimatedTravelTime: '20 - 30 mins',
    baseFareStudent: 12.00,
    regularBaseFare: 15.00,
    tags: ['Agdao', 'Chinatown', 'Holy Cross Direct'],
    directionsNotes: 'Direct route for Holy Cross of Davao College (HCDC) and UM Bolton students coming from Agdao & East Davao.',
    peakHours: '6:30 AM - 8:00 AM, 4:30 PM - 6:30 PM'
  },
  {
    id: 'sasa-bolton',
    routeCode: 'SASA - R. CASTILLO - BOLTON',
    routeName: 'Sasa Wharf ➔ R. Castillo ➔ HCDC ➔ Magsaysay ➔ Bolton',
    color: '#4f46e5', // Indigo
    origin: 'Sasa Ferry Terminal / Km 10',
    destination: 'Bolton St (UM Bolton) / San Pedro',
    campusesServed: ['hcdc-davao', 'usep-obrero', 'um-bolton', 'addu-jacinto'],
    landmarks: [
      'Sasa Samal Ferry Terminal',
      'R. Castillo St (Agdao Bay)',
      'Uyanguren Chinatown',
      'Holy Cross of Davao College',
      'Magsaysay Park Arch',
      'C.M. Recto Ave',
      'UM Bolton Campus'
    ],
    estimatedTravelTime: '30 - 45 mins',
    baseFareStudent: 12.00,
    regularBaseFare: 15.00,
    tags: ['Coastal North', 'Samal Gateway', 'Sasa Line'],
    directionsNotes: 'Essential for students crossing from Island Garden City of Samal via Sasa barge, and commuters along R. Castillo.',
    peakHours: '6:00 AM - 8:00 AM, 5:00 PM - 7:00 PM'
  },
  {
    id: 'calinan-roxas',
    routeCode: 'CALINAN - BANKEROHAN EXPRESS',
    routeName: 'Calinan ➔ Catalunan Pequeño ➔ Matina ➔ Bankerohan',
    color: '#be123c', // Rose Dark
    origin: 'Calinan Public Market Terminal',
    destination: 'Bankerohan Market / Roxas Ave',
    campusesServed: ['addu-matina', 'um-matina', 'addu-jacinto', 'ddc-davao'],
    landmarks: [
      'Calinan Central Terminal',
      'Los Amigos / Mintal Bypass',
      'Catalunan Pequeño',
      'Matina Crossing',
      'Bankerohan Market',
      'Roxas Night Market'
    ],
    estimatedTravelTime: '50 - 75 mins',
    baseFareStudent: 12.00,
    regularBaseFare: 15.00,
    tags: ['Calinan Express', 'Far South-West', 'High Capacity'],
    directionsNotes: 'Long-distance trunk line connecting Calinan agricultural and residential districts directly to downtown university belt.',
    peakHours: '5:30 AM - 7:30 AM, 4:30 PM - 7:30 PM'
  },
  {
    id: 'tibungco-claveria',
    routeCode: 'TIBUNGCO - CLAVERIA',
    routeName: 'Tibungco ➔ Panacan ➔ Lanang ➔ Bajada ➔ C.M. Recto',
    color: '#0d9488', // Teal
    origin: 'Tibungco Public Market / Bunawan Boundary',
    destination: 'C.M. Recto / Roxas Ave / Aldevinco',
    campusesServed: ['usep-obrero', 'spc-davao', 'addu-jacinto', 'uic-bajada'],
    landmarks: [
      'Tibungco Terminal',
      'Panacan Junction',
      'Lanang SM Lanang Premier',
      'Carmelite Monastery (Bajada)',
      'SPMC Medical Center',
      'Abreeza Mall',
      'Gaisano Mall Bajada',
      'AdDU Jacinto Finster Gate'
    ],
    estimatedTravelTime: '45 - 60 mins',
    baseFareStudent: 12.00,
    regularBaseFare: 15.00,
    tags: ['Far North', 'Panacan-Lanang', 'Trunk Line'],
    directionsNotes: 'Heavy north trunk route serving Tibungco, Panacan, and Lanang students travelling down JP Laurel Ave.',
    peakHours: '6:00 AM - 8:00 AM, 5:00 PM - 7:30 PM'
  },
  {
    id: 'ecoland-sm',
    routeCode: 'ECOLAND - SM CITY SHUTTLE',
    routeName: 'Ecoland Terminal ➔ SM City Davao ➔ SJPCD ➔ City Hall',
    color: '#ca8a04', // Yellow Ochre
    origin: 'Davao City Overland Transport Terminal (DCOTT Ecoland)',
    destination: 'San Pedro St / City Hall / Quezon Blvd',
    campusesServed: ['sjpcd-ecoland', 'mmcm-davao', 'um-matina', 'addu-matina', 'um-bolton'],
    landmarks: [
      'DCOTT Overland Bus Terminal',
      'SM City Davao (Ecoland)',
      'St. John Paul II College (SJPCD Gate)',
      'Quimpo Boulevard',
      'Agripino Overpass',
      'San Pedro Cathedral (City Hall)'
    ],
    estimatedTravelTime: '15 - 25 mins',
    baseFareStudent: 12.00,
    regularBaseFare: 15.00,
    tags: ['Ecoland', 'DCOTT Terminal', 'SJPCD Direct', 'SM Ecoland'],
    directionsNotes: 'Direct connection for provincial bus arrivals at DCOTT, SJPCD students, and commuters around Quimpo Boulevard.',
    peakHours: '7:00 AM - 8:30 AM, 5:00 PM - 7:00 PM'
  }
];
