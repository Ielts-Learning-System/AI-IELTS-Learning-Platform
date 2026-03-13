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
import { SpeakingExamPage } from './pages/SpeakingExamPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import DictationPage from './pages/DictationExercisePage';

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
        {/* Login & Register Routes (no layout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Student Dashboard Routes (with DashboardLayout) */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Listening Routes (with DashboardLayout) */}
        <Route path="/listening" element={<DashboardLayout />}>
          {/* Auto-redirect /listening to /listening/ielts */}
          <Route index element={<Navigate to="/listening/ielts" replace />} />
          <Route path="ielts" element={<ListeningListPage />} />
          <Route path="ielts/:id" element={<ListeningExamPage />} />
          <Route path="dictation" element={<DictationPage />} />
        </Route>

        {/* Reading Routes (with DashboardLayout) */}
        <Route path="/reading" element={<DashboardLayout />}>
          <Route index element={<ReadingListPage />} />
          <Route path=":id" element={<ReadingExamPage />} />
        </Route>

        {/* Writing Routes (with DashboardLayout) */}
        <Route path="/writing" element={<DashboardLayout />}>
          <Route path=":id" element={<WritingExamPage />} />
        </Route>

        {/* Speaking Routes (with DashboardLayout) */}
        <Route path="/speaking" element={<DashboardLayout />}>
          <Route path="/speaking" element={<SpeakingExamPage />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminDashboard />} />
          <Route path="resources" element={<AdminDashboard />} />
          <Route path="reports" element={<AdminDashboard />} />
        </Route>

        {/* Teacher Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="reading" element={<TestManagement />} />
          <Route path="listening" element={<TestManagement />} />
          <Route path="writing" element={<TeacherDashboard />} />
          <Route path="speaking" element={<TeacherDashboard />} />
          <Route path="students" element={<TeacherDashboard />} />
        </Route>

        {/* Catch-all 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
