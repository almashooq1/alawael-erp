/**
 * reporting-renderer-pdf.test.js — Phase 10 Commit 3.
 *
 * pdfkit is injectable — tests pass a fake PDFDocument that records
 * method calls instead of pulling the real pdfkit library into the
 * Jest graph. This keeps tests deterministic and fast.
 */

'use strict';

const {
  buildPdf,
  htmlToLines,
  findArabicFont,
} = require('../services/reporting/renderer/pdfRenderer');

class FakePDFDocument {
  constructor(opts) {
    this.opts = opts;
    this.calls = [];
    this._listeners = {};
    this.page = { width: 595, height: 842 };
  }
  on(event, fn) {
    (this._listeners[event] = this._listeners[event] || []).push(fn);
    return this;
  }
  _emit(event, ...args) {
    for (const fn of this._listeners[event] || []) fn(...args);
  }
  fillColor(c) {
    this.calls.push({ fn: 'fillColor', args: [c] });
    return this;
  }
  fontSize(n) {
    this.calls.push({ fn: 'fontSize', args: [n] });
    return this;
  }
  text(...args) {
    this.calls.push({ fn: 'text', args });
    return this;
  }
  moveDown(n) {
    this.calls.push({ fn: 'moveDown', args: [n] });
    return this;
  }
  registerFont(name, path) {
    this.calls.push({ fn: 'registerFont', args: [name, path] });
    return this;
  }
  font(name) {
    this.calls.push({ fn: 'font', args: [name] });
    return this;
  }
  end() {
    // Emit some data, then end, on the next tick.
    setImmediate(() => {
      this._emit('data', Buffer.from('PDF'));
      this._emit('end');
    });
  }
}

describe('htmlToLines', () => {
  test('strips tags and splits on block boundaries', () => {
    const lines = htmlToLines('<h1>Title</h1><p>para one.</p><ul><li>a</li><li>b</li></ul>');
    expect(lines).toEqual(expect.arrayContaining(['Title', 'para one.', '- a', '- b']));
  });

  test('decodes common HTML entities', () => {
    const lines = htmlToLines('<p>a &amp; b &lt;ok&gt;</p>');
    expect(lines[0]).toBe('a & b <ok>');
  });

  test('drops style / script blocks', () => {
    const lines = htmlToLines('<style>body{}</style><p>kept</p><script>bad()</script>');
    expect(lines.filter(l => l.length)).toEqual(['kept']);
    expect(lines).not.toContain('body{}');
    expect(lines).not.toContain('bad()');
  });
});

describe('findArabicFont', () => {
  test('returns null when candidates list is empty / not present', () => {
    expect(findArabicFont(['/does/not/exist/font.ttf'])).toBeNull();
  });
});

describe('buildPdf', () => {
  test('produces a Buffer via injected fake PDFDocument', async () => {
    const buf = await buildPdf(
      {
        subject: 'Test report',
        bodyHtml: '<h1>X</h1><p>Body.</p>',
        locale: 'en',
        confidentiality: 'internal',
      },
      { PDFDocument: FakePDFDocument }
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.toString()).toBe('PDF');
  });

  test('writes CONFIDENTIAL banner for confidential reports', async () => {
    let lastDoc;
    class SpyDoc extends FakePDFDocument {
      constructor(o) {
        super(o);
        lastDoc = this;
      }
    }
    await buildPdf(
      {
        subject: 'X',
        bodyText: 'Body',
        locale: 'en',
        confidentiality: 'confidential',
        recipient: { email: 'ceo@x.sa', id: 'u1' },
      },
      { PDFDocument: SpyDoc }
    );
    const textCalls = lastDoc.calls.filter(c => c.fn === 'text').map(c => c.args[0]);
    expect(textCalls.some(s => String(s).includes('CONFIDENTIAL'))).toBe(true);
    // watermark line mentioning recipient
    expect(textCalls.some(s => String(s).includes('ceo@x.sa'))).toBe(true);
  });

  test('registers Arabic font when fontPath is supplied', async () => {
    let lastDoc;
    class SpyDoc extends FakePDFDocument {
      constructor(o) {
        super(o);
        lastDoc = this;
      }
    }
    // Use a path that passes an existence check via the override we
    // inject — the function only uses fontPath verbatim.
    await buildPdf(
      { subject: 'X', bodyText: 'ب', locale: 'ar', confidentiality: 'internal' },
      { PDFDocument: SpyDoc, fontPath: '/tmp/any.ttf' }
    );
    const registered = lastDoc.calls.find(c => c.fn === 'registerFont');
    expect(registered).toBeDefined();
    expect(registered.args[1]).toBe('/tmp/any.ttf');
  });

  test('returns null when PDFDocument construction throws', async () => {
    const Throwing = function () {
      throw new Error('boom');
    };
    const res = await buildPdf(
      { subject: 'X', bodyHtml: '<p>x</p>', locale: 'en' },
      { PDFDocument: Throwing, logger: { warn: jest.fn() } }
    );
    expect(res).toBeNull();
  });
});
