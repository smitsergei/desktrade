import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Создаем пользователя smit с паролем smit123
  const hashedPassword = await bcrypt.hash('smit123', 10)

  const user = await prisma.user.upsert({
    where: { username: 'smit' },
    update: {},
    create: {
      username: 'smit',
      password: hashedPassword,
      settings: {
        create: {
          deposit: 10000,
          riskPercentage: 2,
        }
      }
    },
    include: {
      settings: true
    }
  })

  console.log('Created user:', user)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })