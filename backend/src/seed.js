const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // 创建默认管理员
  const adminPwd = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: adminPwd, name: '管理员', role: 'ADMIN' }
  })

  // 默认分类
  const categories = ['家常菜', '汤类', '主食', '小吃', '凉菜']
  for (let i = 0; i < categories.length; i++) {
    await prisma.category.upsert({
      where: { name: categories[i] },
      update: {},
      create: { name: categories[i], sort: i }
    })
  }

  console.log('初始化数据完成！管理员账号: admin / admin123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
