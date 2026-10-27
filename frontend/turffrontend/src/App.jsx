import { BrowserRouter, Routes, Route } from "react-router-dom";
import BookPage from "./pages/BookPage";
import BookingsPage from "./pages/BookingsPage.jsx";
import BottomNavbar from "./components/shared/BottomNavBar.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import HomePage from "./pages/Home.jsx";
import {Toaster} from "react-hot-toast"


function App() {

  return (
    <>
    <Toaster />
    <BrowserRouter>
      <main className="min-h-screen bg-[#0b0d0e] pb-24">
        <Routes>
          <Route path="/" element={<HomePage/>} />
          <Route path="/book" element={<BookPage/>} />
          <Route path="/bookings" element={<BookingsPage/>} />
          <Route path="/profile" element={<ProfilePage/>} />
        </Routes>
      </main>

      <BottomNavbar />
    </BrowserRouter>
    </>
  )
}

export default App
