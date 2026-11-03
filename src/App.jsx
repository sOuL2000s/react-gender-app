import { useState } from 'react'
import './App.css'

function App() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [status, setStatus] = useState('')

  const API_ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/user'

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { name, age: age ? Number(age) : '', gender }
    
    setStatus('Sending...')
    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus('Sent successfully!')
    } catch (err) {
      console.error(err)
      setStatus(`Error: ${err.message}`)
    }
  }

  return (
    <div className="container">
      <h1>User Form</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Name
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" required />
        </label>
        <label>
          Age
          <input value={age} onChange={e => setAge(e.target.value)} placeholder="Enter age" type="number" required />
        </label>
        <label>
          Gender
          <input value={gender} onChange={e => setGender(e.target.value)} placeholder="Enter gender" required />
        </label>
        <button type="submit">Submit to Backend</button>
      </form>
      {status && <p className="status">{status}</p>}
      <pre className="preview">{JSON.stringify({ name, age, gender }, null, 2)}</pre>
    </div>
  )
}

export default App
