const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const channelId = "cmqb2ceg90007zo4txr0mad6y"; // From user's screenshot
    const workspaceId = "cmq967o5q0005f23sy4gqod2h";

    const subscription = await prisma.subscription.findFirst({
      where: { workspaceId: workspaceId },
    });
    console.log("Subscription:", subscription);

    const messages = await prisma.chatMessage.findMany({
      where: { channelId },
      include: {
        author: { select: { id: true, name: true, username: true, image: true } },
        replyTo: { select: { id: true, content: true, author: { select: { name: true, username: true } } } },
        reactions: { select: { id: true, emoji: true, user: { select: { name: true, username: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });
    console.log("Messages length:", messages.length);
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
