import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/conversations - Get user's conversations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        messages: {
          take: 1,
          orderBy: { timestamp: 'desc' },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, problem, activePersonas } = await request.json();

    if (!title || !problem) {
      return NextResponse.json(
        { error: 'Title and problem are required' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.create({
      data: {
        title,
        problem,
        userId: session.user.id,
        activePersonas: JSON.stringify(activePersonas || ['system1', 'system2', 'moderator', 'devilsAdvocate']),
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
} 