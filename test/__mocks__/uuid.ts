let counter = 0;

export const v4 = jest.fn(() => {
  counter++;
  return `mock-uuid-${counter.toString().padStart(4, '0')}-5678-9012-3456`;
});

export { v4 as uuidv4 };
