import { useState, useCallback } from 'react'

const DOT_POSITIONS = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
}

function DieFace({ value, size = 120, color = '#1a1a2e' }) {
  const dots = DOT_POSITIONS[value] || []
  const r = size * 0.08

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="2" y="2" width="96" height="96" rx="14" ry="14"
        fill="white" stroke={color} strokeWidth="3" />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={color} />
      ))}
    </svg>
  )
}

export default function TestDie() {
  const [dice, setDice] = useState([1])
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState([])

  const roll = useCallback(() => {
    setRolling(true)
    // Animate through random values
    let count = 0
    const interval = setInterval(() => {
      setDice(prev => prev.map(() => Math.ceil(Math.random() * 6)))
      count++
      if (count >= 8) {
        clearInterval(interval)
        setDice(prev => {
          const final = prev.map(() => Math.ceil(Math.random() * 6))
          setHistory(h => [{ values: final, total: final.reduce((a, b) => a + b, 0), time: new Date() }, ...h].slice(0, 20))
          return final
        })
        setRolling(false)
      }
    }, 80)
  }, [])

  const addDie = () => {
    if (dice.length < 6) setDice(prev => [...prev, 1])
  }

  const removeDie = () => {
    if (dice.length > 1) setDice(prev => prev.slice(0, -1))
  }

  const total = dice.reduce((a, b) => a + b, 0)

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      color: 'white', padding: '24px', fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{ textAlign: 'center', fontSize: '28px', margin: '0 0 8px', fontWeight: 700 }}>
        Test Die App
      </h1>
      <p style={{ textAlign: 'center', opacity: 0.7, margin: '0 0 24px', fontSize: '14px' }}>
        Roll {dice.length === 1 ? '1 die' : `${dice.length} dice`}
      </p>

      {/* Dice display */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '16px',
        flexWrap: 'wrap', margin: '0 0 16px', minHeight: '140px', alignItems: 'center',
      }}>
        {dice.map((value, i) => (
          <div key={i} style={{
            transition: 'transform 0.15s',
            transform: rolling ? `rotate(${Math.random() * 30 - 15}deg)` : 'none',
          }}>
            <DieFace value={value} />
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{ textAlign: 'center', fontSize: '40px', fontWeight: 800, margin: '0 0 24px' }}>
        {total}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '0 0 24px' }}>
        <button onClick={removeDie} disabled={dice.length <= 1} style={btnStyle('#555')}>
          − Die
        </button>
        <button onClick={roll} disabled={rolling} style={btnStyle('#e94560')}>
          {rolling ? 'Rolling…' : 'Roll!'}
        </button>
        <button onClick={addDie} disabled={dice.length >= 6} style={btnStyle('#555')}>
          + Die
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 8px', opacity: 0.8 }}>Roll History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {history.map((entry, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 12px', background: 'rgba(255,255,255,0.08)',
                borderRadius: '6px', fontSize: '14px',
              }}>
                <span>[{entry.values.join(', ')}]</span>
                <span style={{ fontWeight: 600 }}>= {entry.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function btnStyle(bg) {
  return {
    padding: '12px 24px', fontSize: '16px', fontWeight: 700,
    border: 'none', borderRadius: '10px', color: 'white',
    background: bg, cursor: 'pointer', opacity: 1,
  }
}
