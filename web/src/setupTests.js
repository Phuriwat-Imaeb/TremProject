// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// WebSocket ปลอม: เทสต์ไม่ต่อเซิร์ฟเวอร์จริง ใช้ FakeWebSocket.last() หยิบตัวล่าสุด
// แล้วสั่ง .open() / .receive({...}) / .drop() แทนเซิร์ฟเวอร์ (ดู TripDetail.test.jsx)
class FakeWebSocket {
  static instances = [];
  static last = () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

  constructor(url) {
    this.url = url;
    this.closed = false;
    FakeWebSocket.instances.push(this);
  }
  close() {
    this.closed = true;
  }
  open() {
    this.onopen?.();
  }
  receive(data) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  drop() {
    this.onclose?.();
  }
}
global.WebSocket = FakeWebSocket;
beforeEach(() => {
  FakeWebSocket.instances = [];
});
