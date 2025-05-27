import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        preferredPersonas: JSON.stringify(['system1', 'system2', 'moderator', 'devilsAdvocate']),
        theme: 'dark',
        // Store hashed password in a separate field (we'll need to add this to schema)
        // For now, we'll store it as a custom field
      },
    });

    // Store password hash separately (in a real app, you'd add a password field to the User model)
    // For this demo, we'll use a simple approach
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS user_passwords (
        userId TEXT PRIMARY KEY,
        passwordHash TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
      )
    `;

    await prisma.$executeRaw`
      INSERT OR REPLACE INTO user_passwords (userId, passwordHash) 
      VALUES (${user.id}, ${hashedPassword})
    `;

    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create user account' },
      { status: 500 }
    );
  }
} 