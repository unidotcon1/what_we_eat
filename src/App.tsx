import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { TabBar } from './ui/TabBar'
import { ErrorBoundary } from './ui/ErrorBoundary'
import Explore from './ui/pages/Explore'
import Spots from './ui/pages/Spots'
import MapPage from './ui/pages/MapPage'
import AddSpot from './ui/pages/AddSpot'
import ImportSpots from './ui/pages/ImportSpots'
import { SpotsBootstrap } from './ui/SpotsBootstrap'
import Vote from './ui/pages/Vote'
import PollPage from './ui/pages/PollPage'
import Me from './ui/pages/Me'
import RestaurantPage from './ui/pages/RestaurantPage'
import { DeleteAccountPage, PrivacyPage, TermsPage } from './ui/pages/LegalPages'

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
      <SpotsBootstrap />
      <Routes>
        <Route element={<WithTabs />}>
          <Route path="/" element={<Explore />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/add" element={<AddSpot />} />
          <Route path="/import" element={<ImportSpots />} />
          <Route path="/spots" element={<Spots />} />
          <Route path="/saved" element={<Navigate to="/spots" replace />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/me" element={<Me />} />
          <Route path="/r/:id" element={<RestaurantPage />} />
        </Route>
        <Route path="/p/:code" element={<PollPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/delete-account" element={<DeleteAccountPage />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
