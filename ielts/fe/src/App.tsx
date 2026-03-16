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
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TestManagement } from './pages/teacher/TestManagement';
import { ReadingExamPage } from './pages/ReadingExamPage';
import ReadingListPage from './pages/ReadingListPage';
import { ListeningExamPage } from './pages/ListeningExamPage';
import ListeningListPage from './pages/ListeningListPage';
import { WritingExamPage } from './pages/WritingExamPage';
import WritingListPage from './pages/WritingListPage';
import { SpeakingExamPage } from './pages/SpeakingExamPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import HomePage from './pages/HomePage';
import DictationPage from './pages/DictationExercisePage';
import ProtectedRoute from './components/ProtectedRoute';
import SettingPage from './pages/SettingPage';

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
            <Route index element={<SpeakingExamPage />} />
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
            <Route path="users" element={<AdminDashboard />} />
            <Route path="resources" element={<AdminDashboard />} />
            <Route path="reports" element={<AdminDashboard />} />
          </Route>
        </Route>

        {/* Teacher Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route element={<ProtectedRoute />}>
            <Route index element={<TeacherDashboard />} />
            <Route path="reading" element={<TestManagement />} />
            <Route path="listening" element={<TestManagement />} />
            <Route path="writing" element={<TeacherDashboard />} />
            <Route path="speaking" element={<TeacherDashboard />} />
            <Route path="students" element={<TeacherDashboard />} />
          </Route>
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
