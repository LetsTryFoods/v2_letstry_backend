
import { mockFirebaseService } from './common/firebase.mock';

describe('Mock Validation', () => {
  it('should have valid Firebase mock values', async () => {
    const tokenResult = await mockFirebaseService.verifyIdToken('any-token');
    
    expect(tokenResult).toBeDefined();
    expect(tokenResult.uid).toBeDefined();
    expect(tokenResult.phone_number).toBeDefined();
    expect(tokenResult.phone_number).not.toBeNull();
    
    const userResult = await mockFirebaseService.getUser('any-uid');
    expect(userResult).toBeDefined();
    expect(userResult.uid).toBeDefined();
    expect(userResult.phoneNumber).toBeDefined();
  });
});
