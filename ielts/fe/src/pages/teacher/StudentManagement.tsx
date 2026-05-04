import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Loader2,
  Mail,
  Mic,
  PenTool,
  RefreshCcw,
  Search,
  Send,
  Target,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient } from '../../lib/api/client';
import toast, { Toaster } from 'react-hot-toast';

interface ApiUser {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  plan?: string;
}

interface ApiAttempt {
  _id: string;
  studentId: string | { _id?: string };
  bandScore: number;
  timeSpent?: number;
  createdAt: string;
}

interface ApiWritingSub {
  _id: string;
  studentId: string | { _id?: string };
  grading?: { overallBand: number };
  createdAt: string;
}

interface ApiSpeakingSub {
  _id: string;
  studentId: string | { _id?: string };
  grading?: { overallBand: number };
  createdAt: string;
}

interface ApiExamAttempt {
  _id: string;
  userId: string;
  overallBandScores?: { reading?: number; listening?: number; writing?: number; speaking?: number; overall?: number };
  status: string;
  createdAt: string;
}

interface ApiNotification {
  _id: string;
  message: string;
  title?: string;
  createdAt: string;
  isRead: boolean;
}

type Level = 'Foundation' | 'Intermediate' | 'Advanced';

interface SkillScore { listening: number; reading: number; writing: number; speaking: number; }

interface StudentRow {
  id: string; name: string; email: string; plan: string;
  level: Level; currentBand: number;
  totalTestsCompleted: number; totalStudyMinutes: number;
  latestSkills: SkillScore;
}

interface MockTestRecord { id: string; date: string; label: string; band: number; skills: SkillScore; }
interface NotifRecord { id: string; title: string; message: string; sentAt: string; read: boolean; }

const BAND_RANGES = ['Tất cả', '< 5.0', '5.0 - 6.0', '6.5 - 7.5', '8.0+'] as const;
const LEVELS: ('Tất cả' | Level)[] = ['Tất cả', 'Foundation', 'Intermediate', 'Advanced'];

const SKILL_LABELS: Record<keyof SkillScore, string> = { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' };
const SKILL_COLORS: Record<keyof SkillScore, string> = { listening: '#6366f1', reading: '#0ea5e9', writing: '#f59e0b', speaking: '#10b981' };

function extractId(field: string | { _id?: string } | undefined): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field._id || '';
}

function bandToLevel(band: number): Level {
  if (band >= 7.0) return 'Advanced';
  if (band >= 5.5) return 'Intermediate';
  return 'Foundation';
}

function roundHalf(n: number): number { return Math.round(n * 2) / 2; }

function formatStudyTime(minutes: number): string {
  if (minutes <= 0) return '--';
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function bandColor(band: number): string {
  if (band >= 7.5) return 'text-emerald-600 bg-emerald-50';
  if (band >= 6.0) return 'text-indigo-600 bg-indigo-50';
  if (band >= 5.0) return 'text-amber-600 bg-amber-50';
  if (band > 0) return 'text-red-600 bg-red-50';
  return 'text-slate-500 bg-slate-100';
}

function levelBadge(level: Level): string {
  if (level === 'Advanced') return 'bg-violet-100 text-violet-700';
  if (level === 'Intermediate') return 'bg-sky-100 text-sky-700';
  return 'bg-orange-100 text-orange-700';
}

function matchesBandFilter(band: number, filter: string): boolean {
  if (filter === 'Tất cả') return true;
  if (filter === '< 5.0') return band > 0 && band < 5.0;
  if (filter === '5.0 - 6.0') return band >= 5.0 && band <= 6.0;
  if (filter === '6.5 - 7.5') return band >= 6.5 && band <= 7.5;
  if (filter === '8.0+') return band >= 8.0;
  return true;
}

function buildStudentRow(
  user: ApiUser,
  readingAttempts: ApiAttempt[],
  listeningAttempts: ApiAttempt[],
  writingSubs: ApiWritingSub[],
  speakingSubs: ApiSpeakingSub[],
): StudentRow {
  const uid = user._id;
  const myR = readingAttempts.filter(a => extractId(a.studentId) === uid).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const myL = listeningAttempts.filter(a => extractId(a.studentId) === uid).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const myW = writingSubs.filter(a => extractId(a.studentId) === uid).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const myS = speakingSubs.filter(a => extractId(a.studentId) === uid).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const lR = myR[0]?.bandScore ?? 0;
  const lL = myL[0]?.bandScore ?? 0;
  const lW = myW[0]?.grading?.overallBand ?? 0;
  const lS = myS[0]?.grading?.overallBand ?? 0;
  const activeBands = [lR, lL, lW, lS].filter(b => b > 0);
  const currentBand = activeBands.length > 0 ? roundHalf(activeBands.reduce((a,b) => a+b, 0) / activeBands.length) : 0;
  const studySeconds = [...myR.map(a => a.timeSpent ?? 0), ...myL.map(a => a.timeSpent ?? 0)].reduce((a,b) => a+b, 0);
  return {
    id: uid, name: user.name || 'Không tên', email: user.email || '',
    plan: user.plan || 'FREE', level: bandToLevel(currentBand), currentBand,
    totalTestsCompleted: myR.length + myL.length + myW.length + myS.length,
    totalStudyMinutes: Math.round(studySeconds / 60),
    latestSkills: { reading: lR, listening: lL, writing: lW, speaking: lS },
  };
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
  const sz = size === 'lg' ? 'h-14 w-14 text-lg' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  const pal = ['bg-indigo-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-sky-500','bg-rose-500'];
  return <div className={`${sz} ${pal[name.charCodeAt(0)%6]} flex shrink-0 items-center justify-center rounded-full font-bold text-white`}>{initials}</div>;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${color}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60">{icon}</div>
      <div><p className="text-xs font-medium opacity-70">{label}</p><p className="text-lg font-bold leading-tight">{value}</p></div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">{icon}</span>
      <h3 className="font-semibold text-slate-800">{title}</h3>
    </div>
  );
}

function SkillIcon({ skill }: { skill: keyof SkillScore }) {
  const p = { className: 'h-4 w-4' };
  if (skill === 'reading') return <BookOpen {...p} style={{ color: SKILL_COLORS.reading }} />;
  if (skill === 'writing') return <PenTool {...p} style={{ color: SKILL_COLORS.writing }} />;
  return <Mic {...p} style={{ color: SKILL_COLORS[skill] }} />;
}

function StudentDrawer({ student, onClose }: { student: StudentRow; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [drawerError, setDrawerError] = useState('');
  const [mockHistory, setMockHistory] = useState<MockTestRecord[]>([]);
  const [notifications, setNotifications] = useState<NotifRecord[]>([]);
  const [notifInput, setNotifInput] = useState('');
  const [sending, setSending] = useState(false);
  const fetched = useRef(false);

  const fetchDrawerData = useCallback(async () => {
    setLoading(true);
    setDrawerError('');
    try {
      const [examRes, notifRes] = await Promise.allSettled([
        apiClient.get<{ success: boolean; data: ApiExamAttempt[] }>(`/exams/teacher/students/${student.id}/attempts`),
        apiClient.get<{ notifications: ApiNotification[] }>(`/notification/teacher/users/${student.id}/notifications`),
      ]);
      if (examRes.status === 'fulfilled') {
        const attempts = (examRes.value.data?.data ?? [])
          .filter(a => (a.overallBandScores?.overall ?? 0) > 0)
          .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMockHistory(attempts.map((a, idx) => ({
          id: String(a._id), date: a.createdAt.slice(0,10), label: `Mock #${idx+1}`,
          band: a.overallBandScores?.overall ?? 0,
          skills: { reading: a.overallBandScores?.reading ?? 0, listening: a.overallBandScores?.listening ?? 0, writing: a.overallBandScores?.writing ?? 0, speaking: a.overallBandScores?.speaking ?? 0 },
        })));
      }
      if (notifRes.status === 'fulfilled') {
        const raw = notifRes.value.data?.notifications ?? [];
        setNotifications(raw.map(n => ({ id: n._id, title: n.title || 'Thông báo', message: n.message, sentAt: new Date(n.createdAt).toLocaleString('vi-VN'), read: n.isRead })));
      }
    } catch {
      setDrawerError('Không thể tải dữ liệu chi tiết.');
    } finally {
      setLoading(false);
    }
  }, [student.id]);

  useEffect(() => {
    if (!fetched.current) { fetched.current = true; fetchDrawerData(); }
  }, [fetchDrawerData]);

  async function handleSend() {
    const msg = notifInput.trim();
    if (!msg) return;
    setSending(true);
    try {
      const res = await apiClient.post<{ notification: ApiNotification }>('/notification/teacher/send', {
        userId: student.id, message: msg, title: 'Nhắc nhở từ giáo viên',
      });
      const n = res.data.notification;
      setNotifications(prev => [{ id: n._id, title: n.title || 'Nhắc nhở từ giáo viên', message: n.message, sentAt: new Date(n.createdAt).toLocaleString('vi-VN'), read: false }, ...prev]);
      setNotifInput('');
      toast.success('Đã gửi nhắc nhở!');
    } catch {
      toast.error('Gửi thất bại, vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  }

  const progressData = mockHistory.map(t => ({ label: t.label, Band: t.band }));
  const skillBarData = (Object.keys(student.latestSkills) as (keyof SkillScore)[]).map(k => ({ skill: SKILL_LABELS[k], score: student.latestSkills[k], fill: SKILL_COLORS[k] }));
  const radarData = (Object.keys(student.latestSkills) as (keyof SkillScore)[]).map(k => ({ subject: SKILL_LABELS[k], score: student.latestSkills[k], fullMark: 9 }));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white">
          <div className="flex items-center gap-4">
            <Avatar name={student.name} size="lg" />
            <div>
              <h2 className="text-xl font-bold leading-tight">{student.name}</h2>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-indigo-100"><Mail className="h-3.5 w-3.5" />{student.email}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 transition hover:bg-white/20"><X className="h-5 w-5" /></button>
        </div>
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
        ) : drawerError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-slate-500">
            <AlertTriangle className="h-8 w-8 text-red-400" /><p>{drawerError}</p>
            <button type="button" onClick={fetchDrawerData} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><RefreshCcw className="h-4 w-4" /> Thử lại</button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-6">
            <section>
              <SectionTitle icon={<TrendingUp className="h-4 w-4" />} title="Tổng quan" />
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard icon={<Clock className="h-5 w-5 text-indigo-600" />} label="Thời gian học" value={formatStudyTime(student.totalStudyMinutes)} color="border-indigo-100 bg-indigo-50 text-indigo-800" />
                <StatCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} label="Bài đã làm" value={`${student.totalTestsCompleted}`} color="border-emerald-100 bg-emerald-50 text-emerald-800" />
                <StatCard icon={<GraduationCap className="h-5 w-5 text-violet-600" />} label="Band hiện tại" value={student.currentBand > 0 ? `${student.currentBand}` : '--'} color="border-violet-100 bg-violet-50 text-violet-800" />
                <StatCard icon={<Target className="h-5 w-5 text-amber-600" />} label="Phân nhóm" value={student.level} color="border-amber-100 bg-amber-50 text-amber-800" />
              </div>
            </section>
            <section>
              <SectionTitle icon={<BookOpen className="h-4 w-4" />} title="Điểm kỹ năng gần nhất" />
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(student.latestSkills) as (keyof SkillScore)[]).map(k => (
                  <div key={k} className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-3">
                    <SkillIcon skill={k} />
                    <span className="text-xs font-medium text-slate-500">{SKILL_LABELS[k]}</span>
                    <span className="text-lg font-bold text-slate-800">{student.latestSkills[k] > 0 ? student.latestSkills[k] : '--'}</span>
                  </div>
                ))}
              </div>
              {student.currentBand > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold text-slate-500">Bar Chart</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={skillBarData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                        <YAxis domain={[0,9]} tick={{ fontSize:11 }} /><XAxis dataKey="skill" tick={{ fontSize:11 }} />
                        <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} formatter={(v: number) => [v,'Band']} />
                        <Bar dataKey="score" radius={[4,4,0,0]} fill="#6366f1" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold text-slate-500">Radar Chart</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <RadarChart data={radarData} margin={{ top:4, right:16, left:16, bottom:4 }}>
                        <PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="subject" tick={{ fontSize:10 }} />
                        <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                        <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} formatter={(v: number) => [v,'Band']} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </section>
            <section>
              <SectionTitle icon={<TrendingUp className="h-4 w-4" />} title="Biểu đồ tiến bộ (Overall Band)" />
              {progressData.length < 2 ? (
                <p className="mt-3 text-center text-sm text-slate-400">Chưa đủ dữ liệu kỳ thi thử.</p>
              ) : (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={progressData} margin={{ top:8, right:16, left:-20, bottom:0 }}>
                      <YAxis domain={[3,9]} ticks={[3,4,5,6,7,8,9]} tick={{ fontSize:11 }} />
                      <XAxis dataKey="label" tick={{ fontSize:11 }} />
                      <Tooltip contentStyle={{ borderRadius:8, fontSize:12 }} formatter={(v: number) => [v,'Band']} />
                      <Line type="monotone" dataKey="Band" stroke="#6366f1" strokeWidth={2.5} dot={{ r:5, fill:'#6366f1', strokeWidth:0 }} activeDot={{ r:7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
            <section>
              <SectionTitle icon={<CheckCircle2 className="h-4 w-4" />} title="Lịch sử thi thử" />
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                {mockHistory.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">Chưa có dữ liệu thi thử.</p>
                ) : (
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Kỳ thi</th><th className="px-4 py-2.5 text-left">Ngày</th>
                        <th className="px-4 py-2.5 text-center">L</th><th className="px-4 py-2.5 text-center">R</th>
                        <th className="px-4 py-2.5 text-center">W</th><th className="px-4 py-2.5 text-center">S</th>
                        <th className="px-4 py-2.5 text-center">Overall</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {[...mockHistory].reverse().map(test => (
                        <tr key={test.id} className="transition hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-700">{test.label}</td>
                          <td className="px-4 py-2.5 text-slate-500">{test.date}</td>
                          <td className="px-4 py-2.5 text-center text-indigo-600">{test.skills.listening || '--'}</td>
                          <td className="px-4 py-2.5 text-center text-sky-600">{test.skills.reading || '--'}</td>
                          <td className="px-4 py-2.5 text-center text-amber-600">{test.skills.writing || '--'}</td>
                          <td className="px-4 py-2.5 text-center text-emerald-600">{test.skills.speaking || '--'}</td>
                          <td className="px-4 py-2.5 text-center"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${bandColor(test.band)}`}>{test.band}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
            <section>
              <SectionTitle icon={<Bell className="h-4 w-4" />} title="Nhắc nhở và Thông báo" />
              <div className="mt-3 flex gap-2">
                <input type="text" value={notifInput} onChange={e => setNotifInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Viết nhắc nhở cho học viên..." className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                <button type="button" onClick={handleSend} disabled={!notifInput.trim() || sending} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-40">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Gửi
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-400">Chưa có thông báo nào.</p>
                ) : notifications.map(n => (
                  <div key={n.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${n.read ? 'border-slate-200 bg-slate-50' : 'border-indigo-200 bg-indigo-50'}`}>
                    <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.read ? 'text-slate-400' : 'text-indigo-500'}`} />
                    <div className="min-w-0">
                      {n.title && <p className="text-xs font-semibold text-slate-600">{n.title}</p>}
                      <p className={`text-sm ${n.read ? 'text-slate-600' : 'font-medium text-indigo-900'}`}>{n.message}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{n.sentAt}</p>
                    </div>
                    {!n.read && <span className="ml-auto shrink-0 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">Mới</span>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </aside>
    </>
  );
}

export default function StudentManagement() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bandFilter, setBandFilter] = useState<string>('Tất cả');
  const [levelFilter, setLevelFilter] = useState<'Tất cả' | Level>('Tất cả');
  const [selected, setSelected] = useState<StudentRow | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [usersRes, rRes, lRes, wRes, sRes] = await Promise.allSettled([
        apiClient.get<{ success: boolean; data: ApiUser[] }>('/users?role=Student'),
        apiClient.get<{ success: boolean; data: ApiAttempt[] }>('/reading/attempts'),
        apiClient.get<{ success: boolean; data: ApiAttempt[] }>('/listening/attempts'),
        apiClient.get<{ success: boolean; data: ApiWritingSub[] }>('/writing/submissions/graded'),
        apiClient.get<{ success: boolean; data: ApiSpeakingSub[] }>('/speaking/graded'),
      ]);
      if (usersRes.status === 'rejected') {
        throw usersRes.reason;
      }
      const users: ApiUser[] = usersRes.value.data?.data ?? [];
      const ra = rRes.status === 'fulfilled' ? (rRes.value.data?.data ?? []) : [];
      const la = lRes.status === 'fulfilled' ? (lRes.value.data?.data ?? []) : [];
      const wa = wRes.status === 'fulfilled' ? (wRes.value.data?.data ?? []) : [];
      const sa = sRes.status === 'fulfilled' ? (sRes.value.data?.data ?? []) : [];
      setStudents(users.filter(u => (u.role||'').toLowerCase() === 'student').map(u => buildStudentRow(u, ra, la, wa, sa)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 30-second auto-refresh
  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // Keep the selected drawer in sync when the table refreshes
  useEffect(() => {
    if (!selected) return;
    const updated = students.find(s => s.id === selected.id);
    if (updated) setSelected(updated);
  }, [students]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() =>
    students.filter(s => {
      const q = searchQuery.toLowerCase();
      return (!q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) &&
        matchesBandFilter(s.currentBand, bandFilter) &&
        (levelFilter === 'Tất cả' || s.level === levelFilter);
    }), [students, searchQuery, bandFilter, levelFilter]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Toaster position="top-right" />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Học viên</h1>
          <p className="mt-0.5 text-sm text-slate-500">{loading ? 'Đang tải...' : `${students.length} Học viên — ${filtered.length} đang hiển thị`}</p>
        </div>
        <button type="button" onClick={fetchAll} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Tải lại
        </button>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm theo tên hoặc email..." className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
        <select value={bandFilter} onChange={e => setBandFilter(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none">
          {BAND_RANGES.map(r => <option key={r} value={r}>Band: {r}</option>)}
        </select>
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as 'Tất cả' | Level)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none">
          {LEVELS.map(l => <option key={l} value={l}>{l === 'Tất cả' ? 'Phân nhóm: Tất cả' : l}</option>)}
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Học viên</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Phân nhóm</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Band</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Bài đã làm</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-400" /></td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <AlertTriangle className="h-8 w-8 text-red-400" /><p>{error}</p>
                    <button type="button" onClick={fetchAll} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><RefreshCcw className="h-4 w-4" /> Thử lại</button>
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Không tìm thấy học viên nào.</td></tr>
              ) : (
                filtered.map(student => (
                  <tr key={student.id} className="group cursor-pointer transition hover:bg-indigo-50/40" onClick={() => setSelected(student)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} size="sm" />
                        <div><p className="font-semibold text-slate-800">{student.name}</p><p className="text-xs text-slate-400">{student.email}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelBadge(student.level)}`}>{student.level}</span></td>
                    <td className="px-5 py-4 text-center"><span className={`rounded-full px-3 py-0.5 text-sm font-bold ${bandColor(student.currentBand)}`}>{student.currentBand > 0 ? student.currentBand : '--'}</span></td>
                    <td className="px-5 py-4 text-center"><span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{student.plan}</span></td>
                    <td className="px-5 py-4 text-center text-slate-600">{student.totalTestsCompleted}</td>
                    <td className="px-5 py-4 text-right">
                      <button type="button" onClick={e => { e.stopPropagation(); setSelected(student); }} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100">
                        <User className="h-3.5 w-3.5" />Xem chi tiết<ChevronRight className="h-3.5 w-3.5 opacity-60 transition group-hover:translate-x-0.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-400">
          Hiển thị {filtered.length} / {students.length} Học viên
        </div>
      </div>
      {selected && <StudentDrawer student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

