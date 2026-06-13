import { io } from 'socket.io-client'
import useMatchStore from '../store/matchStore.js'

const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  auth: {
    // send userId on connect so server can store socketId
    userId: useMatchStore.getState().currentUser?._id
  }
})

export default socket