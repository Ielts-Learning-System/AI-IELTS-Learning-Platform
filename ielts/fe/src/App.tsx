/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { TeacherLayout } from './components/layout/TeacherLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TestManagement } from './pages/teacher/TestManagement';

import { ReadingExamPage } from './pages/ReadingExamPage';
import { ListeningExamPage } from './pages/ListeningExamPage';
import { WritingExamPage } from './pages/WritingExamPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login & Register Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Student Dashboard Routes */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
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

        {/* Exam Routes */}
        <Route path="/reading/:id" element={<ReadingExamPage />} />
        <Route path="/listening/:id" element={<ListeningExamPage />} />
        <Route path="/writing/:id" element={<WritingExamPage />} />
      </Routes>
    </BrowserRouter>
  );
}
