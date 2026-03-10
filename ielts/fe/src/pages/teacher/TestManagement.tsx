import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import axios from 'axios';
import { useUserStore } from '../../store/useUserStore';
import { TestTable } from './TestTable';
import { TestModal } from './TestModal';

export interface Test {
  _id?: string;
  name: string;
  skill: 'reading' | 'listening';
  questions: number;
  createdAt: string;
}

interface TestManagementState {
  tests: Test[];
  filteredTests: Test[];
  isModalOpen: boolean;
  selectedSkill: 'all' | 'reading' | 'listening';
  searchQuery: string;
  isLoading: boolean;
}

export function TestManagement() {
  const { user } = useUserStore();
  const [state, setState] = useState<TestManagementState>({
    tests: [],
    filteredTests: [],
    isModalOpen: false,
    selectedSkill: 'all',
    searchQuery: '',
    isLoading: false,
  });

  // Fetch tests on mount
  useEffect(() => {
    fetchTests();
  }, []);

  // Filter tests whenever skill or search changes
  useEffect(() => {
    filterTests();
  }, [state.tests, state.selectedSkill, state.searchQuery]);

  const fetchTests = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/reading', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setState(prev => ({
        ...prev,
        tests: response.data.data || [],
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching tests:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const filterTests = () => {
    let filtered = state.tests;

    if (state.selectedSkill !== 'all') {
      filtered = filtered.filter(test => test.skill === state.selectedSkill);
    }

    if (state.searchQuery) {
      filtered = filtered.filter(test =>
        test.name.toLowerCase().includes(state.searchQuery.toLowerCase())
      );
    }

    setState(prev => ({ ...prev, filteredTests: filtered }));
  };

  const handleDeleteTest = async (testId: string) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa đề thi này?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setState(prev => ({
        ...prev,
        tests: prev.tests.filter(t => t._id !== testId),
      }));
    } catch (error) {
      console.error('Error deleting test:', error);
    }
  };

  const handleTestCreated = () => {
    setState(prev => ({ ...prev, isModalOpen: false }));
    fetchTests();
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Quản lý Đề thi IELTS</h2>
        <p className="text-slate-600 mt-2">Tạo và quản lý đề thi Reading và Listening</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Filter by Skill */}
          <div className="flex-shrink-0">
            <select
              value={state.selectedSkill}
              onChange={(e) =>
                setState(prev => ({
                  ...prev,
                  selectedSkill: e.target.value as 'all' | 'reading' | 'listening',
                }))
              }
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả kỹ năng</option>
              <option value="reading">Reading</option>
              <option value="listening">Listening</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="flex-1 flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 bg-white">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm đề thi..."
              value={state.searchQuery}
              onChange={(e) =>
                setState(prev => ({ ...prev, searchQuery: e.target.value }))
              }
              className="flex-1 outline-none text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Create New Test Button */}
          <button
            onClick={() => setState(prev => ({ ...prev, isModalOpen: true }))}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            Tạo đề thi mới
          </button>
        </div>
      </div>

      {/* Test Table */}
      <TestTable
        tests={state.filteredTests}
        isLoading={state.isLoading}
        onDelete={handleDeleteTest}
      />

      {/* Test Modal */}
      {state.isModalOpen && (
        <TestModal
          isOpen={state.isModalOpen}
          onClose={() => setState(prev => ({ ...prev, isModalOpen: false }))}
          onTestCreated={handleTestCreated}
        />
      )}
    </div>
  );
}
