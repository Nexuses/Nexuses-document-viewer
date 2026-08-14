import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getAdminByEmail } from './db';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createSession(email: string) {
  const cookieStore = await cookies();
  cookieStore.set('admin-session', email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin-session');
  return session?.value || null;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('admin-session');
}

export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const admin = await getAdminByEmail(email);
  if (!admin) {
    return { success: false, error: 'Invalid email or password' };
  }

  const isValid = await verifyPassword(password, admin.password);
  if (!isValid) {
    return { success: false, error: 'Invalid email or password' };
  }

  await createSession(email);
  return { success: true };
}

