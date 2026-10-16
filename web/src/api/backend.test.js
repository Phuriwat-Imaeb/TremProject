import { apiFetch, register } from './backend';

// ปั้นคำตอบปลอมให้หน้าตาเหมือน Response พอที่ apiFetch ใช้ (ok, status, json)
function fakeResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

beforeEach(() => {
  global.fetch = jest.fn();
});

test('ไม่มี token ต้องไม่แนบ Authorization', async () => {
  fetch.mockResolvedValue(fakeResponse(200, { items: [] }));
  const data = await apiFetch('/api/species');
  expect(data).toEqual({ items: [] });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('/api/species');
  expect(options.headers.Authorization).toBeUndefined();
});

test('มี token ต้องแนบแบบ Bearer และส่ง body เป็น JSON', async () => {
  fetch.mockResolvedValue(fakeResponse(201, { id: 9 }));
  await register({ email: 'a@b.c', password: 'password123', displayName: 'เอ', phone: '' });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('/api/auth/register');
  expect(options.method).toBe('POST');
  expect(JSON.parse(options.body)).toEqual({ email: 'a@b.c', password: 'password123', displayName: 'เอ', phone: '' });

  fetch.mockResolvedValue(fakeResponse(200, {}));
  await apiFetch('/api/me', { token: 'abc' });
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer abc');
});

test('204 คืน null โดยไม่อ่าน body', async () => {
  fetch.mockResolvedValue({ ok: true, status: 204, json: () => Promise.reject(new Error('ไม่มี body')) });
  await expect(apiFetch('/api/x', { method: 'DELETE' })).resolves.toBeNull();
});

test('error แบบ Go { error: { code, message } } ได้ข้อความ status และ code', async () => {
  fetch.mockResolvedValue(fakeResponse(409, { error: { code: 'EMAIL_TAKEN', message: 'อีเมลนี้มีบัญชีอยู่แล้ว' } }));
  const err = await apiFetch('/api/auth/register', { method: 'POST', body: {} }).catch((e) => e);
  expect(err.message).toBe('อีเมลนี้มีบัญชีอยู่แล้ว');
  expect(err.status).toBe(409);
  expect(err.code).toBe('EMAIL_TAKEN');
});

test('server ตอบไม่เป็น JSON ได้ข้อความภาษาคน', async () => {
  fetch.mockResolvedValue({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError('Unexpected token <')) });
  await expect(apiFetch('/api/species')).rejects.toThrow('server ไม่ได้ตอบเป็น JSON');
});
