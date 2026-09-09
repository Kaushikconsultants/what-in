import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@company.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('Database seeded successfully.');
  console.log('Super Admin Login - Email: admin@company.com | Password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
