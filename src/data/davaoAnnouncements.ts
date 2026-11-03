/**
 * Davao City Academic & Campus Announcements Dataset
 * Created by: Kurzyrio
 */

export interface DavaoAnnouncement {
  id: string;
  title: string;
  category: 'deped' | 'suspension' | 'campus' | 'scholarship' | 'holiday' | 'event' | string;
  source: string;
  sourceAvatar: string;
  targetCampus?: string;
  date: string;
  urgency: 'high' | 'normal' | 'info';
  summary: string;
  fullContent: string;
  tags: string[];
  imageData?: string;
  isPopup?: boolean;
  externalLink?: string;
  isPinned?: boolean;
}

// Clean initial announcements list (Official Public Davao Advisories only)
export const INITIAL_ANNOUNCEMENTS: DavaoAnnouncement[] = [
  {
    id: 'ann-official-deped-1',
    title: 'DepEd Order No. 037 s.2022: Davao Regional Suspension Guidelines',
    category: 'deped',
    source: 'DepEd Regional Office XI / Davao City Division',
    sourceAvatar: '🏛️',
    targetCampus: 'all',
    date: 'Official DepEd Policy',
    urgency: 'normal',
    summary: 'In-person and online classes in basic education are automatically suspended during Typhoon Signal 1+, Orange/Red Rainfall alerts, or Intensity 5+ earthquakes.',
    fullContent: 'Under DepEd Order No. 037 series of 2022, private schools and higher education institutions (CHED) in Davao City maintain localized autonomy but are strongly advised to align distance learning shifts during severe localized flooding along Matina, Bajada, and Talomo rivers.',
    tags: ['DepEd Region XI', 'DO 037 s.2022', 'Automatic Suspension'],
    isPinned: true
  },
  {
    id: 'ann-official-1',
    title: 'Davao City LGU Class Suspension & Weather Policy Reminder',
    category: 'suspension',
    source: 'City Government of Davao / CDRRMO',
    sourceAvatar: '🚨',
    targetCampus: 'all',
    date: 'Official City Guidelines',
    urgency: 'normal',
    summary: 'Under Executive Order No. 47, college and university classes follow localized automatic suspension during Orange/Red Rainfall alerts.',
    fullContent: 'College administrations in Davao City retain discretion to transition to online/asynchronous learning during heavy rains or localized flooding along MacArthur Highway and JP Laurel Avenue.',
    tags: ['City Guidelines', 'Weather Policy', 'All Campuses'],
    isPinned: true
  },
  {
    id: 'ann-official-2',
    title: 'Davao City EBSU College Educational Assistance Guidelines',
    category: 'scholarship',
    source: 'Educational Benefit System Unit (EBSU)',
    sourceAvatar: '🏛️',
    targetCampus: 'all',
    date: 'Official Assistance Notice',
    urgency: 'info',
    summary: 'Davao City college scholars may coordinate with their campus scholarship coordinator for certification and document submissions.',
    fullContent: 'Qualified students enrolled in recognized higher education institutions across Davao City may access city educational subsidies through the EBSU office at Almendras Gym.',
    tags: ['EBSU Davao', 'Financial Assistance', 'College Education']
  }
];
