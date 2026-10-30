import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { TabBar } from './ui/TabBar'
import { ErrorBoundary } from './ui/ErrorBoundary'
import Explore from './ui/pages/Explore'
import Saved from './ui/pages/Saved'
import Vote from './ui/pages/Vote'
import PollPage from './ui/pages/PollPage'
import Me from './ui/pages/Me'
import RestaurantPage from './ui/pages/RestaurantPage'
import { PrivacyPage, TermsPage } from './ui/pages/LegalPages'

function WithTabs() {
  return (
    <>
      <div className="app">
        <Outlet />
      </div>
      <TabBar />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Routes>
        <Route element={<WithTabs />}>
          <Route path="/" element={<Explore />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/me" element={<Me />} />
          <Route path="/r/:id" element={<RestaurantPage />} />
        </Route>
        <Route path="/p/:code" element={<PollPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
