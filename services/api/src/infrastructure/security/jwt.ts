import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { AuthenticationError } from '../../domain/errors/DomainErrors.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'customer' | 'agent' | 'reviewer' | 'admin';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class JwtUtil {
  public static signAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN as any,
    });
  }

  public static signRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN as any,
    });
  }

  public static generateTokenPair(payload: TokenPayload): TokenPair {
    return {
      accessToken: this.signAccessToken(payload),
      refreshToken: this.signRefreshToken(payload),
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    };
  }

  public static verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      }
      throw new AuthenticationError('Invalid authentication token');
    }
  }
}
