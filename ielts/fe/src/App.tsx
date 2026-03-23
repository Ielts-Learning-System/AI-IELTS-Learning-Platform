/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { TeacherLayout } from './components/layout/TeacherLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { TransactionManagement } from './pages/admin/TransactionManagement';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TestManagement } from './pages/teacher/TestManagement';
import GradingDashboard from './pages/teacher/GradingDashboard';
import { ReadingExamPage } from './pages/ReadingExamPage';
import ReadingListPage from './pages/ReadingListPage';
import { ListeningExamPage } from './pages/ListeningExamPage';
import ListeningListPage from './pages/ListeningListPage';
import { WritingExamPage } from './pages/WritingExamPage';
import WritingListPage from './pages/WritingListPage';
import MyWritingHistory from './pages/MyWritingHistory';
import SpeakingTest from './pages/SpeakingTest';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import HomePage from './pages/HomePage';
import DictationPage from './pages/DictationExercisePage';
import ProtectedRoute from './components/ProtectedRoute';
import SettingPage from './pages/SettingPage';
import LessonPage from './pages/LessonPage';
import { LessonManagement } from './pages/teacher/LessonManagement';
import SpeakingGrading from './pages/teacher/SpeakingGrading';
import ResultPage from './pages/ResultPage';
import ReadingListeningProgress from './pages/teacher/ReadingListeningProgress';
import WritingTestManagement from './pages/teacher/WritingTestManagement';
import SpeakingTestManagement from './pages/teacher/SpeakingTestManagement';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentPending from './pages/PaymentPending';

/**
 * NotFound (404) page component
 */
function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <a
          href="/dashboard"
          className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root — public landing page */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<HomePage />} />
        </Route>

        {/* Register Route (login is handled via Navbar modal) */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes — blur overlay when unauthenticated */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Listening Routes */}
        <Route path="/listening" element={<DashboardLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<Navigate to="/listening/ielts" replace />} />
            <Route path="ielts" element={<ListeningListPage />} />
            <Route path="ielts/:id" element={<ListeningExamPage />} />
            <Route path="dictation" element={<DictationPage />} />
          </Route>
        </Route>

        {/* Reading Routes */}
        <Route path="/reading" element={<DashboardLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<ReadingListPage />} />
            <Route path=":id" element={<ReadingExamPage />} />
          </Route>
        </Route>

        {/* Writing Routes */}
        <Route path="/writing" element={<DashboardLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<WritingListPage />} />
            <Route path=":id" element={<WritingExamPage />} />
          </Route>
        </Route>

        {/* Speaking Routes */}
        <Route path="/speaking" element={<DashboardLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<SpeakingTest />} />
          </Route>
        </Route>

        <Route path="/history" element={<DashboardLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<MyWritingHistory />} />
          </Route>
        </Route>

        <Route path="/results" element={<DashboardLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<ResultPage />} />
          </Route>
        </Route>

        {/* Lesson Routes */}
        <Route path="/lessons" element={<DashboardLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<LessonPage />} />
          </Route>
        </Route>

        {/* Settings Routes */}
        <Route path="/settings" element={<DashboardLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<SettingPage />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="transactions" element={<TransactionManagement />} />
            <Route path="resources" element={<AdminDashboard />} />
            <Route path="reports" element={<AdminDashboard />} />
          </Route>
        </Route>

        {/* Teacher Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="lessons" element={<LessonManagement />} />
            <Route path="reading" element={<TestManagement />} />
            <Route path="listening" element={<TestManagement />} />
            <Route path="writing" element={<GradingDashboard />} />
            <Route path="writing-management" element={<WritingTestManagement />} />
            <Route path="speaking-management" element={<SpeakingTestManagement />} />
            <Route path="speaking" element={<SpeakingGrading />} />
            <Route path="auto-graded-results" element={<ReadingListeningProgress />} />
            <Route path="students" element={<TeacherDashboard />} />
          </Route>
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/payment-pending" element={<PaymentPending />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
