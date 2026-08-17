import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { getAdminByEmail, getProjectById, getProjectUserByUsername } from './db';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createSession(email: string) {
  const cookieStore = await cookies();
  cookieStore.delete('project-user-session');
  cookieStore.set('admin-session', email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
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

export type ProjectUserSession = {
  userId: string;
  username: string;
  name: string;
  email?: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  logoUrl?: string;
};

export type SmartLinkActor =
  | { role: 'master'; owner: string }
  | {
      role: 'project';
      owner: string;
      projectId: string;
      projectName: string;
      projectSlug: string;
      logoUrl?: string;
    };

export async function createProjectUserSession(session: ProjectUserSession) {
  const cookieStore = await cookies();
  cookieStore.delete('admin-session');
  cookieStore.set('project-user-session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getProjectUserSession(): Promise<ProjectUserSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get('project-user-session')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProjectUserSession;
  } catch {
    return null;
  }
}

export async function deleteProjectUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete('project-user-session');
}

export async function getSmartLinkActor(request?: { headers: Headers }): Promise<SmartLinkActor | null> {
  const cookieStore = await cookies();
  const master = cookieStore.get('admin-session')?.value || null;
  const projectUser = await getProjectUserSession();
  const workspace = cookieStore.get('workspace')?.value || '';
  const referer = request?.headers.get('referer') || '';
  const isPortal = workspace === 'portal' || /\/portal(\/|$)/.test(referer);
  const isAdmin = workspace === 'admin' || /\/admin(\/|$)/.test(referer);

  const asMaster = (): SmartLinkActor => ({ role: 'master', owner: master! });
  const asProject = (): SmartLinkActor => ({
    role: 'project',
    owner: projectUser!.username,
    projectId: String(projectUser!.projectId),
    projectName: projectUser!.projectName,
    projectSlug: projectUser!.projectSlug,
    logoUrl: projectUser!.logoUrl,
  });

  if (isPortal && projectUser) return asProject();
  if (isAdmin && master) return asMaster();
  if (master && !projectUser) return asMaster();
  if (projectUser) return asProject();
  if (master) return asMaster();
  return null;
}

export async function loginProjectUser(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; session?: ProjectUserSession }> {
  const user = await getProjectUserByUsername(username);
  if (!user?.password) {
    return { success: false, error: 'Invalid username or password' };
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return { success: false, error: 'Invalid username or password' };
  }

  const project = await getProjectById(user.projectId);
  if (!project) {
    return { success: false, error: 'Project not found for this user' };
  }

  const session: ProjectUserSession = {
    userId: user._id || '',
    username: user.username,
    name: user.name,
    email: user.email,
    projectId: project._id || user.projectId,
    projectName: project.name,
    projectSlug: project.slug,
    logoUrl: project.logoUrl,
  };

  await createProjectUserSession(session);
  return { success: true, session };
}
