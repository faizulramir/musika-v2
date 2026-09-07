import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * No demo songs are seeded — the library starts empty.
 * Songs are added via the Admin panel (MP3 upload). Genres are created
 * on-demand when a song is uploaded (and a fallback set exists in the UI).
 */
async function main() {
  const count = await prisma.song.count();
  console.log(`Setup complete. ${count} songs in library (start empty, add via /admin).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
