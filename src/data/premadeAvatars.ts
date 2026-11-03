export interface PremadeAvatar {
  id: string;
  name: string;
  category: 'davao' | 'academic' | 'creative' | 'tech';
  tag: string;
  url: string;
}

export const PREMADE_AVATARS: PremadeAvatar[] = [
  // Davao Cultural & Local Mascot Vibes
  {
    id: 'davao-eagle-scholar',
    name: 'Philippine Eagle Scholar',
    category: 'davao',
    tag: '🦅 Malakas & Smart',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'durian-enthusiast',
    name: 'Durian King Estudiyante',
    category: 'davao',
    tag: '👑 Davao Icon',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'kadayawan-warrior',
    name: 'Kadayawan Cultural Lead',
    category: 'davao',
    tag: '🌺 Festival Spirit',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'samal-commuter',
    name: 'Samal Island Commuter',
    category: 'davao',
    tag: '🌊 Island Breeze',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
  },

  // Academic & Courses
  {
    id: 'med-nursing-student',
    name: 'Healthcare & Nursing Hero',
    category: 'academic',
    tag: '🩺 Stethoscope Ready',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'engineering-hard-hat',
    name: 'Civil & Comp Engineering',
    category: 'academic',
    tag: '📐 Builder & Solver',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'law-debater',
    name: 'Law & PolSci Advocate',
    category: 'academic',
    tag: '⚖️ Case Law Master',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'accountancy-cpa',
    name: 'Accountancy & Finance',
    category: 'academic',
    tag: '📊 Balance Sheet Pro',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80'
  },

  // Tech & Innovation
  {
    id: 'code-hacker',
    name: 'CS / IT Software Dev',
    category: 'tech',
    tag: '💻 Terminal & Algorithms',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'game-dev-nerd',
    name: 'AI & Multimedia Coder',
    category: 'tech',
    tag: '🎮 3D & Shaders',
    url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=200&auto=format&fit=crop&q=80'
  },

  // Creative & Lifestyle
  {
    id: 'coffee-study-grinder',
    name: 'Torres Cafe Study Grinder',
    category: 'creative',
    tag: '☕ Espresso Fueled',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'arts-creative-director',
    name: 'Fine Arts & Architecture',
    category: 'creative',
    tag: '🎨 Sketch & Canvas',
    url: 'https://images.unsplash.com/photo-1534751516642-a171edd25218?w=200&auto=format&fit=crop&q=80'
  }
];
