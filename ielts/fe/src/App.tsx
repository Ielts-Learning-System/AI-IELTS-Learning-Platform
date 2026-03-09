/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { ReadingExamPage } from './pages/ReadingExamPage';
import { ListeningExamPage } from './pages/ListeningExamPage';
import { WritingExamPage } from './pages/WritingExamPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Dashboard Route */}
        <Route path="/" element={<DashboardPage />} />
        
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
