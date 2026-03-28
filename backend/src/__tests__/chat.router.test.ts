import express from 'express';
import request from 'supertest';
import chatRouter from '../routers/chat.router';

const app = express();
app.use(express.json());
app.use('/chat', chatRouter);

const mockFetch = jest.fn();
global.fetch = mockFetch;

afterEach(() => {
  jest.resetAllMocks();
});

function agentOk(response: string, toolSteps: string[] = []) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ response, toolSteps }),
  } as Response);
}

function agentError(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: 'agent error' }),
  } as Response);
}

describe('POST /chat', () => {
  it('returns 400 when message is missing', async () => {
    const res = await request(app).post('/chat').send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'message is required' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 400 when only context is provided but no message', async () => {
    const res = await request(app).post('/chat').send({ context: 'some context' });

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 200 with response and toolSteps on success', async () => {
    mockFetch.mockReturnValueOnce(agentOk('Hello!', ['get_product_by_barcode']));

    const res = await request(app).post('/chat').send({ message: 'hi' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ response: 'Hello!', toolSteps: ['get_product_by_barcode'] });
  });

  it('forwards message, context and history to the agent', async () => {
    mockFetch.mockReturnValueOnce(agentOk('ok'));

    await request(app).post('/chat').send({
      message: 'what is this?',
      context: 'Page: Product Detail',
      history: ['USER: hello', 'THE AGENT: hi'],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/chat'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          message: 'what is this?',
          context: 'Page: Product Detail',
          history: ['USER: hello', 'THE AGENT: hi'],
        }),
      }),
    );
  });

  it('works without optional context and history', async () => {
    mockFetch.mockReturnValueOnce(agentOk('ok'));

    await request(app).post('/chat').send({ message: 'hi' });

    const sentBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(sentBody.message).toBe('hi');
    expect(sentBody.context).toBeUndefined();
    expect(sentBody.history).toBeUndefined();
  });

  it('returns 502 when agent responds with a non-2xx status', async () => {
    mockFetch.mockReturnValueOnce(agentError(500));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).post('/chat').send({ message: 'hi' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Agent service error' });
  });

  it('returns 502 when fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).post('/chat').send({ message: 'hi' });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Could not reach agent service' });
  });
});
