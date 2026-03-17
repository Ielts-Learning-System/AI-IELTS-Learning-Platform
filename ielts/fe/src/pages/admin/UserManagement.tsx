import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Ban, CheckCircle, MoreVertical, Search, Shield, Users } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useUserStore } from '../../store/useUserStore';

type Role = 'Admin' | 'Teacher' | 'Student';

interface ApiUser {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  status?: string;
  avatar?: string;
}

interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
  avatar?: string;
}

const roleOptions: Role[] = ['Admin', 'Teacher', 'Student'];

const roleBadgeClassMap: Record<Role, string> = {
  Admin: 'bg-red-100 text-red-700 border border-red-200',
  Teacher: 'bg-blue-100 text-blue-700 border border-blue-200',
  Student: 'bg-slate-100 text-slate-700 border border-slate-200',
};

const getApiBaseUrl = () => {
  const nextPublicApiUrl =
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL : undefined;
  const viteApiUrl = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL;

  return (nextPublicApiUrl || viteApiUrl || '').replace(/\/$/, '');
};

const getUsersApiBase = () => {
  const base = getApiBaseUrl();
  if (base.endsWith('/api')) return `${base}/users`;
  return `${base}/api/users`;
};

const normalizeRole = (role?: string): Role => {
  const value = (role || '').trim().toLowerCase();
  if (value === 'admin') return 'Admin';
  if (value === 'teacher') return 'Teacher';
  return 'Student';
};

const normalizeIsActive = (user: ApiUser) => {
  if (typeof user.isActive === 'boolean') return user.isActive;
  const status = (user.status || '').trim().toLowerCase();
  if (status === 'blocked' || status === 'inactive' || status === 'disabled') return false;
  return true;
};

const normalizeUser = (user: ApiUser): UserItem => {
  return {
    id: user._id || user.id || '',
    fullName: user.fullName || user.name || 'Người dùng chưa đặt tên',
    email: user.email || 'Không có email',
    role: normalizeRole(user.role),
    isActive: normalizeIsActive(user),
    avatar: user.avatar,
  };
};

const getInitialFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return (parts[0][0] || 'U').toUpperCase();
};

const getAuthHeaders = (token: string | null) => ({
  Authorization: `Bearer ${token || localStorage.getItem('token') || ''}`,
});

function TableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
            <th className="py-4 px-4 font-semibold">Người dùng</th>
            <th className="py-4 px-4 font-semibold">Vai trò</th>
            <th className="py-4 px-4 font-semibold">Trạng thái</th>
            <th className="py-4 px-4 font-semibold">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, idx) => (
            <tr key={idx} className="border-b border-slate-100">
              <td className="py-4 px-4">
                <div className="flex items-center gap-3 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-3 w-32 rounded bg-slate-200" />
                    <div className="h-3 w-44 rounded bg-slate-100" />
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="h-6 w-20 rounded-full bg-slate-100 animate-pulse" />
              </td>
              <td className="py-4 px-4">
                <div className="h-6 w-24 rounded-full bg-slate-100 animate-pulse" />
              </td>
              <td className="py-4 px-4">
                <div className="h-8 w-8 rounded-lg bg-slate-100 animate-pulse" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UserManagement() {
  const { token } = useUserStore();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'All' | Role>('All');
  const [openActionUserId, setOpenActionUserId] = useState<string | null>(null);

  const usersApiBase = getUsersApiBase();

  const fetchUsers = async () => {
    setIsLoading(true);

    try {
      const response = await axios.get(usersApiBase, {
        headers: getAuthHeaders(token),
      });

      const payload = response.data?.data || response.data?.users || response.data;
      const list = Array.isArray(payload) ? payload : [];
      const normalizedUsers = list.map((item: ApiUser) => normalizeUser(item)).filter((user: UserItem) => user.id);

      setUsers(normalizedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Không thể tải danh sách người dùng.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        user.email.toLowerCase().includes(query) ||
        user.fullName.toLowerCase().includes(query);

      const matchesRole = selectedRole === 'All' || user.role === selectedRole;

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRole]);

  const handleRoleChange = async (userId: string, role: Role) => {
    try {
      await axios.put(
        `${usersApiBase}/${userId}/role`,
        { role },
        { headers: getAuthHeaders(token) }
      );

      setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, role } : user)));
      toast.success('Cập nhật vai trò thành công.');
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Không thể cập nhật vai trò.');
    } finally {
      setOpenActionUserId(null);
    }
  };

  const handleStatusToggle = async (user: UserItem) => {
    const nextIsActive = !user.isActive;

    try {
      await axios.put(
        `${usersApiBase}/${user.id}/status`,
        {
          isActive: nextIsActive,
          status: nextIsActive ? 'Active' : 'Blocked',
        },
        { headers: getAuthHeaders(token) }
      );

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, isActive: nextIsActive } : item
        )
      );

      toast.success(nextIsActive ? 'Đã mở khóa tài khoản.' : 'Đã chặn tài khoản.');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Không thể cập nhật trạng thái tài khoản.');
    } finally {
      setOpenActionUserId(null);
    }
  };

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Quản lý người dùng</h2>
            <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
              <Users className="h-4 w-4" />
              Tổng người dùng: {users.length}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo email hoặc tên..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as 'All' | Role)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
            >
              <option value="All">Tất cả vai trò</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-4 px-4 font-semibold">Người dùng</th>
                  <th className="py-4 px-4 font-semibold">Vai trò</th>
                  <th className="py-4 px-4 font-semibold">Trạng thái</th>
                  <th className="py-4 px-4 font-semibold">Hành động</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-slate-500">
                      Không có người dùng phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 align-middle transition hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.fullName}
                              className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                              {getInitialFromName(user.fullName)}
                            </div>
                          )}

                          <div>
                            <p className="font-semibold text-slate-900">{user.fullName}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${roleBadgeClassMap[user.role]}`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                            user.isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Blocked'}
                        </span>
                      </td>

                      <td className="relative px-4 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionUserId((prev) => (prev === user.id ? null : user.id))
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openActionUserId === user.id && (
                          <div className="absolute right-4 top-14 z-20 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Change Role
                            </p>

                            {roleOptions.map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => handleRoleChange(user.id, role)}
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                              >
                                <Shield className="h-4 w-4 text-slate-500" />
                                {role}
                              </button>
                            ))}

                            <div className="my-2 border-t border-slate-200" />

                            <button
                              type="button"
                              onClick={() => handleStatusToggle(user)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              {user.isActive ? (
                                <>
                                  <Ban className="h-4 w-4 text-rose-600" />
                                  Block user
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                                  Unblock user
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
