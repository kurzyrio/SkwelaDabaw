import { EmergencyContact } from '../types';

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'davao-911',
    name: 'Davao City Central 911 (All Emergencies)',
    agency: 'Central 911 Davao City',
    phoneNumber: '911',
    altPhone: '(082) 295-3769',
    category: 'davao_911',
    description: 'Police, Medical, Fire, Search & Rescue for entire Davao City. Free call from any phone.',
    isQuickDial: true
  },
  {
    id: 'cdrrmo-davao',
    name: 'Davao City Disaster Risk Reduction & Management (CDRRMO)',
    agency: 'City Government of Davao',
    phoneNumber: '(082) 295-3769',
    altPhone: '(082) 227-2489',
    category: 'davao_911',
    description: 'Flood advisories, earthquake response, typhoon monitoring, and school suspension operations.',
    isQuickDial: true
  },
  {
    id: 'dcpo-police',
    name: 'Davao City Police Office (DCPO Headquarters)',
    agency: 'Philippine National Police - Region 11',
    phoneNumber: '(082) 224-1313',
    altPhone: '0998 598 7054',
    category: 'police',
    description: 'Camp Captain Domingo E. Leonor, San Pedro St, Davao City.',
    isQuickDial: true
  },
  {
    id: 'police-san-pedro',
    name: 'San Pedro Police Station (PS2 - Downtown)',
    agency: 'DCPO',
    phoneNumber: '(082) 226-4444',
    category: 'police',
    description: 'Coverage: AdDU Jacinto, UM Bolton, UIC Bonifacio, DDC, Aldevinco, Roxas Night Market.',
    isQuickDial: false
  },
  {
    id: 'police-talomo',
    name: 'Talomo Police Station (PS3 - Matina/Toril)',
    agency: 'DCPO',
    phoneNumber: '(082) 297-2555',
    category: 'police',
    description: 'Coverage: AdDU Matina, UM Matina, MCM Mapúa, Matina Crossing, Bangkal, Puan.',
    isQuickDial: false
  },
  {
    id: 'police-sta-ana',
    name: 'Sta. Ana Police Station (PS1 - Obrero/Agdao)',
    agency: 'DCPO',
    phoneNumber: '(082) 226-4422',
    category: 'police',
    description: 'Coverage: USEP Obrero, San Pedro College (SPC), HCDC, GMall Bajada, Agdao.',
    isQuickDial: false
  },
  {
    id: 'spmc-hospital',
    name: 'Southern Philippines Medical Center (SPMC Emergency)',
    agency: 'Department of Health Hospital',
    phoneNumber: '(082) 227-2731',
    altPhone: '(082) 221-7029',
    category: 'medical',
    description: 'Main tertiary public hospital & Level 3 trauma center in Davao City. Located in Bajada.',
    isQuickDial: true
  },
  {
    id: 'ddh-hospital',
    name: 'Davao Doctors Hospital Emergency Room',
    agency: 'Private Hospital',
    phoneNumber: '(082) 222-8000',
    altPhone: '(082) 221-2101',
    category: 'medical',
    description: 'Gen. Malvar St / Quirino Ave. Adjacent to Davao Doctors College.',
    isQuickDial: false
  },
  {
    id: 'red-cross-davao',
    name: 'Philippine Red Cross - Davao City Chapter',
    agency: 'Philippine Red Cross',
    phoneNumber: '(082) 227-3952',
    altPhone: '143',
    category: 'medical',
    description: 'Blood bank, first aid dispatch, student ambulance emergency assistance.',
    isQuickDial: true
  },
  {
    id: 'dlpc-emergency',
    name: 'Davao Light & Power Co. (DLPC 24/7 Power Desk)',
    agency: 'Davao Light',
    phoneNumber: '(082) 229-3572',
    category: 'national',
    description: 'Report power outages, downed lines, sparking transformers near student housing/campuses.',
    isQuickDial: false
  },
  {
    id: 'dcwd-water',
    name: 'Davao City Water District (DCWD 24/7 Call Center)',
    agency: 'DCWD',
    phoneNumber: '(082) 235-3293',
    category: 'national',
    description: 'Emergency water interruption advisory and water leak reports.',
    isQuickDial: false
  }
];
