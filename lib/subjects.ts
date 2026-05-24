export interface Subject {
  id: string;
  label: string;
  short: string;
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
      { id: 'DM',        label: 'Discrete Mathematics',                  short: 'DM'     },
      { id: 'ATCD',      label: 'Automata Theory & Compiler Design',     short: 'ATCD'   },
      { id: 'DBMS',      label: 'Database Management Systems',           short: 'DBMS'   },
      { id: 'IAI',       label: 'Introduction to Artificial Intelligence', short: 'IAI'  },
      { id: 'OOPs-Java', label: 'OOPs through Java',                     short: 'JAVA'   },
      { id: 'PC',        label: 'Professional Communication',            short: 'PC'     },
    ],
    lab: [
      { id: 'DBMS-Lab',      label: 'DBMS Lab',             short: 'DBMS Lab'  },
      { id: 'PROLOG-Lab',    label: 'PROLOG Lab',            short: 'Prolog'    },
      { id: 'OOPs-Java-Lab', label: 'OOPs through Java Lab', short: 'Java Lab'  },
    ],
  },

  // ── CSE ─────────────────────────────────────────────────────
  'CSE': {
    theory: [
      { id: 'DAA',       label: 'Design & Analysis of Algorithms',          short: 'DAA'  },
      { id: 'OS',        label: 'Operating Systems',                        short: 'OS'   },
      { id: 'OOPs-Java', label: 'OOPs through Java',                        short: 'JAVA' },
      { id: 'SE',        label: 'Software Engineering',                     short: 'SE'   },
      { id: 'IAI',       label: 'Introduction to Artificial Intelligence',  short: 'IAI'  },
      { id: 'PC',        label: 'Professional Communication',               short: 'PC'   },
    ],
    lab: [
      { id: 'OOPs-Java-Lab', label: 'OOPs through Java Lab',   short: 'Java Lab' },
      { id: 'Nodejs-Lab',    label: 'Node.js Lab',              short: 'Node Lab' },
      { id: 'OS-Lab',        label: 'Operating Systems Lab',    short: 'OS Lab'   },
    ],
  },

  // ── CSE-DS ──────────────────────────────────────────────────
  'CSE-DS': {
    theory: [
      { id: 'DAA',       label: 'Design & Analysis of Algorithms',          short: 'DAA'  },
      { id: 'OS',        label: 'Operating Systems',                        short: 'OS'   },
      { id: 'OOPs-Java', label: 'OOPs through Java',                        short: 'JAVA' },
      { id: 'SE',        label: 'Software Engineering',                     short: 'SE'   },
      { id: 'IAI',       label: 'Introduction to Artificial Intelligence',  short: 'IAI'  },
      { id: 'PC',        label: 'Professional Communication',               short: 'PC'   },
    ],
    lab: [
      { id: 'OOPs-Java-Lab', label: 'OOPs through Java Lab',   short: 'Java Lab' },
      { id: 'Nodejs-Lab',    label: 'Node.js Lab',              short: 'Node Lab' },
      { id: 'OS-Lab',        label: 'Operating Systems Lab',    short: 'OS Lab'   },
    ],
  },

  // ── IT ──────────────────────────────────────────────────────
  'IT': {
    theory: [
      { id: 'DAA',       label: 'Design & Analysis of Algorithms',          short: 'DAA'   },
      { id: 'OS',        label: 'Operating Systems',                        short: 'OS'    },
      { id: 'OOPs-Java', label: 'OOPs through Java',                        short: 'JAVA'  },
      { id: 'SE',        label: 'Software Engineering',                     short: 'SE'    },
      { id: 'FIoT',      label: 'Fundamentals of Internet of Things',       short: 'FIoT'  },
      { id: 'QMLR',      label: 'Quantitative Methods & Logical Reasoning', short: 'QMLR'  },
    ],
    lab: [
      { id: 'OOPs-Java-Lab', label: 'OOPs through Java Lab',   short: 'Java Lab' },
      { id: 'Nodejs-Lab',    label: 'Node.js Lab',              short: 'Node Lab' },
      { id: 'OS-Lab',        label: 'Operating Systems Lab',    short: 'OS Lab'   },
    ],
  },
};
