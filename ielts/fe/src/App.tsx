/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ExamLayout } from './layouts/ExamLayout';
import { ReadingExamPage } from './pages/ReadingExamPage';
import { WritingExamPage } from './pages/WritingExamPage';
import { ListeningExamPage } from './pages/ListeningExamPage';
import { SpeakingExamPage } from './pages/SpeakingExamPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboard Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/listening" element={<Navigate to="/exam/listening/list-001" replace />} />
          <Route path="/reading" element={<Navigate to="/exam/reading/read-001" replace />} />
          <Route path="/writing" element={<Navigate to="/exam/writing/write-001" replace />} />
          <Route path="/speaking" element={<Navigate to="/exam/speaking/speak-001" replace />} />
        </Route>

        {/* Exam Routes */}
        <Route path="/exam" element={<ExamLayout />}>
          <Route path="reading/:id" element={<ReadingExamPage />} />
          <Route path="writing/:id" element={<WritingExamPage />} />
          <Route path="listening/:id" element={<ListeningExamPage />} />
          <Route path="speaking/:id" element={<SpeakingExamPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
