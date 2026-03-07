export const EXAM_TYPES = ["O/L", "A/L"] as const;

export const AL_STREAMS = [
  "Physical Science",
  "Biological Science",
  "Commerce",
  "Arts",
  "Technology",
] as const;

export const AL_STREAM_SUBJECTS: Record<string, string[]> = {
  "Physical Science": ["Combined Mathematics", "Physics", "Chemistry", "ICT"],
  "Biological Science": [
    "Biology",
    "Chemistry",
    "Physics",
    "Agricultural Science",
  ],
  Commerce: [
    "Accounting",
    "Business Studies",
    "Economics",
    "Business Statistics",
    "ICT",
  ],
  Arts: [
    "History",
    "Political Science",
    "Geography",
    "Logic",
    "Economics",
    "Sinhala",
    "English",
    "Tamil",
    "French",
    "Media Studies",
  ],
  Technology: [
    "Engineering Technology",
    "Bio Systems Technology",
    "ICT",
    "Agro Technology",
    "Science for Technology",
  ],
};

export const OL_SUBJECTS = [
  "Mathematics",
  "Sinhala",
  "English",
  "Science",
  "History",
  "Buddhism",
  "Geography",
  "Civics",
  "English Literature",
  "ICT",
];

export const GRADES = ["A", "B", "C", "S", "F"] as const;

export const LANGUAGES = ["Sinhala", "Tamil", "English"] as const;
