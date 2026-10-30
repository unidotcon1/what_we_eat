import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { TabBar } from './ui/TabBar'
import Explore from './ui/pages/Explore'
import Saved from './ui/pages/Saved'

function Placeholder({ title }: { title: string }) {
  return <h1>{title}</h1>
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/vote" element={<Placeholder title="Vote" />} />
          <Route path="/me" element={<Placeholder title="Me" />} />
        </Routes>
      </div>
      <TabBar />
    </BrowserRouter>
  )
}
