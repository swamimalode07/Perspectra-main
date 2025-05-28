import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// Type assertion to handle NextAuth import issue
const handler = (NextAuth as any)(authOptions);

export { handler as GET, handler as POST };