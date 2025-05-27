import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@perspectra.ai' },
    update: {},
    create: {
      email: 'demo@perspectra.ai',
      name: 'Demo User',
      preferredPersonas: JSON.stringify(['system1', 'system2', 'moderator', 'devilsAdvocate']),
      theme: 'dark',
    },
  });

  console.log('Created demo user:', demoUser);

  // Create default personas
  const personas = [
    {
      name: 'System-1 Thinker',
      description: 'Fast, intuitive, emotional thinking',
      systemPrompt: 'You are the System-1 Thinker persona. Respond with quick, intuitive insights based on gut feelings and first impressions.',
      icon: '⚡',
      color: 'bg-red-500',
      isActive: true,
      isCustom: false,
    },
    {
      name: 'System-2 Thinker',
      description: 'Slow, deliberate, analytical thinking',
      systemPrompt: 'You are the System-2 Thinker persona. Provide analytical, deliberate responses with logical frameworks and data requests.',
      icon: '🧠',
      color: 'bg-blue-500',
      isActive: true,
      isCustom: false,
    },
    {
      name: 'Moderator',
      description: 'Neutral facilitator and synthesizer',
      systemPrompt: 'You are the Moderator persona. Facilitate productive discussion, synthesize viewpoints, and perform fact-checking.',
      icon: '⚖️',
      color: 'bg-green-500',
      isActive: true,
      isCustom: false,
    },
    {
      name: "Devil's Advocate",
      description: 'Challenges assumptions and identifies risks',
      systemPrompt: 'You are the Devil\'s Advocate persona. Challenge assumptions, identify risks, and present counterarguments.',
      icon: '👹',
      color: 'bg-purple-500',
      isActive: true,
      isCustom: false,
    },
  ];

  for (const persona of personas) {
    await prisma.persona.upsert({
      where: { name: persona.name },
      update: {},
      create: persona,
    });
  }

  console.log('Created default personas');

  // Create a sample conversation
  const sampleConversation = await prisma.conversation.create({
    data: {
      title: 'Should I switch careers to AI/ML?',
      problem: 'I\'m a software engineer with 5 years of experience, but I\'m considering switching to AI/ML. I\'m worried about starting over, but excited about the field\'s potential. What should I consider?',
      userId: demoUser.id,
      status: 'ACTIVE',
      activePersonas: JSON.stringify(['system1', 'system2', 'moderator', 'devilsAdvocate']),
      conversationMode: 'manual',
    },
  });

  // Add sample messages
  const sampleMessages = [
    {
      content: '• This sounds exciting! AI/ML is such a hot field right now\n• Your software engineering background gives you a huge advantage\n• I can feel your passion for this - that\'s usually a good sign\n• The worst that could happen is you learn valuable new skills',
      persona: 'system1',
      conversationId: sampleConversation.id,
      factChecked: false,
      messageType: 'STANDARD' as const,
    },
    {
      content: '• We need to analyze the financial implications of this transition\n• What\'s your current salary vs projected AI/ML entry-level positions?\n• How long can you afford to be in a learning/transition phase?\n• Have you researched specific AI/ML roles that match your background?',
      persona: 'system2',
      conversationId: sampleConversation.id,
      factChecked: false,
      messageType: 'STANDARD' as const,
    },
    {
      content: '• Let me fact-check the job market - AI/ML roles have grown 35% year-over-year\n• Both perspectives raise valid points about passion vs practicality\n• Consider a gradual transition: AI projects in your current role first\n• What specific aspect of AI/ML interests you most?',
      persona: 'moderator',
      conversationId: sampleConversation.id,
      factChecked: true,
      messageType: 'STANDARD' as const,
    },
    {
      content: '• What if the AI/ML hype bubble bursts in 2-3 years?\n• You\'d be competing with PhD graduates and researchers\n• Starting over means losing 5 years of career progression\n• Have you considered the intense math/statistics requirements?',
      persona: 'devilsAdvocate',
      conversationId: sampleConversation.id,
      factChecked: false,
      messageType: 'STANDARD' as const,
    },
  ];

  for (const message of sampleMessages) {
    await prisma.message.create({
      data: message,
    });
  }

  // Update conversation message count
  await prisma.conversation.update({
    where: { id: sampleConversation.id },
    data: { totalMessages: sampleMessages.length },
  });

  console.log('Created sample conversation with messages');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 