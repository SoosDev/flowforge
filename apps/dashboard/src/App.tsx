import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login.js'
import { Workflows } from './pages/Workflows.js'
import { WorkflowDetail } from './pages/WorkflowDetail.js'
import { RunDetail } from './pages/RunDetail.js'
import { Workers } from './pages/Workers.js'
import { Logs } from './pages/Logs.js'
import { ProtectedRoute } from './components/ProtectedRoute.js'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/workflows" replace />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/workflows/:id" element={<WorkflowDetail />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="/workers" element={<Workers />} />
          <Route path="/logs" element={<Logs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
