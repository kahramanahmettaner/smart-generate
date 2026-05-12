import { Routes, Route, Navigate } from 'react-router-dom'
import { Home }      from './pages/Home/Home'
import { Editor }    from './pages/Editor/Editor'
import { Login }     from './pages/Login/Login'
import { AuthGuard } from './components/AuthGuard/AuthGuard'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route path="/" element={
        <AuthGuard>
          <Home />
        </AuthGuard>
      } />
      <Route path="/editor" element={
        <AuthGuard>
          <Editor />
        </AuthGuard>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
