// Demo song catalog. Titles/artists are used for gameplay; all audio is
// generated royalty-free (no copyrighted recordings).
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface SongSeed {
  title: string;
  artist: string;
  genre: string;
  year: number;
  difficulty: Difficulty;
}

export const GENRES = [
  'Pop',
  'Rock',
  'Hip-Hop',
  'K-Pop',
  'EDM',
  'Latin',
  'Jazz',
  'R&B',
  'Malay',
];

export const SONGS: SongSeed[] = [
  // Pop
  { title: 'Shut Up and Dance', artist: 'Walk the Moon', genre: 'Pop', year: 2014, difficulty: 'easy' },
  { title: 'Crazy', artist: 'Gnarls Barkley', genre: 'Pop', year: 2006, difficulty: 'easy' },
  { title: 'Happy', artist: 'Pharrell Williams', genre: 'Pop', year: 2013, difficulty: 'easy' },
  { title: 'Uptown Funk', artist: 'Bruno Mars', genre: 'Pop', year: 2014, difficulty: 'easy' },
  { title: 'Royals', artist: 'Lorde', genre: 'Pop', year: 2013, difficulty: 'medium' },
  { title: 'Blinding Lights', artist: 'The Weeknd', genre: 'Pop', year: 2019, difficulty: 'easy' },
  { title: 'Watermelon Sugar', artist: 'Harry Styles', genre: 'Pop', year: 2019, difficulty: 'medium' },
  { title: 'Levitating', artist: 'Dua Lipa', genre: 'Pop', year: 2020, difficulty: 'medium' },
  { title: 'Flowers', artist: 'Miley Cyrus', genre: 'Pop', year: 2023, difficulty: 'easy' },
  { title: 'About Damn Time', artist: 'Lizzo', genre: 'Pop', year: 2022, difficulty: 'medium' },
  { title: 'As It Was', artist: 'Harry Styles', genre: 'Pop', year: 2022, difficulty: 'easy' },
  { title: 'Anti-Hero', artist: 'Taylor Swift', genre: 'Pop', year: 2022, difficulty: 'medium' },

  // Rock
  { title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'Rock', year: 1975, difficulty: 'easy' },
  { title: 'Stairway to Heaven', artist: 'Led Zeppelin', genre: 'Rock', year: 1971, difficulty: 'easy' },
  { title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', genre: 'Rock', year: 1987, difficulty: 'easy' },
  { title: 'Back In Black', artist: 'AC/DC', genre: 'Rock', year: 1980, difficulty: 'easy' },
  { title: 'Wonderwall', artist: 'Oasis', genre: 'Rock', year: 1995, difficulty: 'easy' },
  { title: 'Hotel California', artist: 'Eagles', genre: 'Rock', year: 1976, difficulty: 'medium' },
  { title: 'Dream On', artist: 'Aerosmith', genre: 'Rock', year: 1973, difficulty: 'medium' },
  { title: 'Killing in the Name', artist: 'Rage Against the Machine', genre: 'Rock', year: 1992, difficulty: 'medium' },
  { title: 'Numb', artist: 'Linkin Park', genre: 'Rock', year: 2003, difficulty: 'easy' },
  { title: 'Mr. Brightside', artist: 'The Killers', genre: 'Rock', year: 2003, difficulty: 'medium' },
  { title: 'Under the Bridge', artist: 'Red Hot Chili Peppers', genre: 'Rock', year: 1991, difficulty: 'medium' },
  { title: 'Creep', artist: 'Radiohead', genre: 'Rock', year: 1992, difficulty: 'medium' },

  // Hip-Hop
  { title: 'Lose Yourself', artist: 'Eminem', genre: 'Hip-Hop', year: 2002, difficulty: 'easy' },
  { title: 'HUMBLE.', artist: 'Kendrick Lamar', genre: 'Hip-Hop', year: 2017, difficulty: 'medium' },
  { title: 'Godzilla', artist: 'Eminem', genre: 'Hip-Hop', year: 2020, difficulty: 'medium' },
  { title: 'SICKO MODE', artist: 'Travis Scott', genre: 'Hip-Hop', year: 2018, difficulty: 'medium' },
  { title: 'In Da Club', artist: '50 Cent', genre: 'Hip-Hop', year: 2003, difficulty: 'easy' },
  { title: 'Halo', artist: 'Young Thug', genre: 'Hip-Hop', year: 2015, difficulty: 'hard' },
  { title: 'Sicko Mode Remix', artist: 'Travis Scott', genre: 'Hip-Hop', year: 2018, difficulty: 'hard' },

  // K-Pop
  { title: 'Gangnam Style', artist: 'PSY', genre: 'K-Pop', year: 2012, difficulty: 'easy' },
  { title: 'Dynamite', artist: 'BTS', genre: 'K-Pop', year: 2020, difficulty: 'easy' },
  { title: 'How You Like That', artist: 'BLACKPINK', genre: 'K-Pop', year: 2020, difficulty: 'easy' },
  { title: 'Butter', artist: 'BTS', genre: 'K-Pop', year: 2021, difficulty: 'easy' },
  { title: 'Kill This Love', artist: 'BLACKPINK', genre: 'K-Pop', year: 2019, difficulty: 'medium' },
  { title: 'Super Shy', artist: 'NewJeans', genre: 'K-Pop', year: 2023, difficulty: 'medium' },
  { title: 'MAGIC', artist: 'Stray Kids', genre: 'K-Pop', year: 2023, difficulty: 'hard' },

  // EDM
  { title: 'Titanium', artist: 'David Guetta', genre: 'EDM', year: 2011, difficulty: 'easy' },
  { title: 'Wake Me Up', artist: 'Avicii', genre: 'EDM', year: 2013, difficulty: 'easy' },
  { title: 'Levels', artist: 'Avicii', genre: 'EDM', year: 2011, difficulty: 'easy' },
  { title: 'Clarity', artist: 'Zedd', genre: 'EDM', year: 2012, difficulty: 'medium' },
  { title: 'Animals', artist: 'Martin Garrix', genre: 'EDM', year: 2013, difficulty: 'medium' },
  { title: 'Don\'t You Worry Child', artist: 'Swedish House Mafia', genre: 'EDM', year: 2012, difficulty: 'medium' },
  { title: 'Lean On', artist: 'Major Lazer', genre: 'EDM', year: 2015, difficulty: 'easy' },

  // Latin
  { title: 'Despacito', artist: 'Luis Fonsi', genre: 'Latin', year: 2017, difficulty: 'easy' },
  { title: 'Mi Gente', artist: 'J Balvin', genre: 'Latin', year: 2017, difficulty: 'medium' },
  { title: 'Taki Taki', artist: 'DJ Snake', genre: 'Latin', year: 2018, difficulty: 'medium' },
  { title: 'Pepas', artist: 'Quevedo', genre: 'Latin', year: 2019, difficulty: 'medium' },
  { title: 'I Like It', artist: 'Cardi B', genre: 'Latin', year: 2018, difficulty: 'easy' },
  { title: 'La Bamba', artist: 'Ritchie Valens', genre: 'Latin', year: 1958, difficulty: 'easy' },

  // Jazz
  { title: 'Take Five', artist: 'The Dave Brubeck Quartet', genre: 'Jazz', year: 1959, difficulty: 'easy' },
  { title: 'So What', artist: 'Miles Davis', genre: 'Jazz', year: 1959, difficulty: 'medium' },
  { title: 'Feeling Good', artist: 'Nina Simone', genre: 'Jazz', year: 1965, difficulty: 'medium' },
  { title: 'Blue Bossa', artist: 'Joe Pass', genre: 'Jazz', year: 1979, difficulty: 'hard' },

  // R&B
  { title: 'Uptown Girl', artist: 'Seal', genre: 'R&B', year: 1993, difficulty: 'easy' },
  { title: 'No Scrubs', artist: 'TLC', genre: 'R&B', year: 1999, difficulty: 'easy' },
  { title: 'All I Want', artist: 'Kenny G', genre: 'R&B', year: 1992, difficulty: 'medium' },
  { title: 'Unwritten', artist: 'Natasha Bedingfield', genre: 'R&B', year: 2004, difficulty: 'easy' },
  { title: 'Say My Name', artist: 'Destiny\'s Child', genre: 'R&B', year: 1999, difficulty: 'medium' },

  // Malay
  { title: 'Cinta Dalam Diam', artist: 'Fauziah Latiff', genre: 'Malay', year: 1994, difficulty: 'easy' },
  { title: 'Sang Sapurina', artist: 'Lucky Ali', genre: 'Malay', year: 2003, difficulty: 'easy' },
  { title: 'Cinta Yang Palsu', artist: 'Siti Nurhaliza', genre: 'Malay', year: 2006, difficulty: 'medium' },
  { title: 'Kasih Putih', artist: 'Sudirman', genre: 'Malay', year: 2004, difficulty: 'medium' },
  { title: 'Akad', artist: 'Aizat Amdan', genre: 'Malay', year: 2015, difficulty: 'medium' },
];
