module.exports = {
  NextRequest: class NextRequest {
    constructor(url) {
      this.url = url;
      this.nextUrl = new URL(url);
      this.headers = new Map();
    }
  },
  NextResponse: {
    json: (data, init) => ({ json: () => data, ...init }),
    redirect: (url) => ({ redirect: url }),
  },
};
