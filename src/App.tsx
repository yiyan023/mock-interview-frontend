import { BookingCalendar } from './components/BookingCalendar'
import './App.css'

function App() {
  return (
    <main className="home">
      <header className="home__header">
        <h1>Schedule time</h1>
      </header>

      <BookingCalendar />
    </main>
  )
}

export default App
