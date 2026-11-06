export class NextResponse extends Response {
  static json(corpo, init = {}) { return new Response(JSON.stringify(corpo), { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}) } }); }
}
