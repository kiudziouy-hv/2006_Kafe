import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import { logger } from './logger'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected'

/**
 * Một kết nối STOMP dùng chung cho cả ứng dụng. Phiên (cookie) được trình duyệt gửi kèm khi bắt tay,
 * và backend kiểm tra vai trò khi đăng ký từng kênh. Mất kết nối thì tự nối lại; mỗi lần nối lại
 * các nơi đăng ký được gọi onReconnect để tải lại dữ liệu từ REST.
 */
class RealtimeClient {
  private client: Client | null = null
  private state: ConnectionState = 'disconnected'
  private stateListeners = new Set<() => void>()
  private topics = new Map<string, Set<(m: unknown) => void>>()
  private subs = new Map<string, StompSubscription>()
  private reconnectHandlers = new Set<() => void>()
  private everConnected = false

  getState = (): ConnectionState => this.state
  subscribeState = (fn: () => void) => {
    this.stateListeners.add(fn)
    return () => this.stateListeners.delete(fn)
  }

  private setState(s: ConnectionState) {
    this.state = s
    this.stateListeners.forEach((fn) => fn())
  }

  private url() {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.host}/ws`
  }

  connect() {
    if (this.client) return
    this.setState('connecting')
    this.client = new Client({
      brokerURL: this.url(),
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        const again = this.everConnected
        this.everConnected = true
        this.setState('connected')
        this.subs.clear()
        this.topics.forEach((_, topic) => this.attach(topic))
        if (again) this.reconnectHandlers.forEach((fn) => fn())
      },
      onWebSocketClose: () => this.setState(this.client?.active ? 'connecting' : 'disconnected'),
      onStompError: (f) => logger.warn('STOMP', f.headers['message']),
    })
    this.client.activate()
  }

  disconnect() {
    void this.client?.deactivate()
    this.client = null
    this.subs.clear()
    this.everConnected = false
    this.setState('disconnected')
  }

  private attach(topic: string) {
    if (!this.client?.connected || this.subs.has(topic)) return
    const sub = this.client.subscribe(topic, (m: IMessage) => {
      try {
        const body: unknown = JSON.parse(m.body)
        this.topics.get(topic)?.forEach((fn) => fn(body))
      } catch {
        logger.warn('Tin nhắn không phải JSON', topic)
      }
    })
    this.subs.set(topic, sub)
  }

  subscribe(topic: string, handler: (m: unknown) => void, onReconnect?: () => void): () => void {
    this.connect()
    if (!this.topics.has(topic)) this.topics.set(topic, new Set())
    this.topics.get(topic)!.add(handler)
    if (onReconnect) this.reconnectHandlers.add(onReconnect)
    this.attach(topic)
    return () => {
      const set = this.topics.get(topic)
      set?.delete(handler)
      if (onReconnect) this.reconnectHandlers.delete(onReconnect)
      if (set && set.size === 0) {
        this.topics.delete(topic)
        this.subs.get(topic)?.unsubscribe()
        this.subs.delete(topic)
      }
    }
  }
}

export const realtime = new RealtimeClient()
