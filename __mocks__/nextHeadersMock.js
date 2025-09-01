module.exports = {
  cookies: () => ({
    get: jest.fn(() => ({ value: 'test-cookie' })),
    set: jest.fn(),
    delete: jest.fn(),
  }),
  headers: () => ({
    get: jest.fn(() => 'test-header'),
    set: jest.fn(),
    delete: jest.fn(),
  }),
};
