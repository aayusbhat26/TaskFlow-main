const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const channelId = "cmqb2ceg90007zo4txr0mad6y"; 
    console.log("Fetching messages...");
    const messages = await prisma.chatMessage.findMany({
      where: { channelId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: { id: true, name: true, username: true },
            },
          },
        },
        replyTo: {
          include: {
            author: { select: { id: true, name: true, username: true } },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    console.log("Messages length:", messages.length);
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
