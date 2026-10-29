import { Type, Static } from '@sinclair/typebox';

export const RegisterRequestSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
  name: Type.String({ minLength: 2, maxLength: 128 }),
  role: Type.Optional(
    Type.Union([
      Type.Literal('customer'),
      Type.Literal('agent'),
      Type.Literal('reviewer'),
      Type.Literal('admin'),
    ])
  ),
});

export type RegisterRequestDto = Static<typeof RegisterRequestSchema>;

export const LoginRequestSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String(),
});

export type LoginRequestDto = Static<typeof LoginRequestSchema>;

export const RefreshTokenRequestSchema = Type.Object({
  refreshToken: Type.String(),
});

export type RefreshTokenRequestDto = Static<typeof RefreshTokenRequestSchema>;

export const TokenResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    user: Type.Object({
      id: Type.String(),
      email: Type.String(),
      name: Type.String(),
      role: Type.String(),
    }),
    tokens: Type.Object({
      accessToken: Type.String(),
      refreshToken: Type.String(),
      expiresIn: Type.String(),
    }),
  }),
});
