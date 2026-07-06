import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  const adminPassword = await bcrypt.hash('admin123', 12);

  await prisma.user.create({
    data: {
      email: 'admin@mediaextract.com',
      passwordHash: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });

  await prisma.user.create({
    data: {
      email: 'user@mediaextract.com',
      passwordHash: await bcrypt.hash('user1234', 12),
      name: 'Test User',
      role: 'USER',
    },
  });

  await prisma.systemSetting.create({
    data: {
      key: 'max_file_size',
      value: JSON.stringify(2147483648),
    },
  });

  await prisma.systemSetting.create({
    data: {
      key: 'supported_formats',
      value: JSON.stringify(['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v', 'mpeg', 'ts', '3gp']),
    },
  });

  console.log('Seed data created');
  console.log('Admin: admin@mediaextract.com / admin123');
  console.log('User: user@mediaextract.com / user1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
