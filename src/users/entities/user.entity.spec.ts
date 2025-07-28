import { User } from './user.entity';
import { UserRole } from '../enums/user-role.enum';
import * as bcrypt from 'bcryptjs';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
  });

  describe('Password Hashing', () => {
    it('should hash password before insert', async () => {
      user.password = 'plainPassword123';
      await user.hashPassword();

      expect(user.password).not.toBe('plainPassword123');
      expect(user.password.length).toBeGreaterThan(20);
    });

    it('should validate correct password', async () => {
      const plainPassword = 'testPassword123';
      user.password = plainPassword;
      await user.hashPassword();

      const isValid = await user.validatePassword(plainPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const plainPassword = 'testPassword123';
      user.password = plainPassword;
      await user.hashPassword();

      const isValid = await user.validatePassword('wrongPassword');
      expect(isValid).toBe(false);
    });
  });

  describe('Entity Structure', () => {
    it('should be properly instantiated', () => {
      expect(user).toBeInstanceOf(User);
      expect(user.hashPassword).toBeDefined();
      expect(user.validatePassword).toBeDefined();
    });
  });

  describe('UserRole Enum', () => {
    it('should have correct enum values', () => {
      expect(UserRole.ADMIN).toBe('admin');
      expect(UserRole.WAITER).toBe('waiter');
      expect(UserRole.KITCHEN).toBe('kitchen');
    });
  });
});