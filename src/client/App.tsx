import { AuthGate } from './components/AuthGate'
import { ChatInterface } from './components/ChatInterface'

function App() {
  return (
    <AuthGate>
      <ChatInterface />
    </AuthGate>
  )
}

export default App
