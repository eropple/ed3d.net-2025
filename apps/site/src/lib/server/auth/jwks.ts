// src/lib/server/auth/jwks.ts
import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

// Base JWK
const JWKBase = Type.Object({
  kid: Type.String(),
  alg: Type.String(),
  use: Type.Optional(Type.String()),
  key_ops: Type.Optional(Type.Array(Type.String())),
});

// RSA Private Key
export const RSAPrivateKey = Type.Composite([
  JWKBase,
  Type.Object({
    kty: Type.Literal("RSA"),
    n: Type.String(), // modulus
    e: Type.String(), // exponent
    d: Type.String(), // private exponent
    p: Type.String(), // first prime factor
    q: Type.String(), // second prime factor
    dp: Type.String(), // first factor CRT exponent
    dq: Type.String(), // second factor CRT exponent
    qi: Type.String(), // first CRT coefficient
  }),
]);
export type RSAPrivateKey = Static<typeof RSAPrivateKey>;

// ECDSA Private Key
export const ECPrivateKey = Type.Composite([
  JWKBase,
  Type.Object({
    kty: Type.Literal("EC"),
    crv: Type.String(), // curve, e.g., "P-256"
    x: Type.String(), // x coordinate
    y: Type.String(), // y coordinate
    d: Type.String(), // private key
  }),
]);
export type ECPrivateKey = Static<typeof ECPrivateKey>;

// Union type for private keys
export const PrivateKey = Type.Union([RSAPrivateKey, ECPrivateKey]);
export type PrivateKey = Static<typeof PrivateKey>;
export const PrivateKeyChecker = TypeCompiler.Compile(PrivateKey);

// RSA Public Key (without private components)
export const RSAPublicKey = Type.Composite([
  JWKBase,
  Type.Object({
    kty: Type.Literal("RSA"),
    n: Type.String(), // modulus
    e: Type.String(), // exponent
  }),
]);
export type RSAPublicKey = Static<typeof RSAPublicKey>;

// ECDSA Public Key (without private components)
export const ECPublicKey = Type.Composite([
  JWKBase,
  Type.Object({
    kty: Type.Literal("EC"),
    crv: Type.String(), // curve, e.g., "P-256"
    x: Type.String(), // x coordinate
    y: Type.String(), // y coordinate
  }),
]);
export type ECPublicKey = Static<typeof ECPublicKey>;

// Union type for public keys
export const PublicKey = Type.Union([RSAPublicKey, ECPublicKey]);
export type PublicKey = Static<typeof PublicKey>;
export const PublicKeyChecker = TypeCompiler.Compile(PublicKey);

// JWKS (JSON Web Key Set) for private keys
export const PrivateJWKS = Type.Object({
  keys: Type.Array(PrivateKey)
});
export type PrivateJWKS = Static<typeof PrivateJWKS>;
export const PrivateJWKSChecker = TypeCompiler.Compile(PrivateJWKS);

// JWKS (JSON Web Key Set) for public keys
export const PublicJWKS = Type.Object({
  keys: Type.Array(PublicKey)
});
export type PublicJWKS = Static<typeof PublicJWKS>;
export const PublicJWKSChecker = TypeCompiler.Compile(PublicJWKS);