import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { TabBar } from './ui/TabBar'
import Explore from './ui/pages/Explore'
import Saved from './ui/pages/Saved'
import Vote from './ui/pages/Vote'
import PollPage from './ui/pages/PollPage'

function Placeholder({ title }: { title: string }) {
  return <h1>{title}</h1>
}

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
      <Routes>
        <Route element={<WithTabs />}>
          <Route path="/" element={<Explore />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/me" element={<Placeholder title="Me" />} />
        </Route>
        <Route path="/p/:code" element={<PollPage />} />
      </Routes>
    </BrowserRouter>
  )
}
