import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import './index.css';
import App from './App';
import Dashboard from './components/dashboard/Dashboard';
import ConcertList from './components/concerts/ConcertList';
import ConcertDetail from './components/concerts/ConcertDetail';
import BasicInfoTab from './components/concerts/tabs/BasicInfoTab';
import ProgramTab from './components/concerts/tabs/ProgramTab';
import MembersTab from './components/concerts/tabs/MembersTab';
import GroupsTab from './components/concerts/tabs/GroupsTab';
import RehearsalsTab from './components/concerts/tabs/RehearsalsTab';
import BudgetTab from './components/concerts/tabs/BudgetTab';
import DocumentsTab from './components/concerts/tabs/DocumentsTab';
import ChecklistTab from './components/concerts/tabs/ChecklistTab';
import MemoTab from './components/concerts/tabs/MemoTab';
import RepertoirePage from './components/repertoire/RepertoirePage';
import MembersPage from './components/members/MembersPage';
import GroupsPage from './components/groups/GroupsPage';
import RehearsalsPage from './components/rehearsals/RehearsalsPage';
import BudgetPage from './components/budget/BudgetPage';
import DocumentsPage from './components/documents/DocumentsPage';
import SettingsPage from './components/settings/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'concerts', element: <ConcertList /> },
      {
        path: 'concerts/:concertId',
        element: <ConcertDetail />,
        children: [
          { index: true, element: <Navigate to="basic" replace /> },
          { path: 'basic', element: <BasicInfoTab /> },
          { path: 'program', element: <ProgramTab /> },
          { path: 'members', element: <MembersTab /> },
          { path: 'groups', element: <GroupsTab /> },
          { path: 'rehearsals', element: <RehearsalsTab /> },
          { path: 'budget', element: <BudgetTab /> },
          { path: 'documents', element: <DocumentsTab /> },
          { path: 'checklist', element: <ChecklistTab /> },
          { path: 'memo', element: <MemoTab /> },
        ],
      },
      { path: 'repertoire', element: <RepertoirePage /> },
      { path: 'members', element: <MembersPage /> },
      { path: 'groups', element: <GroupsPage /> },
      { path: 'rehearsals', element: <RehearsalsPage /> },
      { path: 'budget', element: <BudgetPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
