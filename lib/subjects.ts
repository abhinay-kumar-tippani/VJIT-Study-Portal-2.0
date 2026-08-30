export interface Subject {
  id: string;
  label: string;
  short: string;
  driveFolder: string;
  youtube?: { title: string; url: string; }[];
}

export const ACTIVE_SEM = 5;

export const SEM_LABELS: Record<number, string> = {
  1: '1st Sem', 2: '2nd Sem', 3: '3rd Sem', 4: '4th Sem',
  5: '5th Sem', 6: '6th Sem', 7: '7th Sem', 8: '8th Sem',
};

// ─── SEMESTER 5 SUBJECTS ──────────────────────────────────────────
export const SEM5_SUBJECTS: Record<string, { theory: Subject[]; lab?: Subject[] }> = {
  // ── CSE-AIML (Semester 5) ────────────────────────────────────────
  'CSE-AIML': {
    theory: [
      { id: 'CN',      label: 'Computer Networks',                   short: 'CN',     driveFolder: 'CN'      },
      { id: 'DAA',     label: 'Design and Analysis of Algorithms',   short: 'DAA',    driveFolder: 'DAA'     },
      { id: 'EML',     label: 'Essentials of Machine Learning',       short: 'EML',    driveFolder: 'EML'     },
      { id: 'GS',      label: 'Gender Sensitization',                short: 'GS',     driveFolder: 'GS'      },
      { id: 'PE-IDS',  label: 'Introduction to Data Science (PE)',    short: 'IDS',    driveFolder: 'PE-IDS'  },
      { id: 'PE-CS',   label: 'Cyber Security (PE)',                 short: 'CS',     driveFolder: 'PE-CS'   },
      { id: 'PE-OOAD', label: 'Object Oriented Analysis and Design (PE)', short: 'OOAD', driveFolder: 'PE-OOAD' },
      { id: 'OE-DM',   label: 'Disaster Management (OE)',            short: 'DM',     driveFolder: 'OE-DM'   },
      { id: 'OE-SE',   label: 'Sustainable Energy (OE)',             short: 'SE',     driveFolder: 'OE-SE'   },
      { id: 'OE-EOM',  label: 'Essentials of Marketing (OE)',        short: 'EoM',    driveFolder: 'OE-EOM'  },
    ],
    lab: [
      { id: 'Flutter-Lab', label: 'Flutter Lab',            short: 'Flutter', driveFolder: 'Flutter Lab' },
      { id: 'CN-Lab',      label: 'Computer Networks Lab',  short: 'CN Lab',  driveFolder: 'CN Lab'      },
      { id: 'ML-Lab',      label: 'Machine Learning Lab',   short: 'ML Lab',  driveFolder: 'ML Lab'      },
    ],
  },

  // ── CSE (Semester 5) ─────────────────────────────────────────────
  'CSE': {
    theory: [
      { id: 'CN', label: 'Computer Networks', short: 'CN', driveFolder: 'CN' },
      // More subjects will be added as drive folders are ready
    ],
  },

  // ── CSE-DS (Semester 5) ──────────────────────────────────────────
  'CSE-DS': {
    theory: [
      { id: 'CN', label: 'Computer Networks', short: 'CN', driveFolder: 'CN' },
      // More subjects will be added as drive folders are ready
    ],
  },

  // ── IT (Semester 5) ──────────────────────────────────────────────
  'IT': {
    theory: [
      { id: 'CN', label: 'Computer Networks', short: 'CN', driveFolder: 'CN' },
      // More subjects will be added as drive folders are ready
    ],
  },
};

// ─── SEMESTER 4 SUBJECTS ──────────────────────────────────────────
export const SEM4_SUBJECTS: Record<string, { theory: Subject[]; lab?: Subject[] }> = {
  // ── CSE-AIML ────────────────────────────────────────────────
  'CSE-AIML': {
    theory: [
      {
        id: 'DM',
        label: 'Discrete Mathematics',
        short: 'DM',
        driveFolder: 'DM',
        youtube: [
          {
            title: "Discrete Mathematics - Full Playlist",
            url: "https://youtube.com/playlist?list=PLXj4XH7LcRfBB-4hXp4XI84HOCWkaBD63"
          }
        ]
      },
      {
        id: 'ATCD',
        label: 'Automata Theory & Compiler Design',
        short: 'ATCD',
        driveFolder: 'AT&CD',
        youtube: [
          {
            title: "Automata Theory & Compiler Design - Full Playlist",
            url: "https://youtube.com/playlist?list=PLLOxZwkBK52AwK39Lh1Ny6xbwVPH7QDJg"
          }
        ]
      },
      {
        id: 'DBMS',
        label: 'Database Management Systems',
        short: 'DBMS',
        driveFolder: 'DBMS',
        youtube: [
          {
            title: "DBMS - Full Playlist",
            url: "https://youtube.com/playlist?list=PLqcuf9-ILPYAjSxpAssMGrWsTOE5-111e"
          }
        ]
      },
      { id: 'IAI',       label: 'Introduction to Artificial Intelligence', short: 'IAI',     driveFolder: 'IAI'       },
      {
        id: 'OOPs-Java',
        label: 'OOPs through Java',
        short: 'JAVA',
        driveFolder: 'JAVA',
        youtube: [
          {
            title: "Java OOPs - Full Playlist",
            url: "https://youtube.com/playlist?list=PLXj4XH7LcRfDlQklXu3Hrtru-bm2dJ9Df"
          }
        ]
      },
      { id: 'PC',        label: 'Professional Communication',            short: 'PC',        driveFolder: 'PC'        },
    ],
    lab: [
      { id: 'DBMS-Lab',      label: 'DBMS Lab',             short: 'DBMS Lab',  driveFolder: 'DBMS-Lab'      },
      { id: 'PROLOG-Lab',    label: 'PROLOG Lab',            short: 'Prolog',    driveFolder: 'PROLOG-Lab'    },
      { id: 'OOPs-Java-Lab', label: 'OOPs through Java Lab', short: 'Java Lab',  driveFolder: 'OOPs-Java-Lab' },
    ],
  },

  // ── CSE ─────────────────────────────────────────────────────
  'CSE': {
    theory: [
      { id: 'DAA',       label: 'Design & Analysis of Algorithms',          short: 'DAA',       driveFolder: 'DAA'       },
      { id: 'OS',        label: 'Operating Systems',                        short: 'OS',        driveFolder: 'OS'        },
      {
        id: 'OOPs-Java',
        label: 'OOPs through Java',
        short: 'JAVA',
        driveFolder: 'JAVA',
        youtube: [
          {
            title: "Java OOPs - Full Playlist",
            url: "https://youtube.com/playlist?list=PLXj4XH7LcRfDlQklXu3Hrtru-bm2dJ9Df"
          }
        ]
      },
      { id: 'SE',        label: 'Software Engineering',                     short: 'SE',        driveFolder: 'SE'        },
      { id: 'IAI',       label: 'Introduction to Artificial Intelligence',  short: 'IAI',       driveFolder: 'IAI'       },
      { id: 'PC',        label: 'Professional Communication',               short: 'PC',        driveFolder: 'PC'        },
    ],
    lab: [
      { id: 'OOPs-Java-Lab', label: 'OOPs through Java Lab',   short: 'Java Lab',  driveFolder: 'OOPs-Java-Lab' },
      { id: 'Nodejs-Lab',    label: 'Node.js Lab',              short: 'Node Lab',  driveFolder: 'Nodejs-Lab'    },
      { id: 'OS-Lab',        label: 'Operating Systems Lab',    short: 'OS Lab',    driveFolder: 'OS-Lab'        },
    ],
  },

  // ── CSE-DS ──────────────────────────────────────────────────
  'CSE-DS': {
    theory: [
      { id: 'DAA',       label: 'Design & Analysis of Algorithms',          short: 'DAA',       driveFolder: 'DAA'  },
      { id: 'OS',        label: 'Operating Systems',                        short: 'OS',        driveFolder: 'OS'   },
      {
        id: 'OOPs-Java',
        label: 'OOPs through Java',
        short: 'JAVA',
        driveFolder: 'JAVA',
        youtube: [
          {
            title: "Java OOPs - Full Playlist",
            url: "https://youtube.com/playlist?list=PLXj4XH7LcRfDlQklXu3Hrtru-bm2dJ9Df"
          }
        ]
      },
      { id: 'SE',        label: 'Software Engineering',                     short: 'SE',        driveFolder: 'SE'   },
      { id: 'IAI',       label: 'Introduction to Artificial Intelligence',  short: 'IAI',       driveFolder: 'IAI'  },
      { id: 'PC',        label: 'Professional Communication',               short: 'PC',        driveFolder: 'PC'   },
    ],
    lab: [
      { id: 'OOPs-Java-Lab', label: 'OOPs through Java Lab',   short: 'Java Lab',  driveFolder: 'OOPs-Java-Lab' },
      { id: 'Nodejs-Lab',    label: 'Node.js Lab',              short: 'Node Lab',  driveFolder: 'Nodejs-Lab'    },
      { id: 'OS-Lab',        label: 'Operating Systems Lab',    short: 'OS Lab',    driveFolder: 'OS-Lab'        },
    ],
  },

  // ── IT ──────────────────────────────────────────────────────
  'IT': {
    theory: [
      { id: 'DAA',       label: 'Design & Analysis of Algorithms',          short: 'DAA',       driveFolder: 'DAA'   },
      { id: 'OS',        label: 'Operating Systems',                        short: 'OS',        driveFolder: 'OS'    },
      {
        id: 'OOPs-Java',
        label: 'OOPs through Java',
        short: 'JAVA',
        driveFolder: 'JAVA',
        youtube: [
          {
            title: "Java OOPs - Full Playlist",
            url: "https://youtube.com/playlist?list=PLXj4XH7LcRfDlQklXu3Hrtru-bm2dJ9Df"
          }
        ]
      },
      { id: 'SE',        label: 'Software Engineering',                     short: 'SE',        driveFolder: 'SE'    },
      { id: 'FIoT',      label: 'Foundations of IoT',                       short: 'FIoT',      driveFolder: 'F IoT' },
      { id: 'QMLR',      label: 'Quantitative Methods & Linear Regression', short: 'QMLR',      driveFolder: 'QMLR'  },
    ],
    lab: [
      { id: 'OOPs-Java-Lab', label: 'OOPs through Java Lab',   short: 'Java Lab',  driveFolder: 'OOPs-Java-Lab' },
      { id: 'Nodejs-Lab',    label: 'Node.js Lab',              short: 'Node Lab',  driveFolder: 'Nodejs-Lab'    },
      { id: 'OS-Lab',        label: 'Operating Systems Lab',    short: 'OS Lab',    driveFolder: 'OS-Lab'        },
    ],
  },
};

export const ALL_SUBJECTS: Record<number, Record<string, { theory: Subject[]; lab?: Subject[] }>> = {
  4: SEM4_SUBJECTS,
  5: SEM5_SUBJECTS,
};

export function getBranchSubjects(branch: string, semester: number = ACTIVE_SEM): { theory: Subject[]; lab?: Subject[] } | undefined {
  return ALL_SUBJECTS[semester]?.[branch] ?? ALL_SUBJECTS[4]?.[branch];
}

/**
 * Returns all branch codes that share a given subjectId for the specified semester.
 * Used to enable cross-branch resource visibility for common subjects.
 */
export function getSharedBranches(subjectId: string, semester: number = ACTIVE_SEM): string[] {
  const configMap = ALL_SUBJECTS[semester] ?? ALL_SUBJECTS[4];
  if (!configMap) return [];

  const sharedBranches: string[] = [];
  for (const [branch, config] of Object.entries(configMap)) {
    const allSubjects = [...(config.theory || []), ...(config.lab || [])];
    if (allSubjects.some((s) => s.id === subjectId)) {
      sharedBranches.push(branch);
    }
  }
  return sharedBranches;
}
