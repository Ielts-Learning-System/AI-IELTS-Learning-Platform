/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { DashboardLayout } from './layouts/DashboardLayout';

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
        {/* Login Route */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Dashboard Route */}
       {/* Dashboard & Profile Routes */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Reading Exam Route */}
        <Route path="/reading/:id" element={<ReadingExamPage />} />

        {/* Listening Exam Route */}
        <Route path="/listening/:id" element={<ListeningExamPage />} />

        {/* Writing Exam Route */}
        <Route path="/writing/:id" element={<WritingExamPage />} />
      </Routes>
    </BrowserRouter>
  );
}
