import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { TabBar } from './ui/TabBar'

function Placeholder({ title }: { title: string }) {
  return <h1>{title}</h1>
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Placeholder title="Explore" />} />
          <Route path="/saved" element={<Placeholder title="Saved" />} />
          <Route path="/vote" element={<Placeholder title="Vote" />} />
          <Route path="/me" element={<Placeholder title="Me" />} />
        </Routes>
      </div>
      <TabBar />
    </BrowserRouter>
  )
}
