import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Conveyor from './pages/Conveyor'
import Settings from './pages/Settings'
import Drafts from './pages/Drafts'
import Scripts from './pages/Scripts'
import ScriptEditor from './pages/ScriptEditor'
import Pipeline from './pages/Pipeline'
import InstagramProfiles from './pages/InstagramProfiles'
import InstagramProfileDetails from './pages/InstagramProfileDetails'
import ScriptsReview from './pages/ScriptsReview'
import ScriptGenerationPage from './pages/ScriptGenerationPage'
import { ErrorProvider } from './contexts/ErrorContext'

function App() {
  return (
    <ErrorProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Conveyor />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/drafts" element={<Drafts />} />
            <Route path="/scripts" element={<Scripts />} />
            <Route path="/scripts/review" element={<ScriptsReview />} />
            <Route path="/scripts/generation" element={<ScriptGenerationPage />} />
            <Route path="/draft/:id" element={<ScriptEditor />} />
            <Route path="/editor/:id" element={<Pipeline />} />
            <Route path="/instagram" element={<InstagramProfiles />} />
            <Route path="/instagram/:id" element={<InstagramProfileDetails />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorProvider>
  )
}

export default App

