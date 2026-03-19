import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // Fetch all users, selecting only id and email fields
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
      },
      orderBy: {
        email: "asc",
      },
    });

    // Output CSV-style header
    console.log("id,email");

    // Output each user as CSV row
    for (const user of users) {
      console.log(`${user.id},${user.email}`);
    }

    // Also output a summary
    console.error(`\nTotal users: ${users.length}`);
  } catch (error) {
    console.error("Error fetching users:", error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

