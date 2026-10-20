import { useState } from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import BookPage from "./pages/BookPage";
import BottomNavbar from "./components/shared/BottomNavBar.jsx";



function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <BrowserRouter>
      <main className="min-h-screen bg-[#0b0d0e] pb-24">
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/book" element={<BookPage/>} />
          <Route path="/bookings" element={<div>Bookings</div>} />
          <Route path="/profile" element={<div>Profile</div>} />
        </Routes>
      </main>

      <BottomNavbar />
    </BrowserRouter>
    </>
  )
}

export default App
