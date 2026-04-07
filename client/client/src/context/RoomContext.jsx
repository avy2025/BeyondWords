import { createContext, useContext, useState } from 'react'

const RoomContext = createContext(null)

export function RoomProvider({ children }) {
  const [userName, setUserName] = useState('')
  const [roomId, setRoomId] = useState('')

  return (
    <RoomContext.Provider value={{ userName, setUserName, roomId, setRoomId }}>
      {children}
    </RoomContext.Provider>
  )
}

export function useRoom() {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used within a RoomProvider')
  return ctx
}
