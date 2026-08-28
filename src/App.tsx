import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SimulationProvider } from './context/SimulationContext';
import { AppLayout } from './components/layout/AppLayout';
import { Overview } from './pages/Overview';
import { Project } from './pages/Project';
import { Requirements } from './pages/Requirements';
import { Architecture } from './pages/Architecture';
import { Workforce } from './pages/Workforce';
import { Execution } from './pages/Execution';
import { QASecurity } from './pages/QASecurity';
import { CostGovernor } from './pages/CostGovernor';
import { Delivery } from './pages/Delivery';

export const App: React.FC = () => {
  return (
    <SimulationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Overview />} />
            <Route path="project" element={<Project />} />
            <Route path="requirements" element={<Requirements />} />
            <Route path="architecture" element={<Architecture />} />
            <Route path="workforce" element={<Workforce />} />
            <Route path="execution" element={<Execution />} />
            <Route path="qa-security" element={<QASecurity />} />
            <Route path="cost-governor" element={<CostGovernor />} />
            <Route path="delivery" element={<Delivery />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SimulationProvider>
  );
};

export default App;
