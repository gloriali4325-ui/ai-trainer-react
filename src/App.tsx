import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { useApp } from './state';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { CategorizedTrainingPage } from './pages/CategorizedTrainingPage';
import { CategoryPracticePage } from './pages/CategoryPracticePage';
import { QuestionDrillingPage } from './pages/QuestionDrillingPage';
import { OperationalSkillsPage } from './pages/OperationalSkillsPage';
import { OperationalSkillsDrillingPage } from './pages/OperationalSkillsDrillingPage';
import { MockExamPage } from './pages/MockExamPage';
import { MockExamIntroPage } from './pages/MockExamIntroPage';
import { ExamReviewPage } from './pages/ExamReviewPage';
import { ExamResultPage } from './pages/ExamResultPage';
import { MistakeNotebookPage } from './pages/MistakeNotebookPage';
import { MistakeReinforcementPage } from './pages/MistakeReinforcementPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useApp();
  if (loading.auth) {
    return <div className="container">加载中...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <div className="app-shell">
      <TopBar />
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/drilling"
          element={
            <RequireAuth>
              <QuestionDrillingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/drilling-operational"
          element={
            <RequireAuth>
              <OperationalSkillsDrillingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/categorized"
          element={
            <RequireAuth>
              <CategorizedTrainingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/category/:id"
          element={
            <RequireAuth>
              <CategoryPracticePage />
            </RequireAuth>
          }
        />
        <Route
          path="/operational-skills/:id"
          element={
            <RequireAuth>
              <OperationalSkillsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/mock-exam"
          element={
            <RequireAuth>
              <MockExamIntroPage />
            </RequireAuth>
          }
        />
        <Route
          path="/mock-exam/start"
          element={
            <RequireAuth>
              <MockExamPage />
            </RequireAuth>
          }
        />
        <Route
          path="/exam-result/:id"
          element={
            <RequireAuth>
              <ExamResultPage />
            </RequireAuth>
          }
        />
        <Route
          path="/exam-result/:id/review"
          element={
            <RequireAuth>
              <ExamReviewPage />
            </RequireAuth>
          }
        />
        <Route
          path="/mistakes"
          element={
            <RequireAuth>
              <MistakeNotebookPage />
            </RequireAuth>
          }
        />
        <Route
          path="/mistakes/reinforcement"
          element={
            <RequireAuth>
              <MistakeReinforcementPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
