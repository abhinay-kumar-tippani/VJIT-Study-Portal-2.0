export interface Subject {
  id: string;
  label: string;
  short: string;
  driveFolder: string;
  youtube?: { title: string; url: string; }[];
}

export const ACTIVE_SEM = 4;

export const SEM_LABELS: Record<number, string> = {
  1: '1st Sem', 2: '2nd Sem', 3: '3rd Sem', 4: '4th Sem',
  5: '5th Sem', 6: '6th Sem', 7: '7th Sem', 8: '8th Sem',
};

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
