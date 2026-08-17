'use client';

import { useEffect, useState } from 'react';

interface Project {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  userCount: number;
}

interface ProjectUser {
  _id: string;
  name: string;
  username: string;
  projectId: string;
  projectName?: string;
}

export default function ProjectsPage() {
  const [tab, setTab] = useState<'projects' | 'users'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userProjectId, setUserProjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [projectRes, userRes] = await Promise.all([fetch('/api/projects'), fetch('/api/project-users')]);
    if (projectRes.ok) setProjects(await projectRes.json());
    if (userRes.ok) setUsers(await userRes.json());
  };

  useEffect(() => {
    load();
  }, []);

  const resetProjectForm = () => {
    setEditingProjectId(null);
    setName('');
    setSlug('');
    setLogoUrl('');
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserName('');
    setUserUsername('');
    setUserPassword('');
    setUserProjectId('');
  };

  const startEditProject = (project: Project) => {
    setTab('projects');
    setEditingProjectId(project._id);
    setName(project.name);
    setSlug(project.slug);
    setLogoUrl(project.logoUrl || '');
    setError('');
  };

  const startEditUser = (user: ProjectUser) => {
    setTab('users');
    setEditingUserId(user._id);
    setUserName(user.name);
    setUserUsername(user.username);
    setUserPassword('');
    setUserProjectId(user.projectId);
    setError('');
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(editingProjectId ? `/api/projects/${editingProjectId}` : '/api/projects', {
        method: editingProjectId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, logoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save project');
        return;
      }
      resetProjectForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!editingUserId && !userPassword) {
        setError('Password is required for new users');
        return;
      }
      const res = await fetch(editingUserId ? `/api/project-users/${editingUserId}` : '/api/project-users', {
        method: editingUserId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          username: userUsername,
          password: userPassword,
          projectId: userProjectId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save user');
        return;
      }
      resetUserForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (editingProjectId === id) resetProjectForm();
    await load();
  };

  const deleteUser = async (id: string) => {
    await fetch(`/api/project-users/${id}`, { method: 'DELETE' });
    if (editingUserId === id) resetUserForm();
    await load();
  };

  return (
    <div className="p-8">
      <div className="flex gap-0 mb-6">
        <button
          type="button"
          onClick={() => setTab('projects')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md ${
            tab === 'projects' ? 'bg-[#2f6fed] text-white' : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          Projects
        </button>
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`px-4 py-2 text-sm font-medium rounded-t-md -ml-px ${
            tab === 'users' ? 'bg-[#2f6fed] text-white' : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          User management
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {tab === 'projects' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-start">
          <form onSubmit={saveProject} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingProjectId ? 'Edit project' : 'New project'}
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              Each project is an isolated outreach workspace with its own logo in the user sidebar.
            </p>
            <input
              required
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-900 placeholder:text-gray-400 outline-none"
            />
            <input
              placeholder="Slug (optional, e.g. acme-corp)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full mb-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-900 placeholder:text-gray-400 outline-none"
            />
            <input
              placeholder="Logo URL (shown at bottom of user sidebar)"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full mb-5 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-900 placeholder:text-gray-400 outline-none"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-lg bg-[#1b2a4a] text-white font-medium disabled:opacity-60"
            >
              {saving ? 'Saving…' : editingProjectId ? 'Save changes' : 'Create project'}
            </button>
            {editingProjectId && (
              <button
                type="button"
                onClick={resetProjectForm}
                className="w-full h-10 mt-2 rounded-lg border border-gray-200 text-gray-600 font-medium"
              >
                Cancel
              </button>
            )}
          </form>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#4b6b8a] border-b border-gray-100">
                  <th className="px-5 py-2.5 font-semibold">Name</th>
                  <th className="px-5 py-2.5 font-semibold">Slug</th>
                  <th className="px-5 py-2.5 font-semibold">Users</th>
                  <th className="px-5 py-2.5 font-semibold text-center">Logo</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-gray-400">
                      No projects yet.
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project._id} className="border-t border-gray-100">
                      <td className="px-5 py-2.5 align-middle text-gray-800">{project.name}</td>
                      <td className="px-5 py-2.5 align-middle text-gray-600">{project.slug}</td>
                      <td className="px-5 py-2.5 align-middle text-gray-800">{project.userCount}</td>
                      <td className="px-5 py-2.5 align-middle text-center">
                        {project.logoUrl ? (
                          <img
                            src={project.logoUrl}
                            alt=""
                            className="h-18 w-32 rounded object-contain inline-block"
                          />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 align-middle text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEditProject(project)}
                          className="text-[#2f6fed] font-medium mr-3"
                        >
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteProject(project._id)} className="text-red-500 font-medium">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-start">
          <form onSubmit={saveUser} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingUserId ? 'Edit user' : 'New user'}
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-5">Assign a user to a project workspace.</p>
            <input
              required
              placeholder="Full Name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full mb-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-900 placeholder:text-gray-400 outline-none"
            />
            <input
              required
              placeholder="Username"
              value={userUsername}
              onChange={(e) => setUserUsername(e.target.value)}
              className="w-full mb-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-900 placeholder:text-gray-400 outline-none"
            />
            <input
              required={!editingUserId}
              type="password"
              placeholder={editingUserId ? 'New password (optional)' : 'Password'}
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
              className="w-full mb-3 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-900 placeholder:text-gray-400 outline-none"
            />
            <select
              required
              value={userProjectId}
              onChange={(e) => setUserProjectId(e.target.value)}
              className="w-full mb-5 px-3 py-2.5 rounded-lg bg-gray-100 text-gray-900 outline-none"
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving || projects.length === 0}
              className="w-full h-11 rounded-lg bg-[#1b2a4a] text-white font-medium disabled:opacity-60"
            >
              {saving ? 'Saving…' : editingUserId ? 'Save changes' : 'Create user'}
            </button>
            {editingUserId && (
              <button
                type="button"
                onClick={resetUserForm}
                className="w-full h-10 mt-2 rounded-lg border border-gray-200 text-gray-600 font-medium"
              >
                Cancel
              </button>
            )}
          </form>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[#4b6b8a] border-b border-gray-100">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Username</th>
                  <th className="px-5 py-3 font-semibold">Project</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-gray-400">
                      No users yet.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="border-t border-gray-100">
                      <td className="px-5 py-3 text-gray-800">{user.name}</td>
                      <td className="px-5 py-3 text-gray-600">{user.username}</td>
                      <td className="px-5 py-3 text-gray-800">{user.projectName}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEditUser(user)}
                          className="text-[#2f6fed] font-medium mr-3"
                        >
                          Edit
                        </button>
                        <button type="button" onClick={() => deleteUser(user._id)} className="text-red-500 font-medium">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
