import Vue from 'vue'
import store from '@/store'
import Utils from '@/utils/utils.js'
import { Message } from 'element-ui'

const wsUrl = 'ws://www.test.com'
let socket = null
let lockReconnect = false
let tt = null

function createSocket () {
  try {
    socket = new WebSocket(wsUrl)
    init()
  } catch (e) {
    reconnect(wsUrl)
  }
}

function init () {
  // 连接发生错误的回调方法
  socket.onerror = function () {
    // 重连
    reconnect(wsUrl)
  }

  // 连接成功建立的回调方法
  socket.onopen = function (event) {
    // 开始心跳检测
    heartCheck.start()
  }

  // 接收到消息的回调方法
  socket.onmessage = function (event) {
    const data = JSON.parse(event.data)
    const message = data[1].data
    store.dispatch('appendMessage', message)
    Vue.nextTick(() => {
      Utils.scrollToBottom(document.getElementById('dialog-box'))
    })
  }

  // 连接关闭的回调方法
  socket.onclose = function () {
    // 重连
    reconnect(wsUrl)
  }

  // 监听窗口关闭事件,当窗口关闭时,主动关闭socket连接,放置连接还没断开就关闭窗口,服务端会报异常
  window.onbeforeunload = function () {
    socket.close()
  }
}

// 重连函数
function reconnect (url) {
  if (lockReconnect) {
    return
  }
  lockReconnect = true
  // 没连接上会一直重连,设置延迟避免请求过多
  tt && clearTimeout(tt)
  tt = setTimeout(() => {
    createSocket(url)
    lockReconnect = false
  }, 1000)
}

const heartCheck = {
  // 每隔60000毫秒测试一下心跳是否在继续,开发期间用1000毫秒测试
  timeout: 1000,
  timeoutObj: null,
  start: function () {
    this.timeoutObj && clearInterval(this.timeoutObj)
    this.timeoutObj = setInterval(() => {
      socket.send('PING')
      if (socket.readyState === 3) {
        Message({
          message: '连接出错,正在重新连接,请稍后...',
          type: 'error',
          duration: this.timeout
        })
      }
    }, this.timeout)
  }
}

createSocket()

export default socket
