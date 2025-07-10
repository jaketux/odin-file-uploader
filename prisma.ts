const bcrypt = require("bcryptjs");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createUser(email, name, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
      folders: {
        create: {
          name: "Test folder",
          files: {
            create: {
              filename: "testfile",
              fileSize: 1123324242,
              fileLink: "johnson.html",
            },
          },
        },
      },
      name,
      firstname: "Johnson",
      lastname: "Test",
    },
  });
  return user;
}

async function main() {}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

module.exports = prisma;
