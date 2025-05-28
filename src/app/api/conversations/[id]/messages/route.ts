import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/conversations/[id]/messages - Get conversation messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!(session as any)?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: id,
        userId: (session as any).user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
      },
      orderBy: { timestamp: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[id]/messages - Add message to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!(session as any)?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: id,
        userId: (session as any).user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { content, persona, factChecked, messageType } = await request.json();

    if (!content || !persona) {
      return NextResponse.json(
        { error: 'Content and persona are required' },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        content,
        persona,
        conversationId: id,
        factChecked: factChecked || false,
        messageType: messageType || 'STANDARD',
      },
    });

    // Update conversation's totalMessages and updatedAt
    await prisma.conversation.update({
      where: { id: id },
      data: {
        totalMessages: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
} 