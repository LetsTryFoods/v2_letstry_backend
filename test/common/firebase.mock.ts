
export const mockFirebaseService = {
  verifyIdToken: jest.fn().mockResolvedValue({ 
    uid: 'S3XyJV3kNZRue5MFxrLF5stbWrK2',
    phone_number: '+918851951492' 
  }),
  getUser: jest.fn().mockResolvedValue({ 
    uid: 'S3XyJV3kNZRue5MFxrLF5stbWrK2',
    phoneNumber: '+918851951492'
  }),
};
