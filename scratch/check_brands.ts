import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const brands = await prisma.brand.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      socialLinks: true,
      websiteUrl: true
    }
  });
  console.log(JSON.stringify(brands, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
 